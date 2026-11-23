import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ParallaxLayer } from './ParallaxLayer';

export const HeroIntroShowcase: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      aria-label="Sonu Purvey"
      className="mx-auto w-full max-w-[1440px] px-4 pt-8 pb-6 sm:px-6 lg:pt-12 lg:pb-8"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-6 sm:gap-12 md:gap-16">
        {/* Left: Animated "Sonu Purvey" */}
        <ParallaxLayer offset={10} className="min-w-0">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -32 }}
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, x: 0 }
            }
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 20,
              mass: 0.8,
            }}
            whileHover={shouldReduceMotion ? undefined : { x: 4, scale: 1.02 }}
            className="will-change-transform"
          >
            <motion.h1
              animate={
                shouldReduceMotion
                  ? undefined
                  : { y: [0, -4, 0] }
              }
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: 4.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
              className="font-display text-3xl font-bold tracking-tight text-[#FAF6F0] sm:text-5xl md:text-6xl lg:text-7xl [text-wrap:balance] [text-shadow:0_4px_24px_rgba(0,0,0,0.6)]"
            >
              <motion.span
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 210,
                  damping: 18,
                  delay: 0.05,
                }}
                className="inline-block text-[#FF6B00]"
              >
                Sonu
              </motion.span>{' '}
              <motion.span
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 19,
                  delay: 0.14,
                }}
                className="inline-block"
              >
                Purvey
              </motion.span>
            </motion.h1>
          </motion.div>
        </ParallaxLayer>

        {/* Right: Animated Circular Tiger Portrait */}
        <ParallaxLayer offset={20} className="shrink-0">
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 0, scale: 0.72, rotate: -10 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, rotate: 0 }
            }
            transition={{
              type: 'spring',
              stiffness: 210,
              damping: 16,
              mass: 0.85,
              delay: 0.1,
            }}
            whileHover={
              shouldReduceMotion
                ? undefined
                : { scale: 1.07, rotate: 3 }
            }
            whileTap={
              shouldReduceMotion
                ? undefined
                : { scale: 0.96, rotate: -3 }
            }
            className="relative will-change-transform cursor-pointer"
          >
            {/* Subtle breathing cosmic-orange aura ring (compositor transform + opacity only) */}
            {!shouldReduceMotion && (
              <motion.span
                aria-hidden="true"
                animate={{
                  scale: [1, 1.07, 1],
                  opacity: [0.32, 0.68, 0.32],
                }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="pointer-events-none absolute -inset-1.5 rounded-full border border-[#FF6B00]/55"
              />
            )}

            <motion.div
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: [0, -7, 0],
                      rotate: [-1.5, 1.5, -1.5],
                    }
              }
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      duration: 5.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
              className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#FF6B00]/65 bg-[#1B130E] shadow-[0_24px_60px_-14px_rgba(0,0,0,0.85),0_0_42px_-10px_rgba(255,107,0,0.42)] sm:h-36 sm:w-36 md:h-44 md:w-44 lg:h-52 lg:w-52"
            >
              <img
                src="/assets/aistudio/63cd9e8a-889e-4af6-a583-da515677f63c_6ede8ecc.png"
                alt="Sonu Purvey"
                referrerPolicy="no-referrer"
                draggable={false}
                className="h-full w-full object-cover"
              />
            </motion.div>
          </motion.div>
        </ParallaxLayer>
      </div>
    </section>
  );
};
