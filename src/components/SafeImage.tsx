import { useState } from 'react';
import { Utensils } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  eager?: boolean;
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  eager = false,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1C1C] via-[#121212] to-[#090909] border border-[#C9A45C]/15 text-[#C9A45C] p-6 text-center ${className}`}
      >
        <Utensils className="w-7 h-7 mb-2 opacity-75" strokeWidth={1.5} />
        <span className="text-xs tracking-wide text-[#B8B8B8]">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
