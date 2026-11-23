import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const WelcomeAirshipBanner: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  const trailPuffs = [
    { delay: 0, size: 11, yOffset: -2 },
    { delay: 0.4, size: 15, yOffset: 3 },
    { delay: 0.8, size: 13, yOffset: -3 },
    { delay: 1.2, size: 16, yOffset: 2 },
  ];

  const airshipAndBanner = (
    <div className="inline-flex items-center">
      {/* Detailed Hot-Air Balloon Plane (pointing LEFT, no nose fan) */}
      <div className="relative shrink-0">
        <svg
          width="148"
          height="114"
          viewBox="0 0 148 114"
          fill="none"
          className="drop-shadow-[0_12px_22px_rgba(0,0,0,0.72)]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="balloonShellGrad" x1="28" y1="8" x2="112" y2="66" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF8A1F" />
              <stop offset="52%" stopColor="#FF6B00" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
            <linearGradient id="balloonGoldGore" x1="48" y1="6" x2="88" y2="66" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="fuselageGrad" x1="34" y1="74" x2="108" y2="96" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFBF5" />
              <stop offset="65%" stopColor="#F3E8D8" />
              <stop offset="100%" stopColor="#D6C6B2" />
            </linearGradient>
          </defs>

          {/* Top Crown Cap & Relief Patch */}
          <ellipse cx="68" cy="7.5" rx="11" ry="3.2" fill="#9A3412" />
          <ellipse cx="68" cy="7" rx="6.5" ry="1.8" fill="#FDE68A" fillOpacity="0.7" />

          {/* Main Sculpted Balloon Envelope (Smooth Teardrop / Blimp-Balloon Canopy) */}
          <path
            d="M36 52C26 42 23 27 32 16C41 6 55 5 68 5C81 5 95 6 104 16C113 27 110 42 100 52L86 64H50L36 52Z"
            fill="url(#balloonShellGrad)"
          />

          {/* Cream & Amber Alternating Balloon Gores */}
          <path
            d="M52 5.8C40 12 36 32 45 54L56 64H68V5.2C62 5.2 57 5.4 52 5.8Z"
            fill="#FFF7ED"
            fillOpacity="0.88"
          />
          <path
            d="M68 5.2V64H80L91 54C100 32 96 12 84 5.8C79 5.4 74 5.2 68 5.2Z"
            fill="url(#balloonGoldGore)"
            fillOpacity="0.92"
          />
          <path
            d="M68 5.2C61 14 59 34 62 64H74C77 34 75 14 68 5.2Z"
            fill="#FF6B00"
          />

          {/* Fine Vertical Gore Seams */}
          <path
            d="M44 10C34 22 33 40 46 61M56 6.5C48 20 48 41 56 64M80 6.5C88 20 88 41 80 64M92 10C102 22 103 40 90 61"
            stroke="#7C2D12"
            strokeOpacity="0.38"
            strokeWidth="1.1"
          />

          {/* Horizontal Equatorial Belt with Highlight */}
          <path
            d="M27.5 29C44 33.5 92 33.5 108.5 29"
            stroke="#7C2D12"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
          <path
            d="M28 28.5C44 33 92 33 108 28.5"
            stroke="#FEF3C7"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeOpacity="0.9"
          />

          {/* Scalloped Lower Balloon Skirt Collar */}
          <path
            d="M48 63.5C51 66.5 55 66.5 58 63.5C61 66.5 65 66.5 68 63.5C71 66.5 75 66.5 78 63.5C81 66.5 85 66.5 88 63.5L86 60.5H50L48 63.5Z"
            fill="#9A3412"
          />

          {/* Warm Glowing Burner Flame & Brass Burner Nozzle */}
          <motion.g
            animate={
              shouldReduceMotion
                ? { opacity: 0.85 }
                : {
                    opacity: [0.7, 1, 0.78, 0.96, 0.7],
                    scaleY: [0.9, 1.16, 0.96, 1.1, 0.9],
                  }
            }
            transition={{
              duration: 0.75,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '68px 72px' }}
          >
            <path d="M68 61C63.5 66 63.5 70.5 68 72C72.5 70.5 72.5 66 68 61Z" fill="#F97316" />
            <path d="M68 63.5C65.5 66.8 65.5 69.8 68 71C70.5 69.8 70.5 66.8 68 63.5Z" fill="#FEF08A" />
          </motion.g>
          <rect x="64" y="71.5" width="8" height="3.2" rx="1" fill="#B45309" stroke="#FDE68A" strokeWidth="0.7" />

          {/* Cross-Braced Suspension Rigging Cables */}
          <line x1="50" y1="64" x2="54" y2="79" stroke="#FED7AA" strokeOpacity="0.78" strokeWidth="1.2" />
          <line x1="86" y1="64" x2="82" y2="79" stroke="#FED7AA" strokeOpacity="0.78" strokeWidth="1.2" />
          <line x1="58" y1="64.5" x2="62" y2="78" stroke="#FDBA74" strokeOpacity="0.6" strokeWidth="1" />
          <line x1="78" y1="64.5" x2="74" y2="78" stroke="#FDBA74" strokeOpacity="0.6" strokeWidth="1" />

          {/* Suspended Vintage Plane Fuselage / Winged Gondola (Facing LEFT) */}
          <motion.g
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    rotate: [-1.2, 1.2, -1.2],
                  }
            }
            transition={{
              duration: 3.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '68px 74px' }}
          >
            {/* Plane Vertical Tail Fin & Horizontal Stabilizer (Right Rear) */}
            <path d="M98 83L116 67H106L92 83H98Z" fill="#EA580C" />
            <path d="M101 84.5L118 81.5L112 87H97L101 84.5Z" fill="#F97316" />

            {/* Far Upper Wing */}
            <path d="M58 80L71 70H83L73 80H58Z" fill="#C2410C" />

            {/* Main Sculpted Airplane Nose-to-Tail Body (Rounded Smooth Nose — Zero Fan) */}
            <path
              d="M27 87.5C27 82.2 35 78.5 47 78.5H93C101 78.5 107 82 108 86C106.5 90.5 100 94 92 94H46C34 94 27 91.5 27 87.5Z"
              fill="url(#fuselageGrad)"
              stroke="#7C2D12"
              strokeOpacity="0.3"
              strokeWidth="1"
            />

            {/* Painted Rounded Nose Cap (Clean Aerodynamic Nose without Propeller) */}
            <path
              d="M27 87.5C27 83.4 31.8 80.2 38.5 79.1V93.2C31.5 92.4 27 90.2 27 87.5Z"
              fill="#FF6B00"
            />
            <path
              d="M29.5 85.2C31 83 33.8 81.6 37 81.2"
              stroke="#FFF7ED"
              strokeOpacity="0.65"
              strokeWidth="1.3"
              strokeLinecap="round"
            />

            {/* Cosmic Orange Side Cheatline */}
            <path d="M38.5 87.5H101" stroke="#FF6B00" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M40 84.6H95" stroke="#1C140F" strokeOpacity="0.35" strokeWidth="1" strokeLinecap="round" />

            {/* Curved Glass Cockpit Canopy + Portholes */}
            <path
              d="M47 78.7H66C70 78.7 73 80.6 74.5 83.4H45.5C45.8 81.2 46.2 79.8 47 78.7Z"
              fill="#0F172A"
            />
            <path
              d="M48.5 79.8H63C66 79.8 68.5 81 69.8 82.5H47.8L48.5 79.8Z"
              fill="#BAE6FD"
              fillOpacity="0.45"
            />
            <circle cx="79" cy="83.5" r="2.1" fill="#0F172A" stroke="#FDBA74" strokeWidth="0.8" />
            <circle cx="86.5" cy="83.5" r="2.1" fill="#0F172A" stroke="#FDBA74" strokeWidth="0.8" />

            {/* Wing Struts + Cambered Lower Airfoil Wing */}
            <line x1="60" y1="79" x2="64" y2="90" stroke="#FDBA74" strokeWidth="1.2" />
            <line x1="72" y1="79" x2="74" y2="90" stroke="#FDBA74" strokeWidth="1.2" />
            <motion.path
              d="M54 88.5L78 88.5L88 102.5H65L54 88.5Z"
              fill="#FACC15"
              stroke="#B45309"
              strokeWidth="0.9"
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      scaleY: [1, 1.07, 1, 0.9, 1],
                    }
              }
              transition={{
                duration: 2.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: '68px 88.5px' }}
            />
            {/* Wingtip Navigation Light */}
            <circle cx="86.5" cy="101.8" r="1.6" fill="#FF6B00" />

            {/* Vintage Landing Gear Struts & Twin Wheels */}
            <line x1="48" y1="93.5" x2="45" y2="104" stroke="#D6CBC0" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="56" y1="93.5" x2="53" y2="104" stroke="#D6CBC0" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="45" cy="105.5" r="3.6" fill="#1C140F" stroke="#FF6B00" strokeWidth="1.4" />
            <circle cx="45" cy="105.5" r="1.2" fill="#FAF6F0" />

            <line x1="94" y1="93" x2="97" y2="100.5" stroke="#D6CBC0" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="97.5" cy="101.5" r="2.2" fill="#1C140F" stroke="#FDBA74" strokeWidth="1" />
          </motion.g>
        </svg>
      </div>

      {/* Tow Rope Lines Extending Behind to the Right */}
      <svg
        width="36"
        height="28"
        viewBox="0 0 36 28"
        fill="none"
        className="-ml-3 mt-7 shrink-0"
        aria-hidden="true"
      >
        <line x1="0" y1="14" x2="36" y2="5" stroke="#FDBA74" strokeOpacity="0.78" strokeWidth="1.25" />
        <line x1="0" y1="14" x2="36" y2="23" stroke="#FDBA74" strokeOpacity="0.78" strokeWidth="1.25" />
      </svg>

      {/* Trailing Banner: "Welcome Here" */}
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
                skewY: [0, -1.5, 0, 1.5, 0],
              }
        }
        transition={{
          duration: 3.1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative mt-7 flex h-9 items-center bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] pl-4 pr-6 shadow-[0_8px_24px_-4px_rgba(255,107,0,0.48)]"
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 93% 50%, 100% 100%, 0% 100%)',
        }}
      >
        <span className="font-display text-xs font-bold tracking-wide text-white whitespace-nowrap [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] sm:text-sm">
          Welcome Here
        </span>
      </motion.div>

      {/* Soft Trailing Air Wisps on the Right */}
      <div className="relative mt-7 ml-2 flex items-center" aria-hidden="true">
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-white/65 via-white/30 to-transparent sm:w-32" />
        <div className="pointer-events-none absolute left-2 flex items-center gap-3.5">
          {trailPuffs.map((puff, idx) => (
            <motion.span
              key={idx}
              animate={
                shouldReduceMotion
                  ? { opacity: 0.4 }
                  : {
                      opacity: [0.7, 0.4, 0],
                      scale: [0.55, 1.15, 1.4],
                      x: [0, 18, 34],
                      y: [puff.yOffset, puff.yOffset - 2, puff.yOffset + 2],
                    }
              }
              transition={{
                duration: 1.9,
                delay: puff.delay,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              style={{
                width: `${puff.size * 1.25}px`,
                height: `${puff.size * 0.85}px`,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 72%)',
              }}
              className="rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div
      aria-label="Flying Air Balloon Plane with Welcome Here banner"
      className="relative h-32 w-full overflow-hidden sm:h-36"
    >
      {shouldReduceMotion ? (
        <div className="flex h-full w-full items-center justify-center px-4">
          {airshipAndBanner}
        </div>
      ) : (
        <motion.div
          initial={{ x: 'calc(100vw + 180px)' }}
          animate={{ x: '-560px' }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/2 left-0 -translate-y-1/2 will-change-transform"
        >
          <motion.div
            animate={{ y: [0, -6, 0, 5, 0] }}
            transition={{
              duration: 5.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {airshipAndBanner}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
