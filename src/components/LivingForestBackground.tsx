import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import sunlitForestImg from '../assets/images/sunlit_green_forest_1795439578096.jpg';

interface MovingLeaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  flutterPhase: number;
  flutterSpeed: number;
  swayPhase: number;
  color: string;
  veinColor: string;
  alpha: number;
  depth: number;
}

interface SunMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  pulseSpeed: number;
  depth: number;
}

interface MistWisp {
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  alpha: number;
}

const LEAF_PALETTES = [
  { color: '#22C55E', vein: '#86EFAC' },
  { color: '#16A34A', vein: '#4ADE80' },
  { color: '#4ADE80', vein: '#DCFCE7' },
  { color: '#15803D', vein: '#4ADE80' },
  { color: '#65A30D', vein: '#BEF264' },
];

function createGlowSprite(innerColor: string, midColor: string): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = 64;
  sprite.height = 64;
  const sCtx = sprite.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.35, midColor);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
  }
  return sprite;
}

export const LivingForestBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll();
  const farForestY = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);
  const farForestScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.13]);
  const sunbeamY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const nearFoliageY = useTransform(scrollYProgress, [0, 1], ['4%', '-16%']);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rafId: number | null = null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.25);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    // Pre-bake sprites once (zero per-frame gradient allocation)
    const sunMoteSprite = createGlowSprite(
      'rgba(255, 251, 224, 0.95)',
      'rgba(250, 224, 120, 0.35)'
    );
    const mistSprite = createGlowSprite(
      'rgba(214, 248, 220, 0.4)',
      'rgba(134, 239, 172, 0.14)'
    );

    const leafCount = width < 640 ? 14 : 24;
    const leaves: MovingLeaf[] = Array.from({ length: leafCount }, () => {
      const palette = LEAF_PALETTES[Math.floor(Math.random() * LEAF_PALETTES.length)];
      const depth = 0.4 + Math.random() * 0.6;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (0.45 + Math.random() * 0.7) * depth,
        vy: (0.42 + Math.random() * 0.55) * depth,
        size: 6 + Math.random() * 6.5 * depth,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.032,
        flutterPhase: Math.random() * Math.PI * 2,
        flutterSpeed: 2.0 + Math.random() * 2.2,
        swayPhase: Math.random() * Math.PI * 2,
        color: palette.color,
        veinColor: palette.vein,
        alpha: 0.42 + depth * 0.4,
        depth,
      };
    });

    const moteCount = width < 640 ? 16 : 28;
    const motes: SunMote[] = Array.from({ length: moteCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.35) * 0.16,
      vy: -0.06 - Math.random() * 0.14,
      size: 10 + Math.random() * 14,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 1.0 + Math.random() * 1.4,
      depth: 0.35 + Math.random() * 0.65,
    }));

    const mistCount = width < 640 ? 3 : 5;
    const mists: MistWisp[] = Array.from({ length: mistCount }, (_, i) => ({
      x: (i / mistCount) * width * 1.25 - width * 0.1,
      y: height * (0.46 + Math.random() * 0.42),
      vx: 0.14 + Math.random() * 0.16,
      w: 320 + Math.random() * 260,
      h: 95 + Math.random() * 70,
      alpha: 0.08 + Math.random() * 0.07,
    }));

    let lastTime = performance.now();
    let elapsed = 0;

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      ctx.clearRect(0, 0, width, height);
      const scrollParallax = window.scrollY;
      const reduced = motionQuery.matches;

      // 1. Soft sunlit morning mist wisps
      for (let i = 0; i < mists.length; i++) {
        const m = mists[i];
        if (!reduced) {
          m.x += m.vx * dt * 22;
          if (m.x - m.w * 0.5 > width + 60) {
            m.x = -m.w * 0.5 - 60;
          }
        }
        const drawY = m.y - ((scrollParallax * 0.05) % (height * 0.4));
        ctx.globalAlpha = m.alpha;
        ctx.drawImage(mistSprite, m.x - m.w * 0.5, drawY - m.h * 0.5, m.w, m.h);
      }

      // 2. Warm sunlit dust motes drifting through canopy rays
      for (let i = 0; i < motes.length; i++) {
        const mote = motes[i];
        if (!reduced) {
          mote.x += (mote.vx + Math.sin(elapsed * 0.7 + mote.phase) * 0.12) * dt * 32;
          mote.y += mote.vy * dt * 30;
          if (mote.y < -20) mote.y = height + 20;
          if (mote.x < -20) mote.x = width + 20;
          if (mote.x > width + 20) mote.x = -20;
        }
        const drawY =
          (((mote.y - scrollParallax * (0.04 + mote.depth * 0.09)) % (height + 40)) +
            (height + 40)) %
            (height + 40) -
          20;
        const pulse = 0.45 + 0.55 * Math.sin(elapsed * mote.pulseSpeed + mote.phase);
        ctx.globalAlpha = 0.25 + pulse * 0.5;
        const s = mote.size * (0.85 + pulse * 0.25);
        ctx.drawImage(sunMoteSprite, mote.x - s * 0.5, drawY - s * 0.5, s, s);
      }

      // 3. Moving green botanical leaves in the sunlight breeze
      const windGust = 1 + Math.sin(elapsed * 0.6) * 0.28;
      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        if (!reduced) {
          leaf.swayPhase += dt * 1.8;
          leaf.flutterPhase += dt * leaf.flutterSpeed;
          leaf.x += (leaf.vx * windGust + Math.sin(leaf.swayPhase) * 0.42) * dt * 34;
          leaf.y += (leaf.vy + Math.cos(leaf.swayPhase * 0.8) * 0.16) * dt * 30;
          leaf.rotation += leaf.rotSpeed * windGust;

          if (leaf.y > height + 30 || leaf.x > width + 40) {
            if (Math.random() < 0.65) {
              leaf.x = Math.random() * width * 0.95;
              leaf.y = -24 - Math.random() * 40;
            } else {
              leaf.x = -24 - Math.random() * 40;
              leaf.y = Math.random() * height * 0.75;
            }
          }
        }

        const drawY =
          (((leaf.y - scrollParallax * (0.05 + leaf.depth * 0.11)) % (height + 60)) +
            (height + 60)) %
            (height + 60) -
          30;
        const flutterScale = 0.44 + 0.56 * Math.abs(Math.cos(leaf.flutterPhase));

        ctx.save();
        ctx.translate(leaf.x, drawY);
        ctx.rotate(leaf.rotation);
        ctx.scale(1, flutterScale);
        ctx.globalAlpha = leaf.alpha;

        const s = leaf.size;
        ctx.fillStyle = leaf.color;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.quadraticCurveTo(-s * 0.2, -s * 0.6, s, 0);
        ctx.quadraticCurveTo(-s * 0.2, s * 0.6, -s, 0);
        ctx.fill();

        ctx.strokeStyle = leaf.veinColor;
        ctx.lineWidth = Math.max(0.6, s * 0.08);
        ctx.beginPath();
        ctx.moveTo(-s * 0.82, 0);
        ctx.lineTo(s * 0.75, 0);
        ctx.stroke();

        ctx.restore();
      }

      ctx.globalAlpha = 1;

      if (!reduced && !document.hidden) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const startLoop = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (motionQuery.matches || document.hidden) {
        renderFrame(performance.now());
        return;
      }
      lastTime = performance.now();
      rafId = requestAnimationFrame(renderFrame);
    };

    startLoop();

    const handleVisibility = () => {
      if (document.hidden) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else {
        startLoop();
      }
    };

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
    motionQuery.addEventListener('change', startLoop);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionQuery.removeEventListener('change', startLoop);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#06160B]"
    >
      {/* Layer 1: Sunlit Lush Green Full Forest with Scroll Parallax & Gentle Canopy Sway */}
      <motion.div
        style={shouldReduceMotion ? undefined : { y: farForestY, scale: farForestScale }}
        className="absolute -inset-x-[4%] -top-[6%] -bottom-[14%] will-change-transform"
      >
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: ['-0.4%', '0.4%', '-0.4%'],
                }
          }
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="h-full w-full bg-gradient-to-b from-[#13381B] via-[#0B2311] to-[#06140A]"
        >
          <img
            src={sunlitForestImg}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-75 brightness-[0.84] saturate-[1.12]"
          />
        </motion.div>
      </motion.div>

      {/* Layer 2: Warm Golden Sunlight Rays Filtering Through Canopy */}
      <motion.div
        style={shouldReduceMotion ? undefined : { y: sunbeamY }}
        className="absolute -inset-x-[10%] -top-[15%] -bottom-[15%] will-change-transform"
      >
        <motion.div
          animate={
            shouldReduceMotion
              ? { opacity: 0.34 }
              : {
                  opacity: [0.26, 0.44, 0.26],
                  x: ['-1.2%', '1.2%', '-1.2%'],
                }
          }
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(circle at 76% 12%, rgba(254, 240, 138, 0.28) 0%, rgba(250, 204, 21, 0.12) 26%, transparent 56%), linear-gradient(128deg, transparent 34%, rgba(254, 243, 199, 0.13) 44%, rgba(253, 224, 71, 0.04) 51%, transparent 58%, rgba(254, 240, 138, 0.11) 66%, transparent 76%)',
          }}
        />
      </motion.div>

      {/* Layer 3: Swaying Green Foreground Fern Silhouettes */}
      <motion.div
        style={shouldReduceMotion ? undefined : { y: nearFoliageY }}
        className="absolute inset-x-0 -bottom-[10%] flex h-[28vh] justify-between opacity-65 will-change-transform"
      >
        <motion.svg
          viewBox="0 0 420 260"
          className="h-full w-[42vw] max-w-[440px] origin-bottom-left"
          animate={shouldReduceMotion ? undefined : { rotate: [-1.1, 1.1, -1.1] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M0,260 L0,90 C28,118 54,145 78,190 C92,135 122,95 162,65 C155,112 156,158 176,202 C202,155 244,122 292,102 C272,148 265,186 278,225 C312,188 352,172 396,165 C376,204 374,234 388,260 Z"
            fill="#071B0D"
          />
        </motion.svg>

        <motion.svg
          viewBox="0 0 420 260"
          className="h-full w-[42vw] max-w-[440px] origin-bottom-right"
          animate={shouldReduceMotion ? undefined : { rotate: [1.1, -1.1, 1.1] }}
          transition={{ duration: 8.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M420,260 L420,82 C392,115 362,148 338,194 C324,138 294,94 252,58 C260,108 258,156 238,204 C212,158 172,124 124,104 C144,150 152,188 140,226 C106,192 66,174 22,168 C42,205 44,234 32,260 Z"
            fill="#071B0D"
          />
        </motion.svg>
      </motion.div>

      {/* Layer 4: Smooth 60fps Moving Green Leaves, Sun Dust Motes & Morning Mist */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Layer 5: Measured Emerald-Obsidian Contrast Scrim keeping all foreground text & media legible */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_72%_at_50%_26%,rgba(5,20,10,0.28)_0%,rgba(5,18,9,0.58)_74%,rgba(4,14,7,0.82)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05150A]/45 via-[#06180B]/20 to-[#041208]/85" />
    </div>
  );
};
