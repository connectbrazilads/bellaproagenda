import React from 'react';
import bellaproLogoLight from '../assets/brand/bellapro-logo-ui.png';
import bellaproLogoDark from '../assets/brand/bellapro-logo-ui-dark.png';
import { cn } from '../lib/utils';

export default function LandingBrandLogo({
  variant = 'lightBg',
  className = '',
  imageClassName = '',
}) {
  const src = variant === 'darkBg' ? bellaproLogoDark : bellaproLogoLight;

  return (
    <div className={cn('flex items-center', className)}>
      <img
        src={src}
        alt="BellaPro Agenda"
        className={cn(
          'h-auto w-[156px] max-w-full object-contain object-left sm:w-[178px]',
          variant === 'darkBg' && 'drop-shadow-[0_14px_30px_rgba(0,0,0,0.28)]',
          imageClassName
        )}
      />
    </div>
  );
}
