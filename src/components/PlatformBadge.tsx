import React from 'react';
import { getPlatformBadge } from '../utils/formatters';

export interface PlatformBadgeProps {
  platform: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const PlatformBadge: React.FC<PlatformBadgeProps> = React.memo(({
  platform,
  size = 'sm',
  showLabel = false,
  className = '',
}) => {
  const badge = getPlatformBadge(platform);

  // Size configurations
  const sizeClasses = {
    xs: {
      box: 'w-5 h-5 p-0.5',
      img: 'w-full h-full',
      text: 'text-[9px]',
    },
    sm: {
      box: 'w-6 h-6 p-1',
      img: 'w-full h-full',
      text: 'text-[10px]',
    },
    md: {
      box: 'w-7 h-7 p-1',
      img: 'w-full h-full',
      text: 'text-xs',
    },
    lg: {
      box: 'w-8 h-8 p-1.5',
      img: 'w-full h-full',
      text: 'text-xs',
    },
  }[size];

  if (showLabel) {
    return (
      <div
        title={badge.name}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950/85 border border-white/20 shadow-sm select-none ${className}`}
      >
        <div className="relative flex items-center justify-center shrink-0 w-4 h-4 rounded-full bg-white/15 p-0.5">
          <img
            src={badge.logo}
            alt={badge.name}
            decoding="async"
            className="w-full h-full object-contain brightness-125"
          />
        </div>
        <span className={`font-semibold uppercase tracking-wider text-white ${sizeClasses.text}`}>
          {badge.name}
        </span>
      </div>
    );
  }

  return (
    <div
      title={badge.name}
      className={`relative inline-flex items-center justify-center rounded-full bg-slate-950/80 border border-white/20 shadow-sm select-none ${sizeClasses.box} ${className}`}
    >
      <img
        src={badge.logo}
        alt={badge.name}
        decoding="async"
        className={`${sizeClasses.img} object-contain pointer-events-none brightness-125`}
      />
    </div>
  );
});
