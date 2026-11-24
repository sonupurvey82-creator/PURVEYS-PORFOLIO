import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { GalleryImage } from '../types/image';

interface ImageMarqueeSectionProps {
  images: GalleryImage[];
  onFilesSelected: (files: FileList | File[]) => void;
  onTriggerFilePicker: () => void;
  onUpdateImageInfo: (id: string, updates: { title: string; description: string }) => Promise<void>;
  onDeleteImage: (id: string) => Promise<void>;
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
  const safeRatio = Number.isFinite(aspectRatio) && aspectRatio > 0.1 ? aspectRatio : 4 / 3;
  let height = maxHeight;
  let width = height * safeRatio;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / safeRatio;
  }

  const minHeight = 110;
  if (height < minHeight) {
    height = minHeight;
    width = Math.min(maxWidth, height * safeRatio);
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

export const ImageMarqueeSection: React.FC<ImageMarqueeSectionProps> = ({
  images,
  onFilesSelected,
  onTriggerFilePicker,
  onUpdateImageInfo,
  onDeleteImage,
  isProcessing,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState<number>(1200);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isDragOverFiles, setIsDragOverFiles] = useState<boolean>(false);
  const [isPointerDragging, setIsPointerDragging] = useState<boolean>(false);
  const [isStageInView, setIsStageInView] = useState<boolean>(false);
  const [showTitlesOnScroll, setShowTitlesOnScroll] = useState<boolean>(true);
  const lastScrollYRef = useRef<number>(0);
  const touchStartYRef = useRef<number | null>(null);

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftDescription, setDraftDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const virtualIndexRef = useRef<number>(0);
  const targetIndexRef = useRef<number>(0);
  const activeIndexRef = useRef<number>(0);
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

  const selectedImage = useMemo(
    () => images.find((img) => img.id === selectedImageId) ?? null,
    [images, selectedImageId]
  );

  useEffect(() => {
    if (selectedImageId && !selectedImage) {
      setSelectedImageId(null);
      setIsEditing(false);
    }
  }, [selectedImageId, selectedImage]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateWidth = () => setStageWidth(el.clientWidth || 1200);
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

  // Observe whether this 3D section is in the viewport
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsStageInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsStageInView(entry.isIntersecting);
        }
      },
      { threshold: 0.14 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reveal titles from under the image on scroll down; fade out back under the image on scroll up
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      if (delta > 3) {
        setShowTitlesOnScroll(true);
      } else if (delta < -3) {
        setShowTitlesOnScroll(false);
      }

      lastScrollYRef.current = currentY;
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.defaultPrevented) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.shiftKey) return;
      if (e.deltaY > 5) {
        setShowTitlesOnScroll(true);
      } else if (e.deltaY < -5) {
        setShowTitlesOnScroll(false);
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
      if (delta > 10) {
        setShowTitlesOnScroll(true);
        touchStartYRef.current = currentY;
      } else if (delta < -10) {
        setShowTitlesOnScroll(false);
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

  const bounds = useMemo(() => {
    if (stageWidth < 640) {
      return {
        maxWidth: Math.min(240, Math.max(160, stageWidth - 110)),
        maxHeight: 180,
      };
    }
    if (stageWidth < 1024) {
      return {
        maxWidth: Math.min(320, stageWidth * 0.4),
        maxHeight: 220,
      };
    }
    return {
      maxWidth: Math.min(370, stageWidth * 0.34),
      maxHeight: 245,
    };
  }, [stageWidth]);

  const cardSizes = useMemo(() => {
    return images.map((img) => computeCardSize(img.aspectRatio, bounds.maxWidth, bounds.maxHeight));
  }, [images, bounds]);

  const cardGap = stageWidth < 640 ? 18 : 28;

  const baseCenters = useMemo(() => {
    if (cardSizes.length === 0) return [];
    const centers: number[] = [0];
    for (let i = 1; i < cardSizes.length; i++) {
      const prevHalf = cardSizes[i - 1].width * 0.5;
      const currHalf = cardSizes[i].width * 0.5;
      centers.push(centers[i - 1] + prevHalf + currHalf + cardGap);
    }
    return centers;
  }, [cardSizes, cardGap]);

  const maxSnapIndex = useMemo(() => {
    return images.length >= 2 ? images.length - 2 : 0;
  }, [images.length]);

  const dynamicStageHeight = useMemo(() => {
    if (images.length === 0) {
      return 190;
    }
    const clampedIdx = Math.max(0, Math.min(images.length - 1, activeIndex));
    const activeH = cardSizes[clampedIdx]?.height ?? 200;
    return Math.max(250, activeH + 104);
  }, [images.length, activeIndex, cardSizes]);

  useEffect(() => {
    if (images.length === 0) {
      virtualIndexRef.current = 0;
      targetIndexRef.current = 0;
      activeIndexRef.current = 0;
      setActiveIndex(0);
      return;
    }
    virtualIndexRef.current = Math.max(0, Math.min(maxSnapIndex, virtualIndexRef.current));
    targetIndexRef.current = Math.max(0, Math.min(maxSnapIndex, targetIndexRef.current));
    if (activeIndexRef.current > maxSnapIndex) {
      activeIndexRef.current = maxSnapIndex;
      setActiveIndex(maxSnapIndex);
    }
  }, [images.length, maxSnapIndex]);

  const paintTransforms = useCallback(() => {
    const count = images.length;
    if (count === 0 || baseCenters.length !== count) return;

    const vIdx = virtualIndexRef.current;
    const pivotIdx = count >= 2 ? vIdx + 0.5 : vIdx;
    const clampedPivot = Math.max(0, Math.min(count - 1, pivotIdx));
    const lowIdx = Math.floor(clampedPivot);
    const highIdx = Math.min(count - 1, lowIdx + 1);
    const frac = clampedPivot - lowIdx;

    let focalCenter = baseCenters[lowIdx] + (baseCenters[highIdx] - baseCenters[lowIdx]) * frac;

    if (vIdx < 0) {
      focalCenter += vIdx * (cardSizes[0]?.width ?? 220) * 0.6;
    } else if (vIdx > maxSnapIndex) {
      focalCenter += (vIdx - maxSnapIndex) * (cardSizes[count - 1]?.width ?? 220) * 0.6;
    }

    const reducedMotion = reducedMotionRef.current;
    const halfSpan = count >= 2 ? 0.5 : 0;

    for (let i = 0; i < count; i++) {
      const img = images[i];
      const el = cardRefs.current.get(img.id);
      if (!el) continue;

      const d = i - pivotIdx;
      const absD = Math.abs(d);
      const edgeDist = Math.max(0, absD - halfSpan);

      const tx = baseCenters[i] - focalCenter;
      const tz = reducedMotion ? -edgeDist * 50 : -Math.min(460, edgeDist * 195);
      const ty = reducedMotion ? 0 : Math.min(26, edgeDist * edgeDist * 8);
      const rotateY = reducedMotion ? 0 : Math.max(-44, Math.min(44, d * (edgeDist < 0.05 ? 6 : 22)));
      const scale = Math.max(0.72, 1 - edgeDist * 0.12);
      const opacity = edgeDist > 2.4 ? 0 : Math.max(0, 1 - edgeDist * 0.34);
      const zIndex = 100 - Math.round(edgeDist * 14);

      el.style.transform = `translate3d(calc(-50% + ${tx.toFixed(2)}px), calc(-50% - ${(
        ty + 18
      ).toFixed(2)}px), ${tz.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(
        4
      )})`;
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(zIndex);
      el.style.pointerEvents = edgeDist > 2 ? 'none' : 'auto';
    }
  }, [images, baseCenters, cardSizes, maxSnapIndex]);

  useEffect(() => {
    if (images.length === 0) return;

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
        Math.min(maxSnapIndex, Math.round(virtualIndexRef.current))
      );
      if (nearest !== activeIndexRef.current) {
        activeIndexRef.current = nearest;
        setActiveIndex(nearest);
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
  }, [images.length, maxSnapIndex, paintTransforms]);

  useEffect(() => {
    if (!selectedImageId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImageId(null);
        setIsEditing(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedImageId]);

  const openModalForImage = (img: GalleryImage) => {
    setSelectedImageId(img.id);
    setDraftTitle(img.title);
    setDraftDescription(img.description);
    setIsEditing(false);
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return;
    setIsSaving(true);
    try {
      await onUpdateImageInfo(selectedImage.id, {
        title: draftTitle.trim() || selectedImage.name,
        description: draftDescription.trim(),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (selectedImageId === id) {
      setSelectedImageId(null);
      setIsEditing(false);
    }
    await onDeleteImage(id);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (images.length === 0) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('[data-delete-btn="true"]')) return;

    const cardAttr = (e.target as HTMLElement)
      .closest('[data-image-index]')
      ?.getAttribute('data-image-index');
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
    if (!drag.active || drag.pointerId !== e.pointerId || images.length === 0) return;

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

    const approxSpacing = stageWidth < 640 ? 180 : 280;
    const indexDelta = -dx / approxSpacing;

    let nextVirtual = virtualIndexRef.current + indexDelta;

    if (nextVirtual < 0) {
      nextVirtual = nextVirtual * 0.35;
    } else if (nextVirtual > maxSnapIndex) {
      nextVirtual = maxSnapIndex + (nextVirtual - maxSnapIndex) * 0.35;
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

    if (images.length === 0) return;

    if (!wasCaptured && drag.totalTravelX < 7 && drag.totalTravelY < 7) {
      if (drag.targetCardIndex !== null && images[drag.targetCardIndex]) {
        if (drag.targetCardIndex !== activeIndex) {
          const targetIdx = Math.max(0, Math.min(maxSnapIndex, drag.targetCardIndex));
          targetIndexRef.current = targetIdx;
          setActiveIndex(targetIdx);
          setShowTitlesOnScroll(true);
          wakeLoopRef.current();
        }
        openModalForImage(images[drag.targetCardIndex]);
      }
      return;
    }

    if (wasCaptured) {
      const momentum = Math.max(-1.6, Math.min(1.6, drag.velocity * 4.5));
      const projected = Math.round(virtualIndexRef.current + momentum);
      const snapped = Math.max(0, Math.min(maxSnapIndex, projected));

      targetIndexRef.current = snapped;
      setActiveIndex(snapped);
      setShowTitlesOnScroll(true);
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

    if (images.length > 0) {
      targetIndexRef.current = Math.max(
        0,
        Math.min(maxSnapIndex, Math.round(virtualIndexRef.current))
      );
      wakeLoopRef.current();
    }
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el || maxSnapIndex <= 0) return;

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
        (movingForward && currentTarget >= maxSnapIndex) ||
        (!movingForward && currentTarget <= 0);

      if (!isHorizontalIntent && atBoundary) {
        // Brief grace window prevents momentum from immediately scrolling the page on arrival at first/last card
        if (performance.now() - boundaryTimeRef.current < 260) {
          e.preventDefault();
        }
        return;
      }

      e.preventDefault();
      wheelAccumRef.current += rawDelta;

      const threshold = 72;
      if (Math.abs(wheelAccumRef.current) >= threshold) {
        const step = wheelAccumRef.current > 0 ? 1 : -1;
        wheelAccumRef.current = 0;
        const next = Math.max(0, Math.min(maxSnapIndex, targetIndexRef.current + step));
        if (next !== targetIndexRef.current) {
          targetIndexRef.current = next;
          setActiveIndex(next);
          setShowTitlesOnScroll(true);
          wakeLoopRef.current();
          if (next === 0 || next === maxSnapIndex) {
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
  }, [images.length, maxSnapIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (images.length === 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(maxSnapIndex, activeIndex + 1);
      targetIndexRef.current = next;
      setActiveIndex(next);
      setShowTitlesOnScroll(true);
      wakeLoopRef.current();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      targetIndexRef.current = prev;
      setActiveIndex(prev);
      setShowTitlesOnScroll(true);
      wakeLoopRef.current();
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
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-2 pb-10 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[#FAF6F0] sm:text-2xl">
          Engine Used by Me
        </h2>
        <button
          type="button"
          onClick={onTriggerFilePicker}
          disabled={isProcessing}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F97316]/40 bg-[#1B130E]/85 px-3.5 text-xs font-semibold text-[#FDBA74] transition-colors duration-150 hover:border-[#F97316] hover:bg-[#EA580C] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{isProcessing ? 'Adding...' : 'Upload Images'}</span>
        </button>
      </div>

      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-label="Engine Used by Me 3D Curved Carousel"
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
          images.length > 0 ? (isPointerDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        } ${isDragOverFiles ? 'opacity-90' : ''}`}
      >
        {images.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center px-4 text-center">
            <p className="max-w-md text-sm leading-relaxed text-[#B6A99A]">
              {isDragOverFiles
                ? 'Drop your images here.'
                : 'Upload images of the engines and tools you use. Drag horizontally for 3D browsing and click any curved box to write or read details.'}
            </p>
            <button
              type="button"
              onClick={onTriggerFilePicker}
              disabled={isProcessing}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2.5 text-xs font-semibold text-[#FFF7ED] transition-colors duration-150 hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0908] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              {isProcessing ? 'Loading...' : 'Upload from Gallery'}
            </button>
          </div>
        ) : (
          <div
            className="relative h-full w-full [mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]"
            style={{
              perspective: '1400px',
              transformStyle: 'preserve-3d',
            }}
          >
            {images.map((img, idx) => {
              const dims = cardSizes[idx] || { width: 320, height: 240 };
              const isCentered =
                idx === activeIndex || (images.length >= 2 && idx === activeIndex + 1);
              const isTitleVisible = isCentered && showTitlesOnScroll && isStageInView;

              return (
                <div
                  key={img.id}
                  data-image-index={idx}
                  ref={(el) => {
                    if (el) {
                      cardRefs.current.set(img.id, el);
                    } else {
                      cardRefs.current.delete(img.id);
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
                  className="group absolute"
                >
                  {/* Curved Image Box sitting visually on top (z-10) */}
                  <div
                    className={`relative z-10 h-full w-full overflow-hidden rounded-[28px] border bg-[#0E0B09] transition-[box-shadow,border-color] duration-200 ${
                      isCentered
                        ? 'border-[#F97316]/60 shadow-[0_28px_70px_-16px_rgba(0,0,0,0.9),0_0_42px_-12px_rgba(234,88,12,0.38)]'
                        : 'border-white/15 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)]'
                    }`}
                  >
                    <img
                      src={img.objectUrl}
                      alt={img.title}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="pointer-events-none block h-full w-full rounded-[28px] object-cover"
                    />

                    <button
                      type="button"
                      data-delete-btn="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img.id);
                      }}
                      aria-label={`Delete ${img.title}`}
                      title="Delete image"
                      className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#0B0908]/85 text-[#FAF6F0] opacity-0 backdrop-blur-sm transition-all duration-150 hover:border-red-500/60 hover:bg-red-600 hover:text-white group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Larger Title Drawer emerging from under the single centered image box, fading back under on scroll up */}
                  <div
                    aria-hidden={!isTitleVisible}
                    className="pointer-events-none absolute top-[calc(100%-8px)] -right-10 -left-10 z-0 overflow-hidden pt-5 pb-2"
                  >
                    <motion.div
                      initial={false}
                      animate={
                        shouldReduceMotion
                          ? { opacity: isTitleVisible ? 1 : 0 }
                          : {
                              opacity: isTitleVisible ? 1 : 0,
                              y: isTitleVisible ? 0 : -30,
                              scale: isTitleVisible ? 1 : 0.94,
                            }
                      }
                      transition={{
                        duration: isTitleVisible ? 0.42 : 0.28,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="px-2 text-center"
                    >
                      <p className="truncate font-display text-lg font-semibold tracking-tight text-[#FAF6F0] sm:text-xl md:text-2xl [text-shadow:0_2px_14px_rgba(0,0,0,0.92)]">
                        {img.title}
                      </p>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Detail & Information Modal (Portaled to document.body so parallax transforms never offset fixed positioning) */}
      {selectedImage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedImage.title}
            onClick={() => {
              setSelectedImageId(null);
              setIsEditing(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#06110A]/88 p-4 backdrop-blur-sm sm:p-8"
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#F97316]/25 bg-[#140F0C] shadow-2xl md:flex-row"
          >
            <button
              type="button"
              onClick={() => {
                setSelectedImageId(null);
                setIsEditing(false);
              }}
              aria-label="Close modal"
              className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#1B1410]/90 text-[#FAF6F0] transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex max-h-[45vh] w-full items-center justify-center bg-black p-4 md:max-h-[82vh] md:w-1/2">
              <img
                src={selectedImage.objectUrl}
                alt={selectedImage.title}
                referrerPolicy="no-referrer"
                style={{ aspectRatio: `${selectedImage.width} / ${selectedImage.height}` }}
                className="max-h-full max-w-full rounded-2xl object-contain"
              />
            </div>

            <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6 md:p-7">
              {isEditing ? (
                <form onSubmit={handleSaveInfo} className="flex flex-1 flex-col justify-between gap-5">
                  <div className="space-y-4 pt-2 md:pt-4">
                    <div>
                      <label
                        htmlFor="engine-title-input"
                        className="block text-xs font-medium text-[#B6A99A] mb-1.5"
                      >
                        Title
                      </label>
                      <input
                        id="engine-title-input"
                        type="text"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        placeholder="Engine or tool name"
                        className="w-full rounded-xl border border-[#F97316]/30 bg-[#0B0908] px-3.5 py-2.5 text-sm text-[#FAF6F0] placeholder-[#6B5F52] focus:border-[#F97316] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="engine-info-textarea"
                        className="block text-xs font-medium text-[#B6A99A] mb-1.5"
                      >
                        Information
                      </label>
                      <textarea
                        id="engine-info-textarea"
                        rows={6}
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        placeholder="Write details about how you use this engine, your workflow, or specifications..."
                        className="w-full resize-none rounded-xl border border-[#F97316]/30 bg-[#0B0908] px-3.5 py-2.5 text-sm leading-relaxed text-[#FAF6F0] placeholder-[#6B5F52] focus:border-[#F97316] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftTitle(selectedImage.title);
                        setDraftDescription(selectedImage.description);
                        setIsEditing(false);
                      }}
                      className="inline-flex h-10 items-center rounded-xl border border-white/15 bg-[#1C1511] px-4 text-xs font-medium text-[#D6CBC0] transition-colors hover:border-white/30 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#EA580C] px-4 text-xs font-semibold text-[#FFF7ED] transition-colors hover:bg-[#F97316] disabled:opacity-60 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isSaving ? 'Saving...' : 'Save Info'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="pr-10 pt-1">
                    <h3 className="font-display text-xl font-semibold tracking-tight text-[#FAF6F0] sm:text-2xl">
                      {selectedImage.title}
                    </h3>
                    <div className="mt-4">
                      {selectedImage.description ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#D6CBC0]">
                          {selectedImage.description}
                        </p>
                      ) : (
                        <p className="text-sm text-[#8C7F70]">
                          No information written yet. Click &ldquo;Write Info&rdquo; below to add your notes.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedImage.id)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Image
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDraftTitle(selectedImage.title);
                        setDraftDescription(selectedImage.description);
                        setIsEditing(true);
                      }}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#EA580C] px-4 text-xs font-semibold text-[#FFF7ED] transition-colors hover:bg-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {selectedImage.description ? 'Edit Info' : 'Write Info'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
