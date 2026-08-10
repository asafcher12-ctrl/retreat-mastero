import React from 'react';

export default function Logo({ size = 'md', withText = true, subtitle = true }) {
  const box = size === 'lg' ? 'w-14 h-14 rounded-2xl' : size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
  const titleSize = size === 'lg' ? 'text-lg' : 'text-sm';
  const subSize = size === 'lg' ? 'text-xs' : 'text-[11px]';

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${box} bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/30 relative overflow-hidden shrink-0`}>
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white/20 blur-[6px]" />
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-1.5 relative">
          {/* mountain range */}
          <path d="M1 18 L7 10 L11 14 L15 8 L23 18 Z" fill="white" fillOpacity="0.22" />
          {/* tent */}
          <path d="M5 19 L12 7 L19 19 Z" fill="white" />
          <path d="M12 7 L12 19" stroke="#047857" strokeWidth="1.3" strokeLinecap="round" />
          {/* sparkle star */}
          <path d="M18.5 3.8 l0.55 1.45 1.45 0.55 -1.45 0.55 -0.55 1.45 -0.55 -1.45 -1.45 -0.55 1.45 -0.55 z" fill="white" />
        </svg>
      </div>
      {withText && (
        <div className="leading-tight">
          <h1 className={`font-extrabold ${titleSize} text-stone-800 tracking-tight`}>
            Camping <span className="text-emerald-600">Maestro</span>
          </h1>
          {subtitle && <p className={`${subSize} text-stone-400`}>ניהול אירוע קהילתי</p>}
        </div>
      )}
    </div>
  );
}