import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { PlatformBadge } from './PlatformBadge';

interface GameImageProps {
  src?: string;
  alt: string;
  title: string;
  platform: string;
  type: 'cover' | 'banner';
  className?: string;
}

function normalizeMediaUrl(src?: string): string {
  if (!src) return '';
  if (
    !src.startsWith('http://') &&
    !src.startsWith('https://') &&
    !src.startsWith('data:') &&
    !src.startsWith('aegis-media://') &&
    !src.startsWith('nexus-media://')
  ) {
    const clean = src.replace(/^file:\/\/\/?/, '').replace(/\\/g, '/');
    return `aegis-media:///${clean}`;
  }
  return src;
}

export const GameImage: React.FC<GameImageProps> = React.memo(({
  src,
  alt,
  title,
  platform,
  type,
  className = '',
}) => {
  const normalizedSrc = normalizeMediaUrl(src);
  const [errorState, setErrorState] = useState<{
    originalSrc: string;
    fallbackUrl?: string;
    failed: boolean;
  }>({ originalSrc: '', failed: false });

  const isSameSrc = errorState.originalSrc === normalizedSrc;
  const activeSrc = isSameSrc && errorState.fallbackUrl ? errorState.fallbackUrl : normalizedSrc;
  const hasError = isSameSrc && errorState.failed;

  const handleError = () => {
    if (!isSameSrc || !errorState.fallbackUrl) {
      // Try Steam CDN if it's Steam or URL has an AppID
      const appIdMatch =
        normalizedSrc.match(/apps\/(\d{3,9})/) || normalizedSrc.match(/\/(\d{3,9})\//);
      if (appIdMatch || platform === 'steam') {
        const appId = appIdMatch ? appIdMatch[1] : '';
        if (appId) {
          const cdnFallback =
            type === 'cover'
              ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`
              : `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;
          if (normalizedSrc !== cdnFallback) {
            setErrorState({
              originalSrc: normalizedSrc,
              fallbackUrl: cdnFallback,
              failed: false,
            });
            return;
          }
        }
      }
    }
    setErrorState({
      originalSrc: normalizedSrc,
      failed: true,
    });
  };

  if (!activeSrc || hasError) {
    if (type === 'cover') {
      return (
        <div
          className={`w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden select-none ${className}`}
        >
          {/* Top Platform Tag */}
          <div className="relative z-10">
            <PlatformBadge platform={platform} size="xs" />
          </div>

          {/* Center Graphic */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            <div className="w-11 h-11 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-blue-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
          </div>

          {/* Bottom Title */}
          <div className="relative z-10">
            <div className="text-xs font-bold text-white line-clamp-2 leading-tight">
              {title}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
              Cover Art
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div
          className={`w-full h-full flex items-center justify-between px-8 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 relative overflow-hidden select-none ${className}`}
        >
          <div className="relative z-10 space-y-1">
            <PlatformBadge platform={platform} size="xs" showLabel />
            <h2 className="text-2xl font-extrabold text-white tracking-tight">{title}</h2>
          </div>
          <div className="relative z-10 hidden sm:flex w-14 h-14 rounded-xl bg-slate-800/60 border border-slate-700/50 items-center justify-center text-slate-500">
            <Gamepad2 className="w-7 h-7" />
          </div>
        </div>
      );
    }
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={handleError}
      className={className}
    />
  );
});
