// src/lib/imageCompress.js
// Client-side image downscale + EXIF/GPS strip + orientation bake.
//
// Privacy red line: re-encoding through a canvas drops ALL EXIF metadata
// (including GPS), so uploaded photos can never leak precise coordinates — the
// app only ever derives city-level location elsewhere. compressImage is the
// browser-only path; the pure helpers below are unit-tested.

// --- pure helpers (unit-tested) ---------------------------------------------

// Parse a JPEG's EXIF Orientation tag (IFD0 0x0112). Returns 1..8, or 1 when
// the buffer is not a JPEG / has no EXIF / no orientation tag. Never throws.
function readExifOrientation(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer);
    if (view.byteLength < 2) return 1;

    // SOI
    if (view.getUint16(0, false) !== 0xffd8) return 1;

    let offset = 2;
    const len = view.byteLength;

    while (offset + 4 <= len) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // Not a valid marker segment.
      if ((marker & 0xff00) !== 0xff00) return 1;

      // APP1 — candidate EXIF segment.
      if (marker === 0xffe1) {
        const segLen = view.getUint16(offset, false); // includes the 2 length bytes
        const segStart = offset + 2;

        // "Exif\0\0"
        if (
          view.getUint32(segStart, false) === 0x45786966 &&
          view.getUint16(segStart + 4, false) === 0x0000
        ) {
          const tiffStart = segStart + 6;
          return readOrientationFromTiff(view, tiffStart);
        }
        // APP1 but not Exif — skip it.
        offset += segLen;
      } else if (marker === 0xffd9 || marker === 0xffda) {
        // EOI / SOS — image data starts; no EXIF found.
        return 1;
      } else {
        const segLen = view.getUint16(offset, false);
        offset += segLen;
      }
    }
    return 1;
  } catch {
    return 1;
  }
}

function readOrientationFromTiff(view, tiffStart) {
  const byteOrder = view.getUint16(tiffStart, false);
  let little;
  if (byteOrder === 0x4949) little = true; // "II"
  else if (byteOrder === 0x4d4d) little = false; // "MM"
  else return 1;

  // 42 sanity marker.
  if (view.getUint16(tiffStart + 2, little) !== 0x002a) return 1;

  const ifd0Offset = view.getUint32(tiffStart + 4, little);
  const ifd0 = tiffStart + ifd0Offset;

  const entries = view.getUint16(ifd0, little);
  for (let i = 0; i < entries; i++) {
    const entry = ifd0 + 2 + i * 12;
    const tag = view.getUint16(entry, little);
    if (tag === 0x0112) {
      // type SHORT(3) — value sits in the first 2 bytes of the value field.
      const value = view.getUint16(entry + 8, little);
      if (value >= 1 && value <= 8) return value;
      return 1;
    }
  }
  return 1;
}

// Scale DOWN so the longest edge fits maxEdge; never upscale; preserve aspect.
function fittedSize(w, h, maxEdge = 1280) {
  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { w, h };
  const scale = maxEdge / longest;
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

// Map EXIF orientation to a canvas rotation. Only the upright/rotated cases
// (1/3/6/8) are handled; mirrored orientations and anything unknown fall back
// to no-op, which is acceptable for thumbnails.
function orientationTransform(orientation) {
  switch (orientation) {
    case 3:
      return { rotateDeg: 180, swapWH: false };
    case 6:
      return { rotateDeg: 90, swapWH: true };
    case 8:
      return { rotateDeg: 270, swapWH: true };
    default:
      return { rotateDeg: 0, swapWH: false };
  }
}

// --- browser-only re-encode (not unit-tested) -------------------------------

function compressImage(file, { maxEdge = 1280, quality = 0.8 } = {}) {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('compressImage requires a browser environment'));
  }

  return new Promise((resolve, reject) => {
    const arrayBufferReader = new FileReader();
    arrayBufferReader.onerror = () => reject(arrayBufferReader.error || new Error('read failed'));
    arrayBufferReader.onload = () => {
      let orientation = 1;
      try {
        orientation = readExifOrientation(arrayBufferReader.result);
      } catch {
        orientation = 1;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('image decode failed'));
      };
      img.onload = () => {
        try {
          const { rotateDeg, swapWH } = orientationTransform(orientation);
          const fitted = fittedSize(img.naturalWidth, img.naturalHeight, maxEdge);

          const canvas = document.createElement('canvas');
          canvas.width = swapWH ? fitted.h : fitted.w;
          canvas.height = swapWH ? fitted.w : fitted.h;

          const ctx = canvas.getContext('2d');
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotateDeg * Math.PI) / 180);
          // After rotation the drawing axes are back in image space, so draw at
          // the fitted (pre-swap) dimensions.
          ctx.drawImage(img, -fitted.w / 2, -fitted.h / 2, fitted.w, fitted.h);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (blob) resolve(blob);
              else reject(new Error('canvas.toBlob returned null'));
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.src = url;
    };
    arrayBufferReader.readAsArrayBuffer(file);
  });
}

module.exports = {
  readExifOrientation,
  fittedSize,
  orientationTransform,
  compressImage,
};
