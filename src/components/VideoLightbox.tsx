import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryVideo } from '../types/video';
import { formatDuration } from '../utils/videoStorage';

interface VideoLightboxProps {
  video: GalleryVideo | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export const VideoLightbox: React.FC<VideoLightboxProps> = ({
  video,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) => {
  useEffect(() => {
    if (!video) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [video, onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!video) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.name}
      className="fixed inset-0 z-50 flex flex-col bg-[#080605]/95 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#FAF6F0]">{video.name}</p>
          <p className="mt-0.5 font-mono text-xs text-[#A89A8A] tabular-nums">
            {video.ratioLabel} · {video.width}×{video.height} · {formatDuration(video.duration)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close fullscreen preview"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#16110E] text-[#FAF6F0] transition-colors hover:border-[#F97316]/60 hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-4 sm:p-8 overflow-hidden">
        {hasPrev && (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous video"
            className="absolute left-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-[#140F0C]/90 text-[#FAF6F0] transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <video
          key={video.id}
          src={video.objectUrl}
          controls
          autoPlay
          playsInline
          style={{ aspectRatio: `${video.width} / ${video.height}` }}
          className="max-h-full max-w-full rounded-xl border border-[#F97316]/30 bg-black shadow-2xl"
        />

        {hasNext && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Next video"
            className="absolute right-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-[#140F0C]/90 text-[#FAF6F0] transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};
