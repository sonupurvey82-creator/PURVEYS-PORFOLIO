import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ExtraService, ServiceWorkMediaKind } from '../types/service';
import { isImageFile } from '../utils/imageStorage';
import { isVideoFile } from '../utils/videoStorage';

interface ExtraServicesSectionProps {
  services: ExtraService[];
  onSaveService: (payload: {
    id?: string;
    title: string;
    workDetails: string;
    mediaFile?: File | null;
    removeExistingMedia?: boolean;
  }) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
}

export const ExtraServicesSection: React.FC<ExtraServicesSectionProps> = ({
  services,
  onSaveService,
  onDeleteService,
}) => {
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<ExtraService | null>(null);
  const [inspectingService, setInspectingService] = useState<ExtraService | null>(null);

  const [title, setTitle] = useState<string>('');
  const [workDetails, setWorkDetails] = useState<string>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<ServiceWorkMediaKind | undefined>(undefined);
  const [removeExistingMedia, setRemoveExistingMedia] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const tempPreviewUrlRef = useRef<string | null>(null);

  const revokeTempPreview = () => {
    if (tempPreviewUrlRef.current) {
      URL.revokeObjectURL(tempPreviewUrlRef.current);
      tempPreviewUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeTempPreview();
    };
  }, []);

  useEffect(() => {
    if (!formOpen && !inspectingService) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (formOpen) closeFormModal();
        else if (inspectingService) setInspectingService(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [formOpen, inspectingService]);

  const openAddModal = () => {
    revokeTempPreview();
    setEditingService(null);
    setTitle('');
    setWorkDetails('');
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaKind(undefined);
    setRemoveExistingMedia(false);
    setErrorText(null);
    setFormOpen(true);
  };

  const openEditModal = (service: ExtraService) => {
    revokeTempPreview();
    setInspectingService(null);
    setEditingService(service);
    setTitle(service.title);
    setWorkDetails(service.workDetails);
    setMediaFile(null);
    setMediaPreviewUrl(service.mediaObjectUrl ?? null);
    setMediaKind(service.mediaKind);
    setRemoveExistingMedia(false);
    setErrorText(null);
    setFormOpen(true);
  };

  const closeFormModal = () => {
    revokeTempPreview();
    setFormOpen(false);
    setEditingService(null);
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaKind(undefined);
    setRemoveExistingMedia(false);
    setErrorText(null);
  };

  const handleMediaSelected = (file: File | null) => {
    if (!file) return;
    const nextKind: ServiceWorkMediaKind | null = isImageFile(file)
      ? 'image'
      : isVideoFile(file)
        ? 'video'
        : null;

    if (!nextKind) {
      setErrorText('Please choose an image or video file for the work sample.');
      return;
    }

    setErrorText(null);
    revokeTempPreview();
    const preview = URL.createObjectURL(file);
    tempPreviewUrlRef.current = preview;
    setMediaFile(file);
    setMediaPreviewUrl(preview);
    setMediaKind(nextKind);
    setRemoveExistingMedia(false);
  };

  const handleRemoveMedia = () => {
    revokeTempPreview();
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaKind(undefined);
    setRemoveExistingMedia(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedWork = workDetails.trim();

    if (!trimmedTitle) {
      setErrorText('Please enter the service name.');
      return;
    }
    if (!trimmedWork) {
      setErrorText('Please describe the work or deliverables you provide.');
      return;
    }

    setErrorText(null);
    setIsSaving(true);
    try {
      await onSaveService({
        id: editingService?.id,
        title: trimmedTitle,
        workDetails: trimmedWork,
        mediaFile,
        removeExistingMedia,
      });
      closeFormModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (inspectingService?.id === id) {
      setInspectingService(null);
    }
    await onDeleteService(id);
  };

  return (
    <section
      aria-labelledby="extra-services-heading"
      className="mx-auto w-full max-w-[1440px] px-4 pt-2 pb-14 sm:px-6"
    >
      <div className="mb-6 flex items-center justify-between gap-4 border-t border-white/10 pt-8">
        <h2
          id="extra-services-heading"
          className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-xl font-semibold tracking-tight text-[#FAF6F0] sm:text-2xl"
        >
          <span>Extra Services</span>
          <span className="text-sm font-medium tracking-normal text-[#FDBA74] sm:text-base">
            (%50 Human + %50 AI)
          </span>
        </h2>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F97316]/40 bg-[#1B130E]/85 px-3.5 text-xs font-semibold text-[#FDBA74] transition-colors duration-150 hover:border-[#F97316] hover:bg-[#EA580C] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Service</span>
        </button>
      </div>

      {services.length === 0 ? (
        <div className="flex min-h-[140px] w-full flex-col items-center justify-center px-4 py-6 text-center">
          <p className="max-w-md text-sm leading-relaxed text-[#B6A99A]">
            Add the extra services you provide along with your work details and optional sample images or clips.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2.5 text-xs font-semibold text-[#FFF7ED] transition-colors duration-150 hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0908] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Extra Service</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.id}
              className="group relative h-60 overflow-hidden rounded-2xl border border-white/15 bg-[#08150D] shadow-[0_14px_34px_-12px_rgba(0,0,0,0.65)] transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#FF6B00]/55 sm:h-64"
            >
              {/* Edit / Delete Controls (revealed on hover/focus) */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => openEditModal(service)}
                  aria-label={`Edit ${service.title}`}
                  title="Edit service"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/75 text-[#FAF6F0] backdrop-blur-sm transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(service.id)}
                  aria-label={`Delete ${service.title}`}
                  title="Delete service"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/75 text-[#FAF6F0] backdrop-blur-sm transition-colors hover:border-red-500/70 hover:bg-red-600/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInspectingService(service)}
                aria-label={`${service.title} — hover or click to inspect work`}
                className="relative block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
              >
                {/* Pure Visual Image/Video Layer (only visible content at rest) */}
                {service.mediaObjectUrl ? (
                  service.mediaKind === 'video' ? (
                    <video
                      src={service.mediaObjectUrl}
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="metadata"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={service.mediaObjectUrl}
                      alt={service.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0D2415] via-[#09180E] to-[#1A120A]">
                    <Layers className="h-10 w-10 text-[#F97316]/55 transition-transform duration-300 group-hover:scale-90 group-hover:opacity-25" aria-hidden="true" />
                  </div>
                )}

                {/* Hover Scrim & Revealed Service Text (hidden until mouse cursor hovers) */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/92 via-black/72 to-black/25 p-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                  <div className="translate-y-3 transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-focus-within:translate-y-0">
                    <h3 className="pr-16 font-display text-lg font-semibold tracking-tight text-[#FAF6F0] sm:text-xl">
                      {service.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-[#E4DCD2]">
                      {service.workDetails}
                    </p>
                  </div>
                </div>
              </button>
            </article>
          ))}
        </div>
      )}

      {/* Inspect Service & Work Modal */}
      {inspectingService &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={inspectingService.title}
            onClick={() => setInspectingService(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#06110A]/88 p-4 backdrop-blur-sm sm:p-8"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#F97316]/25 bg-[#140F0C] shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setInspectingService(null)}
                aria-label="Close modal"
                className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#1B1410]/90 text-[#FAF6F0] transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="overflow-y-auto p-6 sm:p-7">
                {inspectingService.mediaObjectUrl && (
                  <div className="mb-5 flex max-h-[48vh] w-full items-center justify-center overflow-hidden rounded-2xl bg-black p-2">
                    {inspectingService.mediaKind === 'video' ? (
                      <video
                        src={inspectingService.mediaObjectUrl}
                        controls
                        autoPlay
                        playsInline
                        className="max-h-[44vh] max-w-full rounded-xl object-contain"
                      />
                    ) : (
                      <img
                        src={inspectingService.mediaObjectUrl}
                        alt={`${inspectingService.title} work`}
                        referrerPolicy="no-referrer"
                        className="max-h-[44vh] max-w-full rounded-xl object-contain"
                      />
                    )}
                  </div>
                )}

                <h3 className="pr-10 font-display text-xl font-semibold tracking-tight text-[#FAF6F0] sm:text-2xl">
                  {inspectingService.title}
                </h3>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#D6CBC0] sm:text-base">
                  {inspectingService.workDetails}
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => handleDelete(inspectingService.id)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Service</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(inspectingService)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#EA580C] px-4 text-xs font-semibold text-[#FFF7ED] transition-colors hover:bg-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit Service</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add / Edit Service Modal (Portaled to document.body) */}
      {formOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingService ? 'Edit Extra Service' : 'Add Extra Service'}
            onClick={closeFormModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#06110A]/88 p-4 backdrop-blur-sm sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#F97316]/25 bg-[#140F0C] p-6 shadow-2xl sm:p-7"
            >
              <button
                type="button"
                onClick={closeFormModal}
                aria-label="Close modal"
                className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-[#1B1410] text-[#FAF6F0] transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="pr-8 font-display text-xl font-semibold tracking-tight text-[#FAF6F0]">
                {editingService ? 'Edit Extra Service' : 'Add Extra Service'}
              </h3>

              <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    handleMediaSelected(file);
                    e.target.value = '';
                  }}
                  className="sr-only"
                  aria-label="Upload work sample image or video"
                />

                <div>
                  <label
                    htmlFor="extra-service-title"
                    className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                  >
                    Service Name
                  </label>
                  <input
                    id="extra-service-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Color Grading, Thumbnail Design, Sound Mixing"
                    required
                    className="w-full rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm text-[#FAF6F0] placeholder-[#6B5F52] focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="extra-service-work"
                    className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                  >
                    The Work I Provide
                  </label>
                  <textarea
                    id="extra-service-work"
                    rows={4}
                    value={workDetails}
                    onChange={(e) => setWorkDetails(e.target.value)}
                    placeholder="Describe the work you do, deliverables, or examples..."
                    required
                    className="w-full resize-none rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm leading-relaxed text-[#FAF6F0] placeholder-[#6B5F52] focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                {/* Optional Sample Work Upload */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#B6A99A]">
                      Work Sample (Optional Image or Video)
                    </span>
                    {mediaPreviewUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        className="text-xs font-medium text-[#8C7F70] hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Remove Sample
                      </button>
                    )}
                  </div>

                  {mediaPreviewUrl ? (
                    <div className="relative overflow-hidden rounded-xl border border-white/15 bg-black">
                      {mediaKind === 'video' ? (
                        <video
                          src={mediaPreviewUrl}
                          muted
                          loop
                          playsInline
                          autoPlay
                          className="max-h-44 w-full object-contain"
                        />
                      ) : (
                        <img
                          src={mediaPreviewUrl}
                          alt="Work sample preview"
                          referrerPolicy="no-referrer"
                          className="max-h-44 w-full object-contain"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => mediaInputRef.current?.click()}
                        className="mt-2 mb-2 ml-2 inline-flex h-8 items-center rounded-lg border border-white/15 bg-[#1B1410] px-3 text-xs font-medium text-[#FDBA74] hover:border-[#F97316] cursor-pointer"
                      >
                        Change Sample
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#F97316]/40 bg-[#0B0908] px-4 py-5 text-xs font-medium text-[#D6CBC0] transition-colors hover:border-[#F97316] hover:text-[#FDBA74] cursor-pointer"
                    >
                      <ImagePlus className="h-4 w-4 text-[#F97316]" />
                      <span>Upload Work Sample (Image or Video)</span>
                    </button>
                  )}
                </div>

                {errorText && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                    <span>{errorText}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={closeFormModal}
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
                    <span>{isSaving ? 'Saving...' : 'Save Service'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
