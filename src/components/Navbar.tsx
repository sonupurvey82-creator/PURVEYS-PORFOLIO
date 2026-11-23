import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

interface NavbarProps {
  onTriggerUpload: () => void;
  isProcessing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onTriggerUpload, isProcessing }) => {
  const [isHidden, setIsHidden] = useState<boolean>(false);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const hidden = window.scrollY > 16;
      setIsHidden((prev) => (prev === hidden ? prev : hidden));
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      aria-hidden={isHidden}
      className={`fixed top-0 right-0 left-0 z-30 border-b border-white/10 bg-[#06150B]/88 transition-[transform,opacity] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform motion-reduce:transition-none ${
        isHidden
          ? '-translate-y-full opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <a
          href="#top"
          tabIndex={isHidden ? -1 : undefined}
          className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-[0.06em] text-[#FAF6F0] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] rounded"
        >
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-[#1B130E] shadow-sm sm:h-10 sm:w-10">
            <img
              src="/assets/aistudio/63cd9e8a-889e-4af6-a583-da515677f63c_6ede8ecc.png"
              alt="PURVEY tiger mascot"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </span>
          <span>PURVEY</span>
        </a>

        <button
          type="button"
          onClick={onTriggerUpload}
          disabled={isProcessing}
          tabIndex={isHidden ? -1 : undefined}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#EA580C] px-4 text-xs font-semibold text-[#FFF7ED] transition-colors duration-150 hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06150B] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{isProcessing ? 'Adding...' : 'Upload Videos'}</span>
        </button>
      </div>
    </header>
  );
};
