import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  FileArchive,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Sliders,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { PresetCategory, PresetItem, PresetPreviewKind } from '../types/preset';
import { isImageFile } from '../utils/imageStorage';
import { formatPresetSize, inferPresetCategory, PRESET_CATEGORIES } from '../utils/presetStorage';
import { isVideoFile } from '../utils/videoStorage';

interface PresetsPageProps {
  canEdit: boolean;
  presets: PresetItem[];
  isProcessing: boolean;
  onBackHome: () => void;
  onQuickUploadFiles: (files: FileList | File[]) => Promise<void>;
  onSavePreset: (payload: {
    id?: string;
    title: string;
    category: PresetCategory;
    description: string;
    presetFile?: File | null;
    previewFile?: File | null;
    removeExistingPreview?: boolean;
  }) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  onDownloadPreset: (preset: PresetItem) => Promise<void>;
}

export const PresetsPage: React.FC<PresetsPageProps> = ({
  canEdit,
  presets,
  isProcessing,
  onBackHome,
  onQuickUploadFiles,
  onSavePreset,
  onDeletePreset,
  onDownloadPreset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | PresetCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);
  const [inspectingPreset, setInspectingPreset] = useState<PresetItem | null>(null);

  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<PresetCategory>('Premiere Pro');
  const [description, setDescription] = useState<string>('');
  const [presetFile, setPresetFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<PresetPreviewKind | undefined>(undefined);
  const [removeExistingPreview, setRemoveExistingPreview] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const quickUploadInputRef = useRef<HTMLInputElement>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const tempPreviewUrlRef = useRef<string | null>(null);

  const revokeTempPreview = () => {
    if (tempPreviewUrlRef.current) {
      URL.revokeObjectURL(tempPreviewUrlRef.current);
      tempPreviewUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => revokeTempPreview();
  }, []);

  useEffect(() => {
    if (!formOpen && !inspectingPreset) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (formOpen) closeFormModal();
        else if (inspectingPreset) setInspectingPreset(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [formOpen, inspectingPreset]);

  useEffect(() => {
    if (inspectingPreset) {
      const updated = presets.find((p) => p.id === inspectingPreset.id);
      if (updated) {
        setInspectingPreset(updated);
      } else {
        setInspectingPreset(null);
      }
    }
  }, [presets, inspectingPreset]);

  const availableCategories = useMemo(() => {
    const present = new Set<PresetCategory>(presets.map((p) => p.category));
    return PRESET_CATEGORIES.filter((cat) => present.has(cat));
  }, [presets]);

  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return presets.filter((preset) => {
      if (selectedCategory !== 'All' && preset.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        preset.title.toLowerCase().includes(q) ||
        preset.category.toLowerCase().includes(q) ||
        preset.fileName.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q)
      );
    });
  }, [presets, selectedCategory, searchQuery]);

  const totalDownloads = useMemo(
    () => presets.reduce((sum, item) => sum + item.downloads, 0),
    [presets]
  );

  const openAddModal = () => {
    revokeTempPreview();
    setEditingPreset(null);
    setTitle('');
    setCategory('Premiere Pro');
    setDescription('');
    setPresetFile(null);
    setExistingFileName('');
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewKind(undefined);
    setRemoveExistingPreview(false);
    setErrorText(null);
    setFormOpen(true);
  };

  const openEditModal = (preset: PresetItem) => {
    revokeTempPreview();
    setInspectingPreset(null);
    setEditingPreset(preset);
    setTitle(preset.title);
    setCategory(preset.category);
    setDescription(preset.description);
    setPresetFile(null);
    setExistingFileName(preset.fileName);
    setPreviewFile(null);
    setPreviewUrl(preset.previewObjectUrl ?? null);
    setPreviewKind(preset.previewKind);
    setRemoveExistingPreview(false);
    setErrorText(null);
    setFormOpen(true);
  };

  const closeFormModal = () => {
    revokeTempPreview();
    setFormOpen(false);
    setEditingPreset(null);
    setPresetFile(null);
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewKind(undefined);
    setRemoveExistingPreview(false);
    setErrorText(null);
  };

  const handleFormPresetFileSelected = (file: File | null) => {
    if (!file) return;
    setPresetFile(file);
    setExistingFileName(file.name);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, '') || 'Preset Pack');
    }
    if (!editingPreset) {
      setCategory(inferPresetCategory(file.name));
    }
    setErrorText(null);
  };

  const handlePreviewFileSelected = (file: File | null) => {
    if (!file) return;
    const nextKind: PresetPreviewKind | null = isImageFile(file)
      ? 'image'
      : isVideoFile(file)
        ? 'video'
        : null;

    if (!nextKind) {
      setErrorText('Preview thumbnail must be an image or video file.');
      return;
    }

    setErrorText(null);
    revokeTempPreview();
    const url = URL.createObjectURL(file);
    tempPreviewUrlRef.current = url;
    setPreviewFile(file);
    setPreviewUrl(url);
    setPreviewKind(nextKind);
    setRemoveExistingPreview(false);
  };

  const handleRemovePreview = () => {
    revokeTempPreview();
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewKind(undefined);
    setRemoveExistingPreview(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!editingPreset && !presetFile) {
      setErrorText('Please choose a preset file to upload.');
      return;
    }
    if (!trimmedTitle) {
      setErrorText('Please enter a name for this preset.');
      return;
    }

    setErrorText(null);
    setIsSaving(true);
    try {
      await onSavePreset({
        id: editingPreset?.id,
        title: trimmedTitle,
        category,
        description: description.trim(),
        presetFile,
        previewFile,
        removeExistingPreview,
      });
      closeFormModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerDownload = async (preset: PresetItem) => {
    setDownloadingId(preset.id);
    try {
      await onDownloadPreset(preset);
    } finally {
      window.setTimeout(() => {
        setDownloadingId((prev) => (prev === preset.id ? null : prev));
      }, 650);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!isDragOver) setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onQuickUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={canEdit ? handleDragOver : undefined}
      onDragLeave={canEdit ? handleDragLeave : undefined}
      onDrop={canEdit ? handleDrop : undefined}
      className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-20 sm:px-6"
    >
      {/* Hidden Multi-File Preset Picker (owner only) */}
      {canEdit && (
        <input
          ref={quickUploadInputRef}
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onQuickUploadFiles(e.target.files);
              e.target.value = '';
            }
          }}
          className="sr-only"
          aria-label="Upload multiple preset files"
        />
      )}

      {/* Top Navigation & Page Header */}
      <div className="mb-8 border-b border-white/10 pb-7">
        <button
          type="button"
          onClick={onBackHome}
          className="mb-5 inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-[#08160D]/80 px-3.5 text-xs font-medium text-[#E4DCD2] transition-colors hover:border-[#F97316] hover:text-[#FDBA74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Portfolio</span>
        </button>

        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#FAF6F0] sm:text-4xl [text-wrap:balance]">
              Presets Library
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#B6A99A] sm:text-base">
              {canEdit
                ? 'Upload LUTs, Premiere Pro presets, After Effects effects, Lightroom profiles, or project packs. Visitors can browse and download any preset directly.'
                : 'Browse LUTs, Premiere Pro presets, After Effects effects, Lightroom profiles, and project packs. Select any preset to inspect details and download directly.'}
            </p>
            {presets.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-[#A89A8A] tabular-nums">
                <span>
                  {presets.length} {presets.length === 1 ? 'preset' : 'presets'} available
                </span>
                {totalDownloads > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {totalDownloads} {totalDownloads === 1 ? 'download' : 'downloads'}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#F97316]/40 bg-[#1B130E]/90 px-4 text-xs font-semibold text-[#FDBA74] transition-colors hover:border-[#F97316] hover:bg-[#2A1B12] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add with Details</span>
              </button>

              <button
                type="button"
                onClick={() => quickUploadInputRef.current?.click()}
                disabled={isProcessing}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#EA580C] px-4 text-xs font-semibold text-[#FFF7ED] transition-colors hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{isProcessing ? 'Uploading...' : 'Upload Preset Files'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar (shown when presets exist) */}
      {presets.length > 0 && (
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div
            role="tablist"
            aria-label="Filter presets by category"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#08150D]/80 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'All'}
              onClick={() => setSelectedCategory('All')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'All'
                  ? 'bg-[#EA580C] text-[#FFF7ED]'
                  : 'text-[#B6A99A] hover:text-[#FAF6F0]'
              }`}
            >
              All
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#EA580C] text-[#FFF7ED]'
                    : 'text-[#B6A99A] hover:text-[#FAF6F0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8C7F70]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search presets or formats..."
              aria-label="Search presets"
              className="h-10 w-full rounded-xl border border-white/15 bg-[#08150D]/85 pr-3.5 pl-10 text-xs text-[#FAF6F0] placeholder-[#6B5F52] focus:border-[#F97316] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Drag & Drop Target Banner when dragging files (owner only) */}
      {canEdit && isDragOver && (
        <div className="mb-6 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#F97316] bg-[#1B130E]/90 px-6 py-8 text-center">
          <p className="text-sm font-medium text-[#FED7AA]">
            Drop your preset files anywhere here to add them to the library
          </p>
        </div>
      )}

      {/* Empty State or Preset Cards Grid */}
      {presets.length === 0 ? (
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#F97316]/35 bg-[#07150C]/75 px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F97316]/30 bg-[#1B130E]/90 text-[#F97316]">
            <Sliders className="h-6 w-6" aria-hidden="true" />
          </div>
          {canEdit ? (
            <>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[#FAF6F0] sm:text-2xl">
                Upload your presets here
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[#B6A99A]">
                Drag and drop `.cube`, `.prfpset`, `.ffx`, `.xmp`, `.mogrt`, `.zip`, or any preset files. Once uploaded, anyone visiting this page can download them.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => quickUploadInputRef.current?.click()}
                  disabled={isProcessing}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#EA580C] px-5 text-xs font-semibold text-[#FFF7ED] transition-colors hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <span>{isProcessing ? 'Uploading...' : 'Upload Preset Files'}</span>
                </button>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-[#1B130E]/85 px-4 text-xs font-medium text-[#E4DCD2] transition-colors hover:border-[#F97316] hover:text-[#FDBA74] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add with Preview & Notes</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold tracking-tight text-[#FAF6F0] sm:text-2xl">
                Presets Coming Soon
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[#B6A99A]">
                No preset packs have been published yet. Check back soon to download LUTs and editing presets.
              </p>
            </>
          )}
        </div>
      ) : filteredPresets.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#07150C]/70 px-6 py-10 text-center">
          <p className="text-sm text-[#B6A99A]">No presets match your current filter.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="mt-3 text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPresets.map((preset) => {
            const isDownloadedRecently = downloadingId === preset.id;

            return (
              <article
                key={preset.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#08150D]/90 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.65)] transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#F97316]/50"
              >
                {/* Media Preview or Specimen Banner */}
                <div className="relative h-44 w-full overflow-hidden border-b border-white/10 bg-[#050E08]">
                  <button
                    type="button"
                    onClick={() => setInspectingPreset(preset)}
                    aria-label={`Inspect ${preset.title}`}
                    className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F97316] cursor-pointer"
                  >
                    {preset.previewObjectUrl ? (
                      preset.previewKind === 'video' ? (
                        <video
                          src={preset.previewObjectUrl}
                          muted
                          loop
                          playsInline
                          autoPlay
                          preload="metadata"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <img
                          src={preset.previewObjectUrl}
                          alt={`${preset.title} preview`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )
                    ) : (
                      <div className="tiger-stripe-hairline flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0A1E11] via-[#06120A] to-[#1A1109] p-4">
                        <FileArchive
                          className="mb-2 h-8 w-8 text-[#F97316]/80 transition-transform duration-200 group-hover:scale-105"
                          aria-hidden="true"
                        />
                        <span className="font-mono text-lg font-bold tracking-wider text-[#FAF6F0]">
                          .{preset.fileExt}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Edit / Delete Controls (owner only) */}
                  {canEdit && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(preset)}
                        aria-label={`Edit ${preset.title}`}
                        title="Edit preset"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-black/80 text-[#FAF6F0] backdrop-blur-sm transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePreset(preset.id)}
                        aria-label={`Delete ${preset.title}`}
                        title="Delete preset"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-black/80 text-[#FAF6F0] backdrop-blur-sm transition-colors hover:border-red-500/70 hover:bg-red-600/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Preset Metadata & Download Action */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <button
                      type="button"
                      onClick={() => setInspectingPreset(preset)}
                      className="text-left focus-visible:outline-none focus-visible:underline cursor-pointer"
                    >
                      <h3 className="line-clamp-1 font-display text-lg font-semibold tracking-tight text-[#FAF6F0]">
                        {preset.title}
                      </h3>
                    </button>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#A89A8A] tabular-nums">
                      <span className="text-[#FDBA74]">{preset.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{preset.fileExt}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatPresetSize(preset.fileSize)}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {preset.downloads} {preset.downloads === 1 ? 'download' : 'downloads'}
                      </span>
                    </div>

                    {preset.description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#CFC6BA]">
                        {preset.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <span className="truncate font-mono text-[11px] text-[#8C7F70]">
                      {preset.fileName}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTriggerDownload(preset)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#EA580C] px-4 text-xs font-semibold text-[#FFF7ED] transition-colors hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isDownloadedRecently ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Inspect Preset Modal */}
      {inspectingPreset &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={inspectingPreset.title}
            onClick={() => setInspectingPreset(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#06110A]/88 p-4 backdrop-blur-sm sm:p-8"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#F97316]/25 bg-[#140F0C] shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setInspectingPreset(null)}
                aria-label="Close modal"
                className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#1B1410]/90 text-[#FAF6F0] transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="overflow-y-auto p-6 sm:p-7">
                {inspectingPreset.previewObjectUrl && (
                  <div className="mb-5 flex max-h-[45vh] w-full items-center justify-center overflow-hidden rounded-2xl bg-black p-2">
                    {inspectingPreset.previewKind === 'video' ? (
                      <video
                        src={inspectingPreset.previewObjectUrl}
                        controls
                        autoPlay
                        playsInline
                        className="max-h-[42vh] max-w-full rounded-xl object-contain"
                      />
                    ) : (
                      <img
                        src={inspectingPreset.previewObjectUrl}
                        alt={`${inspectingPreset.title} preview`}
                        referrerPolicy="no-referrer"
                        className="max-h-[42vh] max-w-full rounded-xl object-contain"
                      />
                    )}
                  </div>
                )}

                <h3 className="pr-10 font-display text-2xl font-semibold tracking-tight text-[#FAF6F0]">
                  {inspectingPreset.title}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#A89A8A] tabular-nums">
                  <span className="font-medium text-[#FDBA74]">{inspectingPreset.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{inspectingPreset.fileName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatPresetSize(inspectingPreset.fileSize)}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {inspectingPreset.downloads}{' '}
                    {inspectingPreset.downloads === 1 ? 'download' : 'downloads'}
                  </span>
                </div>

                {inspectingPreset.description ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#D6CBC0] sm:text-base">
                    {inspectingPreset.description}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-[#8C7F70]">
                    Ready to download and import into {inspectingPreset.category}.
                  </p>
                )}

                <div
                  className={`mt-7 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 ${
                    canEdit ? 'justify-between' : 'justify-end'
                  }`}
                >
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDeletePreset(inspectingPreset.id)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(inspectingPreset)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-[#1B1410] px-3.5 text-xs font-medium text-[#E4DCD2] transition-colors hover:border-[#F97316] hover:text-[#FDBA74] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleTriggerDownload(inspectingPreset)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#EA580C] px-5 text-xs font-semibold text-[#FFF7ED] transition-colors hover:bg-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Preset</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add / Edit Preset Modal (owner only) */}
      {canEdit &&
        formOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingPreset ? 'Edit Preset' : 'Upload Preset'}
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
                {editingPreset ? 'Edit Preset' : 'Upload Preset'}
              </h3>

              <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
                <input
                  ref={formFileInputRef}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    handleFormPresetFileSelected(file);
                    e.target.value = '';
                  }}
                  className="sr-only"
                  aria-label="Choose preset file"
                />

                <input
                  ref={previewInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    handlePreviewFileSelected(file);
                    e.target.value = '';
                  }}
                  className="sr-only"
                  aria-label="Choose preset preview image or video"
                />

                {/* Preset File Picker */}
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-[#B6A99A]">
                    Preset File (.cube, .prfpset, .ffx, .xmp, .zip, etc.)
                  </span>
                  <button
                    type="button"
                    onClick={() => formFileInputRef.current?.click()}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-[#F97316]/45 bg-[#0B0908] px-4 py-3.5 text-left text-xs transition-colors hover:border-[#F97316] cursor-pointer"
                  >
                    <span className="truncate font-mono text-[#FAF6F0]">
                      {presetFile
                        ? `${presetFile.name} (${formatPresetSize(presetFile.size)})`
                        : existingFileName || 'Choose preset file from your device...'}
                    </span>
                    <span className="shrink-0 font-semibold text-[#F97316]">Browse</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="preset-title-input"
                      className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                    >
                      Preset Name
                    </label>
                    <input
                      id="preset-title-input"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Forest Cinema LUT"
                      required
                      className="w-full rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm text-[#FAF6F0] placeholder-[#6B5F52] focus:border-[#F97316] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="preset-category-select"
                      className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                    >
                      Software / Category
                    </label>
                    <select
                      id="preset-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as PresetCategory)}
                      className="w-full rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm text-[#FAF6F0] focus:border-[#F97316] focus:outline-none"
                    >
                      {PRESET_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="preset-description-input"
                    className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                  >
                    Notes / Usage Instructions (Optional)
                  </label>
                  <textarea
                    id="preset-description-input"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Recommended exposure, color space, or import steps..."
                    className="w-full resize-none rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm leading-relaxed text-[#FAF6F0] placeholder-[#6B5F52] focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                {/* Optional Preview Thumbnail */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#B6A99A]">
                      Preview Thumbnail (Optional Image or Clip)
                    </span>
                    {previewUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePreview}
                        className="text-xs font-medium text-[#8C7F70] hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Remove Preview
                      </button>
                    )}
                  </div>

                  {previewUrl ? (
                    <div className="overflow-hidden rounded-xl border border-white/15 bg-black">
                      {previewKind === 'video' ? (
                        <video
                          src={previewUrl}
                          muted
                          loop
                          playsInline
                          autoPlay
                          className="max-h-40 w-full object-contain"
                        />
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Preset preview"
                          referrerPolicy="no-referrer"
                          className="max-h-40 w-full object-contain"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => previewInputRef.current?.click()}
                        className="m-2 inline-flex h-8 items-center rounded-lg border border-white/15 bg-[#1B1410] px-3 text-xs font-medium text-[#FDBA74] hover:border-[#F97316] cursor-pointer"
                      >
                        Change Preview
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => previewInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#0B0908] px-4 py-4 text-xs font-medium text-[#D6CBC0] transition-colors hover:border-[#F97316] hover:text-[#FDBA74] cursor-pointer"
                    >
                      <ImagePlus className="h-4 w-4 text-[#F97316]" />
                      <span>Upload Preview Image or Video</span>
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
                    <span>{isSaving ? 'Saving...' : 'Save Preset'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
