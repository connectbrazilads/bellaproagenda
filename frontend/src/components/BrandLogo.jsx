import React from 'react';
import { cn } from '../lib/utils';

export default function BrandLogo({
  compact = false,
  stacked = false,
  light = false,
  className = '',
  markClassName = '',
  textClassName = '',
  subtitle = 'Agenda',
}) {
  return (
    <div className={cn('flex items-center gap-3', stacked && 'flex-col items-start gap-4', className)}>
      <div
        className={cn(
          'brand-mark flex h-12 w-12 items-center justify-center rounded-[1.35rem] border shadow-[0_18px_44px_-20px_rgba(226,155,168,0.7)]',
          light
            ? 'border-[#e7c4c8] bg-[linear-gradient(180deg,#fff8f7_0%,#f9e0dd_100%)] text-[#a45f69]'
            : 'border-[#f0c5cb1f] bg-[linear-gradient(180deg,#231c24_0%,#17161c_100%)] text-[#f2bcc1]',
          compact ? 'h-10 w-10 rounded-[1rem] text-2xl' : 'text-[2.2rem]',
          markClassName
        )}
      >
        <span className="font-brand-display leading-none tracking-[-0.08em]">B</span>
      </div>

      <div className={cn('min-w-0', textClassName)}>
        <div
          className={cn(
            'font-brand-display leading-none tracking-[-0.05em]',
            compact ? 'text-2xl' : 'text-[2rem]',
            light ? 'text-[#1a1a1f]' : 'text-[#faf7f6]'
          )}
        >
          Bella<span className={light ? 'text-[#d28595]' : 'text-[#ef9ead]'}>Pro</span>
        </div>
        {!compact && (
          <div
            className={cn(
              'mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.48em]',
              light ? 'text-[#8c6b75]' : 'text-[#e6b1b9]'
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
