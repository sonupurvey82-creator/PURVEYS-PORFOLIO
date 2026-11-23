import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import tigerAmbientMp4 from '../assets/videos/tiger-ambient.mp4';

export const BackgroundVideoLoop: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.4,
  });

  // Distant horizon video layer drifts slowly upward as user scrolls down
  const videoY = useTransform(smoothProgress, [0, 1], ['0%', '-10%']);
  const videoScale = useTransform(smoothProgress, [0, 1], [1.06, 1.15]);

  // Mid-depth warm tiger-amber atmospheric glow drifts at a faster parallax rate
  const glowY = useTransform(smoothProgress, [0, 1], ['4%', '-20%']);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPlayback = () => {
      if (motionQuery.matches) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    syncPlayback();
    motionQuery.addEventListener('change', syncPlayback);
    return () => motionQuery.removeEventListener('change', syncPlayback);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0B0908]"
    >
      {/* Parallax Video Layer with vertical overscan so edges never expose */}
      <motion.div
        style={shouldReduceMotion ? undefined : { y: videoY, scale: videoScale }}
        className="absolute -inset-x-[4%] -top-[6%] -bottom-[14%] will-change-transform"
      >
        <video
          ref={videoRef}
          src={tigerAmbientMp4}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover opacity-35"
        />
      </motion.div>

      {/* Mid-layer Parallax Warm Amber Depth Glow */}
      <motion.div
        style={shouldReduceMotion ? undefined : { y: glowY }}
        className="absolute -inset-x-[10%] -top-[10%] -bottom-[25%] bg-[radial-gradient(circle_at_52%_28%,rgba(234,88,12,0.14)_0%,rgba(234,88,12,0.03)_36%,transparent_64%)] will-change-transform"
      />

      {/* Measured obsidian scrim preserving WCAG contrast over the subtle tiger loop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_50%_22%,rgba(11,9,8,0.28)_0%,rgba(11,9,8,0.82)_70%,rgba(11,9,8,0.96)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0908]/55 via-transparent to-[#0B0908]/90" />
    </div>
  );
};
