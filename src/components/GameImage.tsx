import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { getPlatformBadge } from '../utils/formatters';

interface GameImageProps {
  src: string;
  alt: string;
  title: string;
  platform: string;
  type: 'cover' | 'banner';
  className?: string;
}

export const GameImage: React.FC<GameImageProps> = ({
  src,
  alt,
  title,
  platform,
  type,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const badge = getPlatformBadge(platform);

  // Normalize image URL for Electron
  let normalizedSrc = src;
  if (normalizedSrc) {
    if (
      !normalizedSrc.startsWith('http://') &&
      !normalizedSrc.startsWith('https://') &&
      !normalizedSrc.startsWith('data:') &&
      !normalizedSrc.startsWith('nexus-media://')
    ) {
      // Local Windows path like C:\... or file:///C:\...
      const clean = normalizedSrc.replace(/^file:\/\/\/?/, '').replace(/\\/g, '/');
      normalizedSrc = `nexus-media:///${clean}`;
    }
  }

  if (!normalizedSrc || hasError) {
    if (type === 'cover') {
      return (
        <div
          className={`w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 relative overflow-hidden select-none ${className}`}
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />

          {/* Top Platform Tag */}
          <div className="relative z-10">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-md ${badge.bg} ${badge.color}`}
            >
              {badge.name}
            </span>
          </div>

          {/* Center Graphic */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            <div className="w-11 h-11 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <Gamepad2 className="w-5 h-5" />
            </div>
          </div>

          {/* Bottom Title */}
          <div className="relative z-10">
            <div className="text-xs font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
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
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.color}`}
            >
              {badge.name}
            </span>
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
      src={normalizedSrc}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setHasError(true)}
      className={`${className} transition-opacity duration-300 ${
        loaded ? 'opacity-100' : 'opacity-80'
      }`}
    />
  );
};
