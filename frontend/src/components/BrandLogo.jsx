import React from 'react';
import bellaproLogo from '../assets/brand/bellapro-logo-ui.png';
import { cn } from '../lib/utils';

export default function BrandLogo({
  compact = false,
  stacked = false,
  className = '',
  imageClassName = '',
  subtitle,
}) {
  return (
    <div className={cn('flex items-center', stacked && 'flex-col items-center text-center', className)}>
      <img
        src={bellaproLogo}
        alt="BellaPro Agenda"
        className={cn(
          'block h-auto object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.16)]',
          compact ? 'w-[164px] max-w-full' : 'w-[252px] max-w-full sm:w-[292px]',
          stacked && !compact && 'w-[220px] sm:w-[268px]',
          imageClassName
        )}
      />
      {subtitle ? (
        <span className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.48em] text-[#e6b1b9]">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}
