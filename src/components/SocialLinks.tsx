import React from 'react';

interface SocialItem {
  name: string;
  handle: string;
  href: string;
  icon: React.ReactNode;
}

const SOCIAL_PROFILES: SocialItem[] = [
  {
    name: 'Instagram',
    handle: '@purvey',
    href: 'https://instagram.com/purvey',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    name: 'YouTube',
    handle: 'PURVEY',
    href: 'https://youtube.com/@purvey',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    ),
  },
  {
    name: 'X',
    handle: '@purvey',
    href: 'https://x.com/purvey',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
        <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    handle: '@purvey',
    href: 'https://tiktok.com/@purvey',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
      </svg>
    ),
  },
];

interface SocialLinksProps {
  variant?: 'cards' | 'compact';
}

export const SocialLinks: React.FC<SocialLinksProps> = ({ variant = 'cards' }) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2.5">
        {SOCIAL_PROFILES.map((item) => (
          <a
            key={item.name}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.name} (${item.handle})`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#F97316]/25 bg-[#16110E] text-[#FDBA74] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#F97316] hover:bg-[#EA580C] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            {item.icon}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SOCIAL_PROFILES.map((item) => (
        <a
          key={item.name}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-h-[56px] items-center justify-between gap-4 rounded-xl border border-[#F97316]/20 bg-[#140F0C]/90 px-4 py-3 transition-all duration-150 hover:border-[#F97316]/70 hover:bg-[#1C140F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#F97316]/25 bg-[#1D140E] text-[#F97316] transition-colors duration-150 group-hover:bg-[#EA580C] group-hover:text-[#FFF7ED] shrink-0">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#FAF6F0] truncate">
                {item.name}
              </p>
              <p className="text-xs text-[#A89A8A] truncate">
                {item.handle}
              </p>
            </div>
          </div>
          <span
            aria-hidden="true"
            className="text-xs font-medium text-[#F97316] opacity-75 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 whitespace-nowrap shrink-0"
          >
            Follow
          </span>
        </a>
      ))}
    </div>
  );
};
