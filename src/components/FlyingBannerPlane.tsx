import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';

interface FlyingBannerPlaneProps {
  audioUnlocked: boolean;
  isVideoAudioPlaying: boolean;
}

export const FlyingBannerPlane: React.FC<FlyingBannerPlaneProps> = ({
  audioUnlocked,
  isVideoAudioPlaying,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isTabActive, setIsTabActive] = useState<boolean>(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Observe whether the plane corridor is in viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pause engine hum when browser tab is backgrounded
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Synthesize warm, subtle vintage propeller plane hum via Web Audio API
  useEffect(() => {
    const shouldSound = soundEnabled && audioUnlocked && isVisible && isTabActive;

    if (!shouldSound) {
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setTargetAtTime(
          0,
          audioCtxRef.current.currentTime,
          0.12
        );
      }
      return;
    }

    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;

      // Low-pass filter for warm muffled prop engine tone
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 230;
      lowpass.Q.value = 1.1;

      // Primary engine cylinder rumble
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 54;

      // Harmonic overtone
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 108;

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.45;

      // Propeller blade-pass LFO modulation (~15 Hz chop)
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 15;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.25;

      const engineBus = ctx.createGain();
      engineBus.gain.value = 0.65;

      // Soft wind rush noise
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 340;
      noiseFilter.Q.value = 0.8;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.14;

      osc1.connect(engineBus);
      osc2.connect(osc2Gain);
      osc2Gain.connect(engineBus);
      lfo.connect(lfoGain);
      lfoGain.connect(engineBus.gain);

      engineBus.connect(lowpass);
      lowpass.connect(masterGain);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      masterGain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      lfo.start();
      noiseSource.start();

      audioCtxRef.current = ctx;
      masterGainRef.current = masterGain;
    }

    const ctx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Duck gently if user's Showreel/Reel video audio is actively playing
    const targetVolume = isVideoAudioPlaying ? 0.032 : 0.085;
    masterGain.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.25);
  }, [soundEnabled, audioUnlocked, isVisible, isTabActive, isVideoAudioPlaying]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        masterGainRef.current = null;
      }
    };
  }, []);

  const cloudPuffs = [
    { delay: 0, size: 12, yOffset: -2 },
    { delay: 0.35, size: 16, yOffset: 3 },
    { delay: 0.7, size: 14, yOffset: -3 },
    { delay: 1.05, size: 18, yOffset: 2 },
    { delay: 1.4, size: 11, yOffset: 0 },
  ];

  const planeAndBanner = (
    <div className="inline-flex items-center">
      {/* Trailing Little White Cloud Line / Contrail */}
      <div className="relative mr-1.5 flex items-center" aria-hidden="true">
        <div className="h-[2px] w-28 sm:w-44 rounded-full bg-gradient-to-l from-white/75 via-white/35 to-transparent" />
        <div className="pointer-events-none absolute right-2 flex items-center gap-4">
          {cloudPuffs.map((puff, idx) => (
            <motion.span
              key={idx}
              animate={
                shouldReduceMotion
                  ? { opacity: 0.45 }
                  : {
                      opacity: [0.75, 0.45, 0],
                      scale: [0.55, 1.15, 1.45],
                      x: [0, -18, -36],
                      y: [puff.yOffset, puff.yOffset - 3, puff.yOffset + 2],
                    }
              }
              transition={{
                duration: 1.8,
                delay: puff.delay,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              style={{
                width: `${puff.size * 1.3}px`,
                height: `${puff.size * 0.9}px`,
                background: 'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 72%)',
              }}
              className="rounded-full"
            />
          ))}
        </div>
      </div>

      <a
        href="#contact"
        aria-label="Contact Now"
        className="group inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAB308] rounded"
      >
        {/* Trailing Yellow Banner with White Text ("Contact Now") */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  skewY: [0, 1.6, 0, -1.6, 0],
                }
          }
          transition={{
            duration: 3.0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative flex h-9 items-center bg-[#EAB308] pl-4 pr-3.5 shadow-[0_6px_22px_-4px_rgba(234,179,8,0.5)] transition-colors duration-150 group-hover:bg-[#CA8A04]"
          style={{
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 7% 50%)',
          }}
        >
          <span className="pl-2 font-display text-xs font-bold tracking-wide text-white whitespace-nowrap [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] sm:text-sm">
            Contact Now
          </span>
        </motion.div>

        {/* Tow Rope Lines */}
        <svg
          width="36"
          height="24"
          viewBox="0 0 36 24"
          fill="none"
          className="shrink-0"
          aria-hidden="true"
        >
          <line x1="0" y1="5" x2="35" y2="12" stroke="#FDBA74" strokeOpacity="0.7" strokeWidth="1.2" />
          <line x1="0" y1="19" x2="35" y2="12" stroke="#FDBA74" strokeOpacity="0.7" strokeWidth="1.2" />
        </svg>

        {/* Detailed Tiger-Themed Aircraft with Moving Motor Propeller & Articulated Wings */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [-0.4, 0.4, -0.4],
                }
          }
          transition={{
            duration: 0.09,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="relative shrink-0"
        >
          <svg
            width="92"
            height="48"
            viewBox="0 0 92 48"
            fill="none"
            className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]"
            aria-hidden="true"
          >
            {/* Moving Upper Wing */}
            <motion.path
              d="M37 18L30 4H43L48 18H37Z"
              fill="#EA580C"
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      scaleY: [1, 0.84, 1, 1.08, 1],
                      skewX: [0, -3, 0, 2, 0],
                    }
              }
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: '40px 18px' }}
            />

            {/* Tail Vertical Fin & Rudder */}
            <path d="M12 22L5 9H15L22 21H12Z" fill="#EA580C" />
            <path d="M8 23L4 21H15L18 25H10L8 23Z" fill="#F97316" />

            {/* Landing Gear Strut & Wheel */}
            <line x1="48" y1="29" x2="51" y2="38" stroke="#D6CBC0" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="51" cy="40" r="3.4" fill="#1C140F" stroke="#F97316" strokeWidth="1.4" />

            {/* Sculpted Fuselage */}
            <path
              d="M12 24C12 20.5 16.5 18 25 18H67C74 18 79 20.5 80 24C79 27.5 74 30 67 30H23C16 30 12 27.5 12 24Z"
              fill="#FAF6F0"
            />

            {/* Tiger Orange Racing Stripe */}
            <path
              d="M17 24.5H74"
              stroke="#F97316"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path
              d="M21 21.8H64"
              stroke="#1C140F"
              strokeWidth="1.2"
              strokeOpacity="0.45"
              strokeLinecap="round"
            />

            {/* Cockpit Glass Canopy */}
            <path
              d="M44 18.2H60C63.5 18.2 66.5 20 67.8 22.4H44V18.2Z"
              fill="#1C140F"
            />
            <path
              d="M47 19.3H58C60.2 19.3 62.2 20.3 63.2 21.6H47V19.3Z"
              fill="#FDBA74"
              fillOpacity="0.32"
            />

            {/* Radial Engine Cowling & Moving Motor Spinner */}
            <path
              d="M74 19C78.5 19.5 81.5 21.5 81.5 24C81.5 26.5 78.5 28.5 74 29V19Z"
              fill="#C2410C"
            />
            <circle cx="82" cy="24" r="2.4" fill="#FAF6F0" />

            {/* Spinning Propeller Blades (Moving Motor) */}
            <motion.g
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      scaleY: [1, 0.14, -1, 0.14, 1],
                    }
              }
              transition={{
                duration: 0.11,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ transformOrigin: '83.5px 24px' }}
            >
              <ellipse cx="83.5" cy="14" rx="1.6" ry="9" fill="#FAF6F0" fillOpacity="0.92" />
              <ellipse cx="83.5" cy="34" rx="1.6" ry="9" fill="#FAF6F0" fillOpacity="0.92" />
            </motion.g>

            {/* Spinning Propeller Motion Blur Ring */}
            <motion.ellipse
              cx="83.5"
              cy="24"
              rx="1.8"
              ry="17"
              stroke="#FED7AA"
              strokeOpacity="0.35"
              strokeWidth="1.2"
              animate={
                shouldReduceMotion
                  ? undefined
                  : { opacity: [0.2, 0.55, 0.2] }
              }
              transition={{ duration: 0.18, repeat: Infinity }}
            />

            {/* Moving Foreground Lower Wing */}
            <motion.path
              d="M36 25L31 41H45L51 25H36Z"
              fill="#F97316"
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      scaleY: [1, 1.09, 1, 0.85, 1],
                      skewX: [0, 3, 0, -2, 0],
                    }
              }
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: '42px 25px' }}
            />
          </svg>
        </motion.div>
      </a>
    </div>
  );

  return (
    <div
      ref={containerRef}
      aria-label="Flying Contact Now banner plane"
      className="relative h-24 w-full overflow-hidden"
    >
      {/* Subtle Plane Engine Sound Toggle */}
      <div className="pointer-events-none absolute inset-y-0 right-4 z-20 flex items-center sm:right-6">
        <button
          type="button"
          onClick={() => setSoundEnabled((prev) => !prev)}
          aria-label={soundEnabled ? 'Mute plane sound' : 'Play plane sound'}
          title={soundEnabled ? 'Mute plane sound' : 'Play plane sound'}
          className="pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#F97316]/30 bg-[#0A180E]/90 px-2.5 text-[11px] font-medium text-[#D6CBC0] transition-colors hover:border-[#F97316]/70 hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#F97316]" /> : <VolumeX className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline whitespace-nowrap">Plane Sound</span>
        </button>
      </div>

      {shouldReduceMotion ? (
        <div className="flex h-full w-full items-center justify-center px-4">
          {planeAndBanner}
        </div>
      ) : (
        <motion.div
          initial={{ x: '-520px' }}
          animate={{ x: 'calc(100vw + 120px)' }}
          transition={{
            duration: 26,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/2 left-0 -translate-y-1/2 will-change-transform"
        >
          <motion.div
            animate={{ y: [0, -5, 0, 5, 0] }}
            transition={{
              duration: 5.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {planeAndBanner}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
