'use client';

import { useRef } from 'react';
import { ImagePlus, Image as ImageIcon, Loader } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function MemoryCapture({ hasPhoto, onAttach, busy }) {
  const { t } = useT();
  const inputRef = useRef(null);

  const handleClick = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onAttach?.(file);
    e.target.value = '';
  };

  let icon;
  let label;
  if (busy) {
    icon = <Loader size={14} className="animate-spin" aria-hidden="true" />;
    label = t('journey.memory.saving');
  } else if (hasPhoto) {
    icon = <ImageIcon size={14} aria-hidden="true" />;
    label = t('journey.memory.saved');
  } else {
    icon = <ImagePlus size={14} aria-hidden="true" />;
    label = t('journey.memory.capture');
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={[
          'inline-flex items-center gap-1.5 text-xs transition-colors',
          busy
            ? 'cursor-not-allowed text-[#9ca3af]'
            : hasPhoto
            ? 'text-[#9ca3af]'
            : 'text-[#6b7280] hover:text-teal-700',
        ].join(' ')}
      >
        {icon}
        {label}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
