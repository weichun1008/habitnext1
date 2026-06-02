const { readExifOrientation, fittedSize, orientationTransform } = require('@/lib/imageCompress');

describe('fittedSize', () => {
  it('長邊 > maxEdge 等比縮', () => {
    expect(fittedSize(2000, 1000, 1280)).toEqual({ w: 1280, h: 640 });
  });
  it('不放大', () => {
    expect(fittedSize(800, 600, 1280)).toEqual({ w: 800, h: 600 });
  });
  it('正方', () => {
    expect(fittedSize(3000, 3000, 1280)).toEqual({ w: 1280, h: 1280 });
  });
  it('高 > 寬', () => {
    expect(fittedSize(1000, 2000, 1280)).toEqual({ w: 640, h: 1280 });
  });
});

describe('orientationTransform', () => {
  it('1/3/6/8', () => {
    expect(orientationTransform(1)).toEqual({ rotateDeg: 0, swapWH: false });
    expect(orientationTransform(3)).toEqual({ rotateDeg: 180, swapWH: false });
    expect(orientationTransform(6)).toEqual({ rotateDeg: 90, swapWH: true });
    expect(orientationTransform(8)).toEqual({ rotateDeg: 270, swapWH: true });
  });
  it('未知 → 預設', () => {
    expect(orientationTransform(99)).toEqual({ rotateDeg: 0, swapWH: false });
  });
});

describe('readExifOrientation', () => {
  it('非 JPEG → 1', () => {
    const buf = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
    expect(readExifOrientation(buf)).toBe(1);
  });
  it('空 / 壞輸入不丟錯 → 1', () => {
    expect(readExifOrientation(new Uint8Array([]).buffer)).toBe(1);
    expect(readExifOrientation(new Uint8Array([0xff, 0xd8]).buffer)).toBe(1);
  });
  it('含 orientation=6 的最小 EXIF JPEG → 6', () => {
    // Build a minimal JPEG: SOI + APP1(Exif) with TIFF(big-endian MM) IFD0 having 1 entry: tag 0x0112 type SHORT count 1 value 6
    const bytes = [];
    bytes.push(0xFF, 0xD8); // SOI
    // APP1
    bytes.push(0xFF, 0xE1);
    // length placeholder (we'll set after) — compute below
    const exif = [];
    // "Exif\0\0"
    exif.push(0x45,0x78,0x69,0x66,0x00,0x00);
    const tiffStart = exif.length;
    // TIFF header big-endian
    exif.push(0x4D,0x4D, 0x00,0x2A); // MM, 42
    exif.push(0x00,0x00,0x00,0x08);  // IFD0 offset = 8 from tiffStart
    // IFD0: 1 entry
    exif.push(0x00,0x01);
    // entry: tag 0x0112, type SHORT(3), count 1, value 6 (left-justified in 4 bytes)
    exif.push(0x01,0x12, 0x00,0x03, 0x00,0x00,0x00,0x01, 0x00,0x06,0x00,0x00);
    // next IFD offset 0
    exif.push(0x00,0x00,0x00,0x00);
    const app1len = exif.length + 2; // +2 for the length field itself
    bytes.push((app1len >> 8) & 0xff, app1len & 0xff);
    for (const b of exif) bytes.push(b);
    const buf = new Uint8Array(bytes).buffer;
    expect(readExifOrientation(buf)).toBe(6);
  });
});
