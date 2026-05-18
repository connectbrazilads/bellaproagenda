import React from 'react';
import bellaproLogo from '../assets/brand/bellapro-logo-ui.png';
import { cn } from '../lib/utils';

export default function BrandLogo({
  compact = false,
  stacked = false,
  className = '',
  imageClassName = '',
  subtitle,
  variant = 'auto',
}) {
  const isDarkBg = variant === 'darkBg';
  const isLightBg = variant === 'lightBg';

  const bellaColor = isDarkBg ? 'text-[#fffaf9]' : isLightBg ? 'text-[#1f1920]' : 'text-[#1f1920] dark:text-[#fffaf9]';
  const proColor = 'text-[#d98d9d]';
  const agendaColor = isDarkBg ? 'text-[#d98d9d]' : isLightBg ? 'text-[#cf8897]' : 'text-[#cf8897] dark:text-[#d98d9d]';

  return (
    <div
      className={cn(
        'flex items-center',
        stacked && 'flex-col items-center text-center',
        className
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden',
          compact ? 'h-[52px] w-[46px]' : 'h-[70px] w-[62px]',
          stacked && !compact && 'mb-2 h-[78px] w-[68px]'
        )}
      >
        <img
          src={bellaproLogo}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute left-0 top-0 h-full max-w-none object-contain object-left drop-shadow-[0_20px_36px_rgba(0,0,0,0.18)]',
            compact ? 'w-[158px]' : 'w-[210px]',
            imageClassName
          )}
        />
      </div>

      <div className={cn('ml-3 flex flex-col', stacked && 'ml-0 items-center')}>
        <div
          className={cn(
            'font-brand-display leading-none tracking-[-0.04em]',
            compact ? 'text-[1rem] sm:text-[1.05rem]' : 'text-[2.1rem] sm:text-[2.45rem]',
            stacked && !compact && 'text-[2rem] sm:text-[2.3rem]'
          )}
        >
          <span className={bellaColor}>Bella</span>
          <span className={cn('ml-1', proColor)}>Pro</span>
        </div>

        <div
          className={cn(
            'mt-1 font-semibold uppercase leading-none tracking-[0.42em]',
            compact ? 'text-[0.72rem]' : 'text-[0.92rem]',
            agendaColor
          )}
        >
          Agenda
        </div>

        {subtitle ? (
          <span className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.48em] text-[#e6b1b9]">
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}
