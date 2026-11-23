import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const ExperienceShowcase: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const lastScrollYRef = useRef<number>(0);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      if (currentY <= 4) {
        setIsVisible(true);
      } else if (delta > 3) {
        setIsVisible(false);
      } else if (delta < -3) {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentY;
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.shiftKey) return;
      if (e.deltaY > 6) {
        setIsVisible(false);
      } else if (e.deltaY < -6) {
        setIsVisible(true);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartYRef.current === null || e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const delta = touchStartYRef.current - currentY;
      if (delta > 12) {
        setIsVisible(false);
        touchStartYRef.current = currentY;
      } else if (delta < -12) {
        setIsVisible(true);
        touchStartYRef.current = currentY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div
      style={{ perspective: '900px' }}
      className="flex flex-col items-center justify-center text-center py-8 md:py-0 select-none overflow-hidden"
    >
      {/* Top line: horizontal slide-in/out spring animation with '=' prefix */}
      <motion.div
        initial={false}
        animate={
          shouldReduceMotion
            ? { opacity: isVisible ? 1 : 0 }
            : {
                opacity: isVisible ? 1 : 0,
                x: isVisible ? 0 : -44,
                rotateZ: isVisible ? 0 : -2.5,
              }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0.25 }
            : {
                type: 'spring',
                stiffness: 190,
                damping: 22,
                mass: 0.85,
              }
        }
        className="flex items-baseline justify-center gap-2.5 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl leading-none"
      >
        <motion.span
          animate={
            shouldReduceMotion
              ? { opacity: isVisible ? 1 : 0 }
              : {
                  scale: isVisible ? 1 : 0.65,
                  rotate: isVisible ? 0 : -20,
                  opacity: isVisible ? 1 : 0,
                }
          }
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="text-[#FAF6F0]/85"
        >
          +
        </motion.span>
        <span className="text-[#F97316]">2 Years</span>
      </motion.div>

      {/* Bottom line: distinct 3D tilt + depth scale reveal animation */}
      <motion.span
        initial={false}
        animate={
          shouldReduceMotion
            ? { opacity: isVisible ? 1 : 0 }
            : {
                opacity: isVisible ? 1 : 0,
                y: isVisible ? 0 : 28,
                rotateX: isVisible ? 0 : 48,
                scale: isVisible ? 1 : 0.9,
              }
        }
        transition={{
          duration: 0.52,
          delay: isVisible ? 0.08 : 0,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{ transformOrigin: '50% 100%', transformStyle: 'preserve-3d' }}
        className="mt-2 font-display text-5xl font-bold tracking-tight text-[#FAF6F0] sm:text-6xl lg:text-7xl leading-none"
      >
        Experience
      </motion.span>
    </div>
  );
};
