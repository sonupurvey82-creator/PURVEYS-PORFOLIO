import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { YouTubeChannel } from '../types/channel';
import { normalizeYouTubeUrl } from '../utils/channelStorage';
import { isImageFile } from '../utils/imageStorage';

interface YouTubeChannelsSectionProps {
  channels: YouTubeChannel[];
  onSaveChannel: (payload: {
    id?: string;
    name: string;
    url: string;
    logoFile?: File | null;
    removeExistingLogo?: boolean;
  }) => Promise<void>;
  onDeleteChannel: (id: string) => Promise<void>;
}

export const YouTubeChannelsSection: React.FC<YouTubeChannelsSectionProps> = ({
  channels,
  onSaveChannel,
  onDeleteChannel,
}) => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingChannel, setEditingChannel] = useState<YouTubeChannel | null>(null);
  const [name, setName] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [removeExistingLogo, setRemoveExistingLogo] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
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
    if (!modalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modalOpen]);

  const openAddModal = () => {
    revokeTempPreview();
    setEditingChannel(null);
    setName('');
    setUrlInput('');
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setRemoveExistingLogo(false);
    setErrorText(null);
    setModalOpen(true);
  };

  const openEditModal = (channel: YouTubeChannel) => {
    revokeTempPreview();
    setEditingChannel(channel);
    setName(channel.name);
    setUrlInput(channel.url);
    setLogoFile(null);
    setLogoPreviewUrl(channel.logoObjectUrl ?? null);
    setRemoveExistingLogo(false);
    setErrorText(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    revokeTempPreview();
    setModalOpen(false);
    setEditingChannel(null);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setRemoveExistingLogo(false);
    setErrorText(null);
  };

  const handleLogoSelected = (file: File | null) => {
    if (!file) return;
    if (!isImageFile(file)) {
      setErrorText('Please choose an image file (PNG, JPG, WebP, or GIF) for the channel logo.');
      return;
    }
    setErrorText(null);
    revokeTempPreview();
    const preview = URL.createObjectURL(file);
    tempPreviewUrlRef.current = preview;
    setLogoFile(file);
    setLogoPreviewUrl(preview);
    setRemoveExistingLogo(false);
  };

  const handleRemoveLogo = () => {
    revokeTempPreview();
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setRemoveExistingLogo(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorText('Please enter the YouTube channel name.');
      return;
    }

    const normalizedUrl = normalizeYouTubeUrl(urlInput);
    if (!normalizedUrl) {
      setErrorText('Please enter a valid YouTube channel link or @handle.');
      return;
    }

    setErrorText(null);
    setIsSaving(true);
    try {
      await onSaveChannel({
        id: editingChannel?.id,
        name: trimmedName,
        url: normalizedUrl,
        logoFile,
        removeExistingLogo,
      });
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="youtube-channels-heading"
      className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-16 sm:px-6"
    >
      <div className="mb-8 flex items-center justify-between gap-4 border-t border-white/10 pt-10">
        <h2
          id="youtube-channels-heading"
          className="text-xl font-semibold tracking-tight text-[#FAF6F0] sm:text-2xl"
        >
          YouTube Channels
        </h2>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F97316]/40 bg-[#1B130E]/85 px-3.5 text-xs font-semibold text-[#FDBA74] transition-colors duration-150 hover:border-[#F97316] hover:bg-[#EA580C] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Channel</span>
        </button>
      </div>

      {channels.length === 0 ? (
        <div className="flex min-h-[160px] w-full flex-col items-center justify-center px-4 py-8 text-center">
          <p className="max-w-md text-sm leading-relaxed text-[#B6A99A]">
            Add your YouTube channels with each channel&rsquo;s logo, name, and link so visitors can click straight to your channel.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2.5 text-xs font-semibold text-[#FFF7ED] transition-colors duration-150 hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0908] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add YouTube Channel</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="group relative inline-flex max-w-full items-center gap-2 overflow-hidden rounded-[22px] border border-white/25 bg-gradient-to-b from-white/[0.17] via-white/[0.08] to-white/[0.04] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.42),inset_0_-1px_0_0_rgba(255,255,255,0.08),0_14px_34px_-10px_rgba(0,0,0,0.55)] backdrop-blur-xl backdrop-saturate-[180%] transition-[transform,border-color,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/35 hover:from-white/[0.22] hover:via-white/[0.11] hover:to-white/[0.06] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.52),inset_0_-1px_0_0_rgba(255,255,255,0.12),0_18px_40px_-10px_rgba(0,0,0,0.65)] active:scale-[0.985]"
            >
              {/* Subtle iOS 18 top-edge specular sheen */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent"
              />

              <a
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${channel.name} on YouTube`}
                className="flex min-w-0 items-center gap-3.5 rounded-[12px] pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/30 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.55)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 sm:h-14 sm:w-14">
                  {channel.logoObjectUrl ? (
                    <img
                      src={channel.logoObjectUrl}
                      alt={`${channel.name} logo`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/[0.08] text-[#FAF6F0]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 sm:h-7 sm:w-7"
                        aria-hidden="true"
                      >
                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                      </svg>
                    </div>
                  )}
                </div>

                <span className="max-w-[210px] truncate font-display text-lg font-semibold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-colors duration-150 group-hover:text-[#FFF7ED] sm:max-w-[260px] sm:text-xl">
                  {channel.name}
                </span>
              </a>

              {/* Glassy Trailing Edit & Delete Controls */}
              <div className="flex shrink-0 items-center gap-1 border-l border-white/15 pl-2 opacity-85 transition-opacity duration-150 sm:opacity-45 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => openEditModal(channel)}
                  aria-label={`Edit ${channel.name}`}
                  title="Edit channel"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-white/75 transition-colors duration-150 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteChannel(channel.id)}
                  aria-label={`Delete ${channel.name}`}
                  title="Delete channel"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-white/75 transition-colors duration-150 hover:bg-red-500/25 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit YouTube Channel Modal (Portaled to document.body) */}
      {modalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingChannel ? 'Edit YouTube Channel' : 'Add YouTube Channel'}
            onClick={closeModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#06110A]/88 p-4 backdrop-blur-sm sm:p-6"
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-[#F97316]/25 bg-[#140F0C] p-6 shadow-2xl sm:p-7"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close modal"
              className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-[#1B1410] text-[#FAF6F0] transition-colors hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="pr-8 font-display text-xl font-semibold tracking-tight text-[#FAF6F0]">
              {editingChannel ? 'Edit YouTube Channel' : 'Add YouTube Channel'}
            </h3>

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  handleLogoSelected(file);
                  e.target.value = '';
                }}
                className="sr-only"
                aria-label="Upload channel logo"
              />

              {/* Channel Logo Upload Preview */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#F97316]/45 bg-[#0B0908] transition-colors hover:border-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] cursor-pointer"
                >
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt="Channel logo preview"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="h-7 w-7 text-[#F97316]/80 transition-transform group-hover:scale-110" />
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-xs font-medium text-[#FDBA74] hover:text-[#F97316] transition-colors cursor-pointer"
                  >
                    {logoPreviewUrl ? 'Change Logo' : 'Upload Channel Logo'}
                  </button>
                  {logoPreviewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs font-medium text-[#8C7F70] hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="yt-channel-name"
                  className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                >
                  Channel Name
                </label>
                <input
                  id="yt-channel-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PURVEY Edits"
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm text-[#FAF6F0] placeholder-[#6B5F52] focus:border-[#F97316] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="yt-channel-url"
                  className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                >
                  YouTube Channel Link
                </label>
                <input
                  id="yt-channel-url"
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://youtube.com/@yourchannel or @yourchannel"
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm text-[#FAF6F0] placeholder-[#6B5F52] focus:border-[#F97316] focus:outline-none"
                />
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
                  onClick={closeModal}
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
                  <span>{isSaving ? 'Saving...' : 'Save Channel'}</span>
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
