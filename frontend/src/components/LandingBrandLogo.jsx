import React from 'react';
import bellaproLogoDark from '../assets/brand/bellapro-logo-ui-dark.png';
import { cn } from '../lib/utils';

export default function LandingBrandLogo({ className = '', imageClassName = '' }) {
  return (
    <div className={cn('flex items-center', className)}>
      <img
        src={bellaproLogoDark}
        alt="BellaPro Agenda"
        className={cn(
          'h-auto w-[190px] max-w-full object-contain object-left drop-shadow-[0_24px_40px_rgba(0,0,0,0.16)] sm:w-[212px]',
          imageClassName
        )}
      />
    </div>
  );
}
