import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { GalleryVideo } from '../types/video';

interface ReelsOrbitalCarousel3DProps {
  videos: GalleryVideo[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  isPlaying: boolean;
  isMuted: boolean;
  audioUnlocked: boolean;
  onTogglePlay: () => void;
  onTriggerFilePicker: () => void;
  onOpenLightbox: () => void;
  onFocusSection: () => void;
  isProcessing: boolean;
}

interface CardSize {
  width: number;
  height: number;
}

function computeCardSize(
  aspectRatio: number,
  maxWidth: number,
  maxHeight: number
): CardSize {
  const safeRatio = Number.isFinite(aspectRatio) && aspectRatio > 0.1 ? aspectRatio : 9 / 16;
  let height = maxHeight;
  let width = height * safeRatio;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / safeRatio;
  }

  const minHeight = 160;
  if (height < minHeight) {
    height = minHeight;
    width = Math.min(maxWidth, height * safeRatio);
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

export const ReelsOrbitalCarousel3D: React.FC<ReelsOrbitalCarousel3DProps> = ({
  videos,
  activeIndex,
  onActiveIndexChange,
  onFilesSelected,
  isPlaying,
  isMuted,
  audioUnlocked,
  onTogglePlay,
  onTriggerFilePicker,
  onOpenLightbox,
  onFocusSection,
  isProcessing,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState<number>(620);
  const [isDragOverFiles, setIsDragOverFiles] = useState(false);
  const [isPointerDragging, setIsPointerDragging] = useState(false);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const virtualIndexRef = useRef<number>(activeIndex);
  const targetIndexRef = useRef<number>(activeIndex);
  const activeIndexRef = useRef<number>(activeIndex);
  const rafRef = useRef<number | null>(null);
  const wakeLoopRef = useRef<() => void>(() => {});
  const reducedMotionRef = useRef<boolean>(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const onChange = () => {
      reducedMotionRef.current = mq.matches;
      wakeLoopRef.current();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const dragStateRef = useRef<{
    active: boolean;
    captured: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    lastX: number;
    lastTime: number;
    totalTravelX: number;
    totalTravelY: number;
    velocity: number;
    targetCardIndex: number | null;
  }>({
    active: false,
    captured: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    totalTravelX: 0,
    totalTravelY: 0,
    velocity: 0,
    targetCardIndex: null,
  });

  const wheelAccumRef = useRef<number>(0);
  const wheelTimeoutRef = useRef<number | null>(null);
  const boundaryTimeRef = useRef<number>(0);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateWidth = () => {
      setStageWidth(el.clientWidth || 620);
    };
    updateWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setStageWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(() => {
    if (stageWidth < 460) {
      return {
        maxWidth: Math.max(200, stageWidth * 0.72),
        maxHeight: 360,
      };
    }
    return {
      maxWidth: Math.min(480, stageWidth * 0.68),
      maxHeight: 460,
    };
  }, [stageWidth]);

  const cardSizes = useMemo(() => {
    return videos.map((v) => computeCardSize(v.aspectRatio, bounds.maxWidth, bounds.maxHeight));
  }, [videos, bounds]);

  const dynamicStageHeight = useMemo(() => {
    if (videos.length === 0) {
      return stageWidth < 460 ? 320 : 400;
    }
    const clampedIdx = Math.max(0, Math.min(videos.length - 1, activeIndex));
    const activeSize = cardSizes[clampedIdx];
    return Math.max(280, (activeSize?.height ?? 380) + 76);
  }, [videos.length, activeIndex, cardSizes, stageWidth]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (!dragStateRef.current.active) {
      targetIndexRef.current = activeIndex;
      wakeLoopRef.current();
    }
  }, [activeIndex]);

  useEffect(() => {
    if (videos.length === 0) {
      virtualIndexRef.current = 0;
      targetIndexRef.current = 0;
      return;
    }
    const maxIdx = videos.length - 1;
    virtualIndexRef.current = Math.max(0, Math.min(maxIdx, virtualIndexRef.current));
    targetIndexRef.current = Math.max(0, Math.min(maxIdx, targetIndexRef.current));
  }, [videos.length]);

  const paintTransforms = useCallback(() => {
    const count = videos.length;
    if (count === 0) return;

    const vIdx = virtualIndexRef.current;
    const radiusX = Math.max(120, Math.min(240, stageWidth * 0.34));
    const reducedMotion = reducedMotionRef.current;

    for (let i = 0; i < count; i++) {
      const video = videos[i];
      const el = cardRefs.current.get(video.id);
      if (!el) continue;

      const d = i - vIdx;
      const absD = Math.abs(d);
      const clampedAngle = Math.max(-2.1, Math.min(2.1, d * 0.68));

      const tx = Math.sin(clampedAngle) * radiusX;
      const ty = reducedMotion ? 0 : Math.min(48, absD * 14);
      const tz = reducedMotion ? -absD * 50 : (Math.cos(clampedAngle) - 1) * 260 - absD * 36;
      const rotateZ = reducedMotion ? 0 : Math.max(-18, Math.min(18, d * 6.5));
      const rotateX = reducedMotion ? 0 : -Math.min(18, absD * 6);
      const rotateY = reducedMotion ? 0 : Math.max(-28, Math.min(28, -d * 14));
      const scale = Math.max(0.68, 1 - absD * 0.12);
      const opacity = absD > 2.9 ? 0 : Math.max(0, 1 - Math.max(0, absD - 0.1) * 0.34);
      const zIndex = 100 - Math.round(absD * 14);

      el.style.transform = `translate3d(calc(-50% + ${tx.toFixed(2)}px), calc(-50% + ${ty.toFixed(
        2
      )}px), ${tz.toFixed(2)}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
        2
      )}deg) rotateZ(${rotateZ.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(zIndex);
      el.style.pointerEvents = absD > 2.4 ? 'none' : 'auto';
    }
  }, [videos, stageWidth]);

  useEffect(() => {
    if (videos.length === 0) return;

    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      rafRef.current = null;

      let settled = false;
      if (!dragStateRef.current.active) {
        const diff = targetIndexRef.current - virtualIndexRef.current;
        if (Math.abs(diff) > 0.001) {
          virtualIndexRef.current += diff * 0.16;
        } else {
          virtualIndexRef.current = targetIndexRef.current;
          settled = true;
        }
      }

      const nearest = Math.max(
        0,
        Math.min(videos.length - 1, Math.round(virtualIndexRef.current))
      );
      if (nearest !== activeIndexRef.current) {
        activeIndexRef.current = nearest;
        onActiveIndexChange(nearest);
      }

      paintTransforms();

      if (dragStateRef.current.active || !settled) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      if (!mounted) return;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    wakeLoopRef.current = wake;
    paintTransforms();
    wake();

    return () => {
      mounted = false;
      wakeLoopRef.current = () => {};
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [videos.length, paintTransforms, onActiveIndexChange]);

  useEffect(() => {
    videos.forEach((v, idx) => {
      const videoEl = videoRefs.current.get(v.id);
      if (!videoEl) return;

      const shouldPlay = idx === activeIndex && isPlaying;
      const shouldMute = isMuted || !audioUnlocked || !shouldPlay;
      videoEl.muted = shouldMute;
      videoEl.volume = 1;

      if (shouldPlay) {
        if (videoEl.paused) {
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              videoEl.muted = true;
              videoEl.play().catch(() => {});
            });
          }
        }
      } else {
        if (!videoEl.paused) {
          videoEl.pause();
        }
      }
    });
  }, [videos, activeIndex, isPlaying, isMuted, audioUnlocked]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (videos.length === 0) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    onFocusSection();

    const cardAttr = (e.target as HTMLElement).closest('[data-card-index]')?.getAttribute('data-card-index');
    const targetCardIndex = cardAttr !== null && cardAttr !== undefined ? Number(cardAttr) : null;

    dragStateRef.current = {
      active: true,
      captured: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastTime: performance.now(),
      totalTravelX: 0,
      totalTravelY: 0,
      velocity: 0,
      targetCardIndex,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId || videos.length === 0) return;

    const now = performance.now();
    const dx = e.clientX - drag.lastX;
    const dt = Math.max(8, now - drag.lastTime);

    drag.totalTravelX += Math.abs(dx);
    drag.totalTravelY = Math.max(drag.totalTravelY, Math.abs(e.clientY - drag.startY));
    drag.lastX = e.clientX;
    drag.lastTime = now;

    if (!drag.captured) {
      if (drag.totalTravelY > 8 && drag.totalTravelY > drag.totalTravelX) {
        drag.active = false;
        drag.pointerId = null;
        return;
      }
      if (drag.totalTravelX > 6 && drag.totalTravelX >= drag.totalTravelY) {
        drag.captured = true;
        setIsPointerDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        return;
      }
    }

    const approxSpacing = Math.max(160, stageWidth * 0.36);
    const indexDelta = -dx / approxSpacing;

    let nextVirtual = virtualIndexRef.current + indexDelta;
    const maxIdx = videos.length - 1;

    if (nextVirtual < 0) {
      nextVirtual = nextVirtual * 0.35;
    } else if (nextVirtual > maxIdx) {
      nextVirtual = maxIdx + (nextVirtual - maxIdx) * 0.35;
    }

    virtualIndexRef.current = nextVirtual;
    targetIndexRef.current = nextVirtual;
    drag.velocity = indexDelta / (dt / 16.67);
    wakeLoopRef.current();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const wasCaptured = drag.captured;
    drag.active = false;
    drag.captured = false;
    drag.pointerId = null;
    setIsPointerDragging(false);

    if (wasCaptured && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (videos.length === 0) return;
    const maxIdx = videos.length - 1;

    if (!wasCaptured && drag.totalTravelX < 7 && drag.totalTravelY < 7) {
      if (drag.targetCardIndex !== null) {
        if (drag.targetCardIndex === activeIndexRef.current) {
          onTogglePlay();
        } else {
          targetIndexRef.current = drag.targetCardIndex;
          onActiveIndexChange(drag.targetCardIndex);
        }
      }
      return;
    }

    if (wasCaptured) {
      const momentum = Math.max(-1.6, Math.min(1.6, drag.velocity * 4.5));
      const projected = Math.round(virtualIndexRef.current + momentum);
      const snapped = Math.max(0, Math.min(maxIdx, projected));

      targetIndexRef.current = snapped;
      onActiveIndexChange(snapped);
      wakeLoopRef.current();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const wasCaptured = drag.captured;
    drag.active = false;
    drag.captured = false;
    drag.pointerId = null;
    setIsPointerDragging(false);

    if (wasCaptured && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (videos.length > 0) {
      const snapped = Math.max(0, Math.min(videos.length - 1, Math.round(virtualIndexRef.current)));
      targetIndexRef.current = snapped;
      wakeLoopRef.current();
    }
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el || videos.length <= 1) return;

    const maxIdx = videos.length - 1;
    const onWheel = (e: WheelEvent) => {
      const multiplier = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 320 : 1;
      const dx = e.deltaX * multiplier;
      const dy = e.deltaY * multiplier;
      const isHorizontalIntent = Math.abs(dx) > Math.abs(dy) || e.shiftKey;
      const rawDelta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(rawDelta) < 0.5) return;

      const currentTarget = targetIndexRef.current;
      const movingForward = rawDelta > 0;
      const atBoundary =
        (movingForward && currentTarget >= maxIdx) ||
        (!movingForward && currentTarget <= 0);

      if (!isHorizontalIntent && atBoundary) {
        if (performance.now() - boundaryTimeRef.current < 260) {
          e.preventDefault();
        }
        return;
      }

      e.preventDefault();
      onFocusSection();
      wheelAccumRef.current += rawDelta;

      const threshold = 72;
      if (Math.abs(wheelAccumRef.current) >= threshold) {
        const step = wheelAccumRef.current > 0 ? 1 : -1;
        wheelAccumRef.current = 0;
        const next = Math.max(0, Math.min(maxIdx, targetIndexRef.current + step));
        if (next !== targetIndexRef.current) {
          targetIndexRef.current = next;
          onActiveIndexChange(next);
          wakeLoopRef.current();
          if (next === 0 || next === maxIdx) {
            boundaryTimeRef.current = performance.now();
          }
        }
      }

      if (wheelTimeoutRef.current) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = window.setTimeout(() => {
        wheelAccumRef.current = 0;
      }, 180);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelTimeoutRef.current) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [videos.length, onActiveIndexChange, onFocusSection]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (videos.length === 0) return;
    onFocusSection();
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(videos.length - 1, activeIndex + 1);
      targetIndexRef.current = next;
      onActiveIndexChange(next);
      wakeLoopRef.current();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      targetIndexRef.current = prev;
      onActiveIndexChange(prev);
      wakeLoopRef.current();
    } else if (e.key === ' ') {
      e.preventDefault();
      onTogglePlay();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!isDragOverFiles) setIsDragOverFiles(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverFiles(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverFiles(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="region"
      aria-label="My Reels and Edits 3D Orbital Carousel"
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ height: `${dynamicStageHeight}px`, touchAction: 'pan-y' }}
      className={`relative w-full overflow-hidden bg-transparent transition-[height] duration-300 ease-out focus-visible:outline-none select-none ${
        videos.length > 0 ? (isPointerDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      } ${isDragOverFiles ? 'opacity-90' : ''}`}
    >
      {videos.length === 0 ? (
        <div className="relative z-10 flex h-full w-full flex-col items-start justify-center px-1 text-left">
          <p className="max-w-sm text-sm leading-relaxed text-[#B6A99A]">
            {isDragOverFiles
              ? 'Drop your reels or edits here.'
              : 'Upload your vertical reels or short edits here. Frames auto-size to every video ratio.'}
          </p>
          <button
            type="button"
            onClick={onTriggerFilePicker}
            disabled={isProcessing}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2.5 text-xs font-semibold text-[#FFF7ED] transition-colors duration-150 hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0908] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            {isProcessing ? 'Loading...' : 'Upload Reels'}
          </button>
        </div>
      ) : (
        <div
          className="relative h-full w-full [mask-image:linear-gradient(to_right,transparent_0%,black_12%,black_88%,transparent_100%)]"
          style={{
            perspective: '1300px',
            transformStyle: 'preserve-3d',
          }}
        >
          {videos.map((video, idx) => {
            const dims = cardSizes[idx] || { width: 280, height: 380 };
            const isCenter = idx === activeIndex;

            return (
              <div
                key={video.id}
                data-card-index={idx}
                onDoubleClick={() => {
                  if (isCenter) onOpenLightbox();
                }}
                ref={(el) => {
                  if (el) {
                    cardRefs.current.set(video.id, el);
                  } else {
                    cardRefs.current.delete(video.id);
                  }
                }}
                style={{
                  width: `${dims.width}px`,
                  height: `${dims.height}px`,
                  left: '50%',
                  top: '50%',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity',
                }}
                className={`absolute overflow-hidden rounded-xl bg-black transition-shadow duration-200 ${
                  isCenter
                    ? 'shadow-[0_28px_70px_-16px_rgba(0,0,0,0.88),0_0_42px_-12px_rgba(234,88,12,0.38)]'
                    : 'shadow-[0_18px_45px_-14px_rgba(0,0,0,0.8)]'
                }`}
              >
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs.current.set(video.id, el);
                    } else {
                      videoRefs.current.delete(video.id);
                    }
                  }}
                  src={video.objectUrl}
                  playsInline
                  loop
                  muted={isMuted || !audioUnlocked || !isCenter || !isPlaying}
                  preload="metadata"
                  draggable={false}
                  className="pointer-events-none block h-full w-full object-contain bg-black"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
