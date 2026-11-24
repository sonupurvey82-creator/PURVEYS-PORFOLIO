import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { ContactSection } from './components/ContactSection';
import { ExperienceShowcase } from './components/ExperienceShowcase';
import { ExtraServicesSection } from './components/ExtraServicesSection';
import { FlyingBannerPlane } from './components/FlyingBannerPlane';
import { HeroIntroShowcase } from './components/HeroIntroShowcase';
import { ImageMarqueeSection } from './components/ImageMarqueeSection';
import { LivingForestBackground } from './components/LivingForestBackground';
import { Navbar } from './components/Navbar';
import { ParallaxLayer } from './components/ParallaxLayer';
import { PresetsPage } from './components/PresetsPage';
import { ReelsOrbitalCarousel3D } from './components/ReelsOrbitalCarousel3D';
import { SocialLinks } from './components/SocialLinks';
import { TigerCarousel3D } from './components/TigerCarousel3D';
import { VideoLightbox } from './components/VideoLightbox';
import { WelcomeAirshipBanner } from './components/WelcomeAirshipBanner';
import { YouTubeChannelsSection } from './components/YouTubeChannelsSection';
import { StoredChannelRecord, YouTubeChannel } from './types/channel';
import { GalleryImage, StoredImageRecord } from './types/image';
import { PresetCategory, PresetItem, PresetPreviewKind, StoredPresetRecord } from './types/preset';
import { ExtraService, ServiceWorkMediaKind, StoredServiceRecord } from './types/service';
import { GalleryVideo, StoredVideoRecord, VideoSection } from './types/video';
import {
  deleteYouTubeChannelRecord,
  getYouTubeChannelRecord,
  loadYouTubeChannels,
  saveYouTubeChannelRecord,
} from './utils/channelStorage';
import {
  deletePresetRecord,
  extractFileExtension,
  getPresetRecord,
  incrementPresetDownload,
  inferPresetCategory,
  loadPresets,
  savePresetRecord,
} from './utils/presetStorage';
import {
  deleteExtraServiceRecord,
  getExtraServiceRecord,
  loadExtraServices,
  saveExtraServiceRecord,
} from './utils/serviceStorage';
import {
  deleteImageRecord,
  extractImageMetadata,
  isImageFile,
  loadGalleryImages,
  saveImageRecord,
  updateImageRecordInfo,
} from './utils/imageStorage';
import {
  deleteVideoRecord,
  extractVideoMetadata,
  isVideoFile,
  loadGalleryVideos,
  saveVideoRecord,
} from './utils/videoStorage';

export default function App() {
  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [services, setServices] = useState<ExtraService[]>([]);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [processingPresets, setProcessingPresets] = useState<boolean>(false);
  const [processingImages, setProcessingImages] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'presets'>(() =>
    typeof window !== 'undefined' && window.location.hash === '#presets' ? 'presets' : 'home'
  );

  // Upper "Showreels" state
  const [showreelIndex, setShowreelIndex] = useState<number>(0);
  const [showreelPlaying, setShowreelPlaying] = useState<boolean>(true);
  const [processingShowreels, setProcessingShowreels] = useState<boolean>(false);

  // Lower left-half "My Reels and Edits" state
  const [reelsIndex, setReelsIndex] = useState<number>(0);
  const [reelsPlaying, setReelsPlaying] = useState<boolean>(true);
  const [processingReels, setProcessingReels] = useState<boolean>(false);

  // Viewport visibility + single-channel audio focus
  const [showreelsVisible, setShowreelsVisible] = useState<boolean>(true);
  const [reelsVisible, setReelsVisible] = useState<boolean>(true);
  const [audioSection, setAudioSection] = useState<VideoSection>('showreels');
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);

  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [lightboxTarget, setLightboxTarget] = useState<VideoSection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showreelInputRef = useRef<HTMLInputElement>(null);
  const reelsInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const showreelSectionRef = useRef<HTMLElement>(null);
  const reelsSectionRef = useRef<HTMLElement>(null);
  const videosRef = useRef<GalleryVideo[]>([]);
  videosRef.current = videos;
  const imagesRef = useRef<GalleryImage[]>([]);
  imagesRef.current = images;
  const channelsRef = useRef<YouTubeChannel[]>([]);
  channelsRef.current = channels;
  const servicesRef = useRef<ExtraService[]>([]);
  servicesRef.current = services;
  const presetsRef = useRef<PresetItem[]>([]);
  presetsRef.current = presets;

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(window.location.hash === '#presets' ? 'presets' : 'home');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateToPresets = useCallback(() => {
    if (window.location.hash !== '#presets') {
      window.location.hash = 'presets';
    }
    setCurrentPage('presets');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const navigateToHome = useCallback(() => {
    if (window.location.hash === '#presets') {
      window.location.hash = 'top';
    }
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Unlock unmuted audio on first user gesture anywhere on the page
  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => {
      setAudioUnlocked(true);
    };
    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [audioUnlocked]);

  // Observe section visibility so off-screen sections pause cleanly instead of playing audio invisibly
  useEffect(() => {
    if (currentPage !== 'home') return;
    const showEl = showreelSectionRef.current;
    const reelsEl = reelsSectionRef.current;
    if (!showEl || !reelsEl || typeof IntersectionObserver === 'undefined') return;

    const ratios = { showreels: 1, reels: 0 };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === showEl) {
            ratios.showreels = entry.intersectionRatio;
            setShowreelsVisible(entry.intersectionRatio >= 0.15);
          } else if (entry.target === reelsEl) {
            ratios.reels = entry.intersectionRatio;
            setReelsVisible(entry.intersectionRatio >= 0.15);
          }
        }

        // Automatically route audio to the visible section when scrolling between stages
        if (ratios.showreels < 0.15 && ratios.reels >= 0.15) {
          setAudioSection('reels');
        } else if (ratios.reels < 0.15 && ratios.showreels >= 0.15) {
          setAudioSection('showreels');
        }
      },
      { threshold: [0, 0.15, 0.35, 0.65] }
    );

    observer.observe(showEl);
    observer.observe(reelsEl);
    return () => observer.disconnect();
  }, [currentPage]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadGalleryVideos(),
      loadGalleryImages(),
      loadYouTubeChannels(),
      loadExtraServices(),
      loadPresets(),
    ]).then(([loadedVideos, loadedImages, loadedChannels, loadedServices, loadedPresets]) => {
      if (!mounted) {
        loadedVideos.forEach((v) => URL.revokeObjectURL(v.objectUrl));
        loadedImages.forEach((img) => URL.revokeObjectURL(img.objectUrl));
        loadedChannels.forEach((ch) => {
          if (ch.logoObjectUrl) URL.revokeObjectURL(ch.logoObjectUrl);
        });
        loadedServices.forEach((srv) => {
          if (srv.mediaObjectUrl) URL.revokeObjectURL(srv.mediaObjectUrl);
        });
        loadedPresets.forEach((preset) => {
          URL.revokeObjectURL(preset.fileObjectUrl);
          if (preset.previewObjectUrl) URL.revokeObjectURL(preset.previewObjectUrl);
        });
        return;
      }

      setVideos(loadedVideos);
      setImages(loadedImages);
      setChannels(loadedChannels);
      setServices(loadedServices);
      setPresets(loadedPresets);
      setIsHydrated(true);
    });
    return () => {
      mounted = false;
      videosRef.current.forEach((v) => URL.revokeObjectURL(v.objectUrl));
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.objectUrl));
      channelsRef.current.forEach((ch) => {
        if (ch.logoObjectUrl) URL.revokeObjectURL(ch.logoObjectUrl);
      });
      servicesRef.current.forEach((srv) => {
        if (srv.mediaObjectUrl) URL.revokeObjectURL(srv.mediaObjectUrl);
      });
      presetsRef.current.forEach((preset) => {
        URL.revokeObjectURL(preset.fileObjectUrl);
        if (preset.previewObjectUrl) URL.revokeObjectURL(preset.previewObjectUrl);
      });
    };
  }, []);

  const showreelVideos = useMemo(
    () => videos.filter((v) => v.section === 'showreels'),
    [videos]
  );

  const reelsVideos = useMemo(
    () => videos.filter((v) => v.section === 'reels'),
    [videos]
  );

  // If one section is empty while the other has videos, ensure audio goes to the populated section
  useEffect(() => {
    if (showreelVideos.length === 0 && reelsVideos.length > 0) {
      setAudioSection('reels');
    } else if (reelsVideos.length === 0 && showreelVideos.length > 0) {
      setAudioSection('showreels');
    }
  }, [showreelVideos.length, reelsVideos.length]);

  const handleFilesSelected = useCallback(
    async (fileList: FileList | File[], section: VideoSection) => {
      setAudioUnlocked(true);
      const incoming = Array.from(fileList);
      const validVideos = incoming.filter(isVideoFile);
      const rejectedCount = incoming.length - validVideos.length;

      if (rejectedCount > 0 && validVideos.length === 0) {
        setNotice('Please select video files from your gallery (MP4, MOV, WebM, or M4V).');
        return;
      }

      if (rejectedCount > 0) {
        setNotice(`Skipped ${rejectedCount} non-video file${rejectedCount > 1 ? 's' : ''}.`);
      } else {
        setNotice(null);
      }

      if (validVideos.length === 0) return;

      const setProcessing =
        section === 'showreels' ? setProcessingShowreels : setProcessingReels;
      setProcessing(true);

      try {
        const existingInSection = videosRef.current.filter((v) => v.section === section);
        const startOrder =
          existingInSection.length > 0
            ? Math.max(...existingInSection.map((v) => v.order)) + 1
            : 0;

        const addedVideos: GalleryVideo[] = [];

        for (let i = 0; i < validVideos.length; i++) {
          const file = validVideos[i];
          const meta = await extractVideoMetadata(file);
          const id =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

          const objectUrl = URL.createObjectURL(file);
          const createdAt = Date.now() + i;
          const order = startOrder + i;

          const record: StoredVideoRecord = {
            id,
            section,
            name: file.name.replace(/\.[^/.]+$/, '') || 'Gallery Video',
            size: file.size,
            type: file.type || 'video/mp4',
            width: meta.width,
            height: meta.height,
            aspectRatio: meta.aspectRatio,
            ratioLabel: meta.ratioLabel,
            duration: meta.duration,
            order,
            createdAt,
            blob: file,
          };

          await saveVideoRecord(record);

          addedVideos.push({
            id: record.id,
            section,
            name: record.name,
            size: record.size,
            type: record.type,
            width: record.width,
            height: record.height,
            aspectRatio: record.aspectRatio,
            ratioLabel: record.ratioLabel,
            duration: record.duration,
            order: record.order,
            createdAt: record.createdAt,
            objectUrl,
          });
        }

        const firstNewIndex = existingInSection.length;
        setVideos((prev) => [...prev, ...addedVideos]);
        setAudioSection(section);

        if (section === 'showreels') {
          setShowreelIndex(firstNewIndex);
          setShowreelPlaying(true);
        } else {
          setReelsIndex(firstNewIndex);
          setReelsPlaying(true);
        }
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    section: VideoSection
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files, section);
      e.target.value = '';
    }
  };

  const handleDeleteVideo = useCallback(
    async (id: string, section: VideoSection) => {
      const target = videosRef.current.find((v) => v.id === id);
      if (target) {
        URL.revokeObjectURL(target.objectUrl);
      }

      const remainingCount = videosRef.current.filter(
        (v) => v.section === section && v.id !== id
      ).length;

      await deleteVideoRecord(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));

      if (section === 'showreels') {
        setShowreelIndex((idx) => (remainingCount === 0 ? 0 : Math.min(idx, remainingCount - 1)));
      } else {
        setReelsIndex((idx) => (remainingCount === 0 ? 0 : Math.min(idx, remainingCount - 1)));
      }

      if (remainingCount === 0) {
        setLightboxTarget((curr) => (curr === section ? null : curr));
      }
    },
    []
  );

  const handleImagesSelected = useCallback(async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const validImages = incoming.filter(isImageFile);
    const rejectedCount = incoming.length - validImages.length;

    if (rejectedCount > 0 && validImages.length === 0) {
      setNotice('Please select image files from your gallery (JPG, PNG, WebP, or GIF).');
      return;
    }

    if (rejectedCount > 0) {
      setNotice(`Skipped ${rejectedCount} non-image file${rejectedCount > 1 ? 's' : ''}.`);
    } else {
      setNotice(null);
    }

    if (validImages.length === 0) return;

    setProcessingImages(true);
    try {
      const added: GalleryImage[] = [];
      for (let i = 0; i < validImages.length; i++) {
        const file = validImages[i];
        const meta = await extractImageMetadata(file);
        const id =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const objectUrl = URL.createObjectURL(file);
        const createdAt = Date.now() + i;

        const baseName = file.name.replace(/\.[^/.]+$/, '') || 'Engine Image';
        const record: StoredImageRecord = {
          id,
          name: baseName,
          title: baseName,
          description: '',
          size: file.size,
          type: file.type || 'image/jpeg',
          width: meta.width,
          height: meta.height,
          aspectRatio: meta.aspectRatio,
          createdAt,
          blob: file,
        };

        await saveImageRecord(record);

        added.push({
          id: record.id,
          name: record.name,
          title: record.title ?? record.name,
          description: record.description ?? '',
          size: record.size,
          type: record.type,
          width: record.width,
          height: record.height,
          aspectRatio: record.aspectRatio,
          createdAt: record.createdAt,
          objectUrl,
        });
      }

      setImages((prev) => [...prev, ...added]);
    } finally {
      setProcessingImages(false);
    }
  }, []);

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImagesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const handleUpdateImageInfo = useCallback(
    async (id: string, updates: { title: string; description: string }) => {
      await updateImageRecordInfo(id, updates);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, title: updates.title, description: updates.description }
            : img
        )
      );
    },
    []
  );

  const handleDeleteImage = useCallback(async (id: string) => {
    const target = imagesRef.current.find((img) => img.id === id);
    if (target) {
      URL.revokeObjectURL(target.objectUrl);
    }
    await deleteImageRecord(id);
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleSaveChannel = useCallback(
    async (payload: {
      id?: string;
      name: string;
      url: string;
      logoFile?: File | null;
      removeExistingLogo?: boolean;
    }) => {
      const existingChannel = payload.id
        ? channelsRef.current.find((ch) => ch.id === payload.id)
        : undefined;
      const existingRecord = payload.id
        ? await getYouTubeChannelRecord(payload.id)
        : null;

      const id =
        payload.id ??
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

      let nextBlob: Blob | undefined = existingRecord?.logoBlob;
      let nextObjectUrl: string | undefined = existingChannel?.logoObjectUrl;

      if (payload.logoFile) {
        if (existingChannel?.logoObjectUrl) {
          URL.revokeObjectURL(existingChannel.logoObjectUrl);
        }
        nextBlob = payload.logoFile;
        nextObjectUrl = URL.createObjectURL(payload.logoFile);
      } else if (payload.removeExistingLogo) {
        if (existingChannel?.logoObjectUrl) {
          URL.revokeObjectURL(existingChannel.logoObjectUrl);
        }
        nextBlob = undefined;
        nextObjectUrl = undefined;
      }

      const record: StoredChannelRecord = {
        id,
        name: payload.name,
        url: payload.url,
        createdAt: existingRecord?.createdAt ?? Date.now(),
        logoBlob: nextBlob,
      };

      await saveYouTubeChannelRecord(record);

      const nextChannel: YouTubeChannel = {
        id: record.id,
        name: record.name,
        url: record.url,
        createdAt: record.createdAt,
        logoObjectUrl: nextObjectUrl,
      };

      setChannels((prev) =>
        payload.id
          ? prev.map((ch) => (ch.id === payload.id ? nextChannel : ch))
          : [...prev, nextChannel]
      );
    },
    []
  );

  const handleDeleteChannel = useCallback(async (id: string) => {
    const target = channelsRef.current.find((ch) => ch.id === id);
    if (target?.logoObjectUrl) {
      URL.revokeObjectURL(target.logoObjectUrl);
    }
    await deleteYouTubeChannelRecord(id);
    setChannels((prev) => prev.filter((ch) => ch.id !== id));
  }, []);

  const handleSaveService = useCallback(
    async (payload: {
      id?: string;
      title: string;
      workDetails: string;
      mediaFile?: File | null;
      removeExistingMedia?: boolean;
    }) => {
      const existingService = payload.id
        ? servicesRef.current.find((s) => s.id === payload.id)
        : undefined;
      const existingRecord = payload.id
        ? await getExtraServiceRecord(payload.id)
        : null;

      const id =
        payload.id ??
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

      let nextBlob: Blob | undefined = existingRecord?.mediaBlob;
      let nextObjectUrl: string | undefined = existingService?.mediaObjectUrl;
      let nextKind: ServiceWorkMediaKind | undefined = existingRecord?.mediaKind;
      let nextAspect: number | undefined = existingRecord?.mediaAspectRatio;

      if (payload.mediaFile) {
        if (existingService?.mediaObjectUrl) {
          URL.revokeObjectURL(existingService.mediaObjectUrl);
        }
        nextBlob = payload.mediaFile;
        nextObjectUrl = URL.createObjectURL(payload.mediaFile);
        if (isImageFile(payload.mediaFile)) {
          nextKind = 'image';
          const meta = await extractImageMetadata(payload.mediaFile);
          nextAspect = meta.aspectRatio;
        } else {
          nextKind = 'video';
          const meta = await extractVideoMetadata(payload.mediaFile);
          nextAspect = meta.aspectRatio;
        }
      } else if (payload.removeExistingMedia) {
        if (existingService?.mediaObjectUrl) {
          URL.revokeObjectURL(existingService.mediaObjectUrl);
        }
        nextBlob = undefined;
        nextObjectUrl = undefined;
        nextKind = undefined;
        nextAspect = undefined;
      }

      const record: StoredServiceRecord = {
        id,
        title: payload.title,
        workDetails: payload.workDetails,
        mediaKind: nextKind,
        mediaBlob: nextBlob,
        mediaAspectRatio: nextAspect,
        createdAt: existingRecord?.createdAt ?? Date.now(),
      };

      await saveExtraServiceRecord(record);

      const nextService: ExtraService = {
        id: record.id,
        title: record.title,
        workDetails: record.workDetails,
        mediaKind: record.mediaKind,
        mediaObjectUrl: nextObjectUrl,
        mediaAspectRatio: record.mediaAspectRatio,
        createdAt: record.createdAt,
      };

      setServices((prev) =>
        payload.id
          ? prev.map((s) => (s.id === payload.id ? nextService : s))
          : [...prev, nextService]
      );
    },
    []
  );

  const handleDeleteService = useCallback(async (id: string) => {
    const target = servicesRef.current.find((s) => s.id === id);
    if (target?.mediaObjectUrl) {
      URL.revokeObjectURL(target.mediaObjectUrl);
    }
    await deleteExtraServiceRecord(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleQuickUploadPresets = useCallback(async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    setProcessingPresets(true);
    try {
      const added: PresetItem[] = [];
      for (let i = 0; i < incoming.length; i++) {
        const file = incoming[i];
        const id =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const title = file.name.replace(/\.[^/.]+$/, '') || 'Preset Pack';
        const category = inferPresetCategory(file.name);
        const fileExt = extractFileExtension(file.name);
        const fileObjectUrl = URL.createObjectURL(file);
        const createdAt = Date.now() + i;

        const record: StoredPresetRecord = {
          id,
          title,
          category,
          description: '',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          fileExt,
          fileBlob: file,
          downloads: 0,
          createdAt,
        };

        await savePresetRecord(record);

        added.push({
          id: record.id,
          title: record.title,
          category: record.category,
          description: record.description,
          fileName: record.fileName,
          fileSize: record.fileSize,
          fileType: record.fileType,
          fileExt: record.fileExt,
          fileObjectUrl,
          downloads: 0,
          createdAt: record.createdAt,
        });
      }

      setPresets((prev) => [...added.reverse(), ...prev]);
    } finally {
      setProcessingPresets(false);
    }
  }, []);

  const handleSavePreset = useCallback(
    async (payload: {
      id?: string;
      title: string;
      category: PresetCategory;
      description: string;
      presetFile?: File | null;
      previewFile?: File | null;
      removeExistingPreview?: boolean;
    }) => {
      const existingItem = payload.id
        ? presetsRef.current.find((p) => p.id === payload.id)
        : undefined;
      const existingRecord = payload.id ? await getPresetRecord(payload.id) : null;

      if (!payload.presetFile && !existingRecord?.fileBlob) return;

      const id =
        payload.id ??
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

      let nextFileBlob: Blob = existingRecord!.fileBlob;
      let nextFileName = existingRecord?.fileName ?? 'preset.bin';
      let nextFileSize = existingRecord?.fileSize ?? 0;
      let nextFileType = existingRecord?.fileType ?? 'application/octet-stream';
      let nextFileExt = existingRecord?.fileExt ?? 'FILE';
      let nextFileObjectUrl = existingItem?.fileObjectUrl ?? '';

      if (payload.presetFile) {
        if (existingItem?.fileObjectUrl) {
          URL.revokeObjectURL(existingItem.fileObjectUrl);
        }
        nextFileBlob = payload.presetFile;
        nextFileName = payload.presetFile.name;
        nextFileSize = payload.presetFile.size;
        nextFileType = payload.presetFile.type || 'application/octet-stream';
        nextFileExt = extractFileExtension(payload.presetFile.name);
        nextFileObjectUrl = URL.createObjectURL(payload.presetFile);
      }

      let nextPreviewBlob: Blob | undefined = existingRecord?.previewBlob;
      let nextPreviewKind: PresetPreviewKind | undefined = existingRecord?.previewKind;
      let nextPreviewObjectUrl: string | undefined = existingItem?.previewObjectUrl;

      if (payload.previewFile) {
        if (existingItem?.previewObjectUrl) {
          URL.revokeObjectURL(existingItem.previewObjectUrl);
        }
        nextPreviewBlob = payload.previewFile;
        nextPreviewKind = isImageFile(payload.previewFile) ? 'image' : 'video';
        nextPreviewObjectUrl = URL.createObjectURL(payload.previewFile);
      } else if (payload.removeExistingPreview) {
        if (existingItem?.previewObjectUrl) {
          URL.revokeObjectURL(existingItem.previewObjectUrl);
        }
        nextPreviewBlob = undefined;
        nextPreviewKind = undefined;
        nextPreviewObjectUrl = undefined;
      }

      const record: StoredPresetRecord = {
        id,
        title: payload.title,
        category: payload.category,
        description: payload.description,
        fileName: nextFileName,
        fileSize: nextFileSize,
        fileType: nextFileType,
        fileExt: nextFileExt,
        fileBlob: nextFileBlob,
        previewKind: nextPreviewKind,
        previewBlob: nextPreviewBlob,
        downloads: existingRecord?.downloads ?? 0,
        createdAt: existingRecord?.createdAt ?? Date.now(),
      };

      await savePresetRecord(record);

      const nextPreset: PresetItem = {
        id: record.id,
        title: record.title,
        category: record.category,
        description: record.description,
        fileName: record.fileName,
        fileSize: record.fileSize,
        fileType: record.fileType,
        fileExt: record.fileExt,
        fileObjectUrl: nextFileObjectUrl,
        previewKind: record.previewKind,
        previewObjectUrl: nextPreviewObjectUrl,
        downloads: record.downloads,
        createdAt: record.createdAt,
      };

      setPresets((prev) =>
        payload.id
          ? prev.map((p) => (p.id === payload.id ? nextPreset : p))
          : [nextPreset, ...prev]
      );
    },
    []
  );

  const handleDeletePreset = useCallback(async (id: string) => {
    const target = presetsRef.current.find((p) => p.id === id);
    if (target) {
      URL.revokeObjectURL(target.fileObjectUrl);
      if (target.previewObjectUrl) {
        URL.revokeObjectURL(target.previewObjectUrl);
      }
    }
    await deletePresetRecord(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleDownloadPreset = useCallback(async (preset: PresetItem) => {
    const link = document.createElement('a');
    link.href = preset.fileObjectUrl;
    link.download = preset.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const nextCount = await incrementPresetDownload(preset.id);
    setPresets((prev) =>
      prev.map((p) => (p.id === preset.id ? { ...p, downloads: nextCount } : p))
    );
  }, []);

  const lightboxList = lightboxTarget === 'reels' ? reelsVideos : showreelVideos;
  const lightboxIdx = lightboxTarget === 'reels' ? reelsIndex : showreelIndex;
  const activeLightboxVideo =
    lightboxTarget !== null ? lightboxList[lightboxIdx] ?? null : null;

  const isShowreelsActive = showreelPlaying && showreelsVisible && lightboxTarget === null;
  const isReelsActive = reelsPlaying && reelsVisible && lightboxTarget === null;

  return (
    <div id="top" className="relative min-h-screen bg-[#0B0908] text-[#F7F1E8] flex flex-col">
      <LivingForestBackground />

      {/* Dedicated Hidden File Inputs */}
      <input
        ref={showreelInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={(e) => handleFileInputChange(e, 'showreels')}
        className="sr-only"
        aria-label="Upload videos to Showreels"
      />
      <input
        ref={reelsInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={(e) => handleFileInputChange(e, 'reels')}
        className="sr-only"
        aria-label="Upload videos to My Reels and Edits"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageInputChange}
        className="sr-only"
        aria-label="Upload images to Gallery"
      />

      <Navbar onNavigateHome={currentPage === 'presets' ? navigateToHome : undefined} />

      <main className="relative z-10 flex-1 overflow-x-clip pt-[69px]">
        {notice && (
          <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6">
            <div
              role="status"
              className="flex max-w-xl items-center justify-between gap-4 rounded-xl border border-[#F97316]/35 bg-[#1B130E]/90 px-4 py-3 text-sm text-[#FED7AA]"
            >
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-xs font-medium text-[#F97316] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {currentPage === 'presets' ? (
          isHydrated ? (
            <PresetsPage
              presets={presets}
              isProcessing={processingPresets}
              onBackHome={navigateToHome}
              onQuickUploadFiles={handleQuickUploadPresets}
              onSavePreset={handleSavePreset}
              onDeletePreset={handleDeletePreset}
              onDownloadPreset={handleDownloadPreset}
            />
          ) : (
            <div className="flex h-[420px] w-full items-center justify-center">
              <p className="text-sm text-[#A89A8A]">Opening presets library...</p>
            </div>
          )
        ) : (
          <>
            {/* Top Intro Section: Animated Sonu Purvey (Left) & Circular Tiger Image (Right), Centered */}
            <HeroIntroShowcase />

            {/* Flying Air Balloon Plane (Right to Left) with "Welcome Here" Banner */}
            <ParallaxLayer offset={16}>
              <WelcomeAirshipBanner />
            </ParallaxLayer>

        {/* Section 1: Upper 3D Stage — Showreels */}
        <section
          ref={showreelSectionRef}
          className="mx-auto w-full max-w-[1440px] px-2 pt-4 pb-10 sm:px-6 lg:pt-6"
        >
          <ParallaxLayer offset={14}>
            <div className="mb-4 flex items-center justify-between gap-4 px-2 sm:px-0">
              <h2 className="text-2xl font-semibold tracking-tight text-[#FAF6F0] sm:text-3xl">
                Showreels
              </h2>
              <button
                type="button"
                onClick={() => showreelInputRef.current?.click()}
                disabled={processingShowreels}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F97316]/40 bg-[#1B130E]/85 px-3.5 text-xs font-semibold text-[#FDBA74] transition-colors duration-150 hover:border-[#F97316] hover:bg-[#EA580C] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{processingShowreels ? 'Adding...' : 'Upload Videos'}</span>
              </button>
            </div>
          </ParallaxLayer>

          {!isHydrated ? (
            <div className="flex h-[420px] w-full items-center justify-center">
              <p className="text-sm text-[#A89A8A]">Opening local gallery...</p>
            </div>
          ) : (
            <ParallaxLayer offset={26}>
              <TigerCarousel3D
                videos={showreelVideos}
                activeIndex={showreelIndex}
                onActiveIndexChange={setShowreelIndex}
                onFilesSelected={(files) => handleFilesSelected(files, 'showreels')}
                onDeleteVideo={(id) => handleDeleteVideo(id, 'showreels')}
                isPlaying={isShowreelsActive}
                isMuted={audioSection !== 'showreels'}
                audioUnlocked={audioUnlocked}
                onTogglePlay={() => {
                  setAudioUnlocked(true);
                  setAudioSection('showreels');
                  setShowreelPlaying((prev) => !prev);
                }}
                onTriggerFilePicker={() => showreelInputRef.current?.click()}
                onOpenLightbox={() => setLightboxTarget('showreels')}
                onFocusSection={() => {
                  setAudioUnlocked(true);
                  setAudioSection('showreels');
                }}
                isProcessing={processingShowreels}
              />
            </ParallaxLayer>
          )}
        </section>

        {/* Flying Plane with "Contact Now" Banner between Showreels and My Reels and Edits */}
        <ParallaxLayer offset={20}>
          <FlyingBannerPlane
            audioUnlocked={audioUnlocked}
            isVideoAudioPlaying={
              (isShowreelsActive && showreelVideos.length > 0 && audioSection === 'showreels') ||
              (isReelsActive && reelsVideos.length > 0 && audioSection === 'reels')
            }
          />
        </ParallaxLayer>

        {/* Section 2: My Reels and Edits (Left Half) & Animated Experience (Right Half) */}
        <section
          ref={reelsSectionRef}
          className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-16 sm:px-6"
        >
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-8">
            <ParallaxLayer offset={20} className="w-full min-w-0">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold tracking-tight text-[#FAF6F0] sm:text-2xl">
                  My Reels and Edits
                </h2>
                <button
                  type="button"
                  onClick={() => reelsInputRef.current?.click()}
                  disabled={processingReels}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F97316]/40 bg-[#1B130E]/85 px-3.5 text-xs font-semibold text-[#FDBA74] transition-colors duration-150 hover:border-[#F97316] hover:bg-[#EA580C] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{processingReels ? 'Adding...' : 'Upload Reels'}</span>
                </button>
              </div>

              {isHydrated && (
                <ReelsOrbitalCarousel3D
                  videos={reelsVideos}
                  activeIndex={reelsIndex}
                  onActiveIndexChange={setReelsIndex}
                  onFilesSelected={(files) => handleFilesSelected(files, 'reels')}
                  onDeleteVideo={(id) => handleDeleteVideo(id, 'reels')}
                  isPlaying={isReelsActive}
                  isMuted={audioSection !== 'reels'}
                  audioUnlocked={audioUnlocked}
                  onTogglePlay={() => {
                    setAudioUnlocked(true);
                    setAudioSection('reels');
                    setReelsPlaying((prev) => !prev);
                  }}
                  onTriggerFilePicker={() => reelsInputRef.current?.click()}
                  onOpenLightbox={() => setLightboxTarget('reels')}
                  onFocusSection={() => {
                    setAudioUnlocked(true);
                    setAudioSection('reels');
                  }}
                  isProcessing={processingReels}
                />
              )}
            </ParallaxLayer>

            <ParallaxLayer offset={38} className="flex w-full items-center justify-center">
              <ExperienceShowcase />
            </ParallaxLayer>
          </div>
        </section>

        {/* Section 3: Engine Used by Me — 3D Curved Boxes */}
        {isHydrated && (
          <ParallaxLayer offset={24}>
            <ImageMarqueeSection
              images={images}
              onFilesSelected={handleImagesSelected}
              onTriggerFilePicker={() => imageInputRef.current?.click()}
              onUpdateImageInfo={handleUpdateImageInfo}
              onDeleteImage={handleDeleteImage}
              isProcessing={processingImages}
            />
          </ParallaxLayer>
        )}

        {/* Section 4: Extra Services */}
        {isHydrated && (
          <ParallaxLayer offset={21}>
            <ExtraServicesSection
              services={services}
              presetsCount={presets.length}
              onOpenPresets={navigateToPresets}
              onSaveService={handleSaveService}
              onDeleteService={handleDeleteService}
            />
          </ParallaxLayer>
        )}

        {/* Section 5: YouTube Channels */}
        {isHydrated && (
          <ParallaxLayer offset={18}>
            <YouTubeChannelsSection
              channels={channels}
              onSaveChannel={handleSaveChannel}
              onDeleteChannel={handleDeleteChannel}
            />
          </ParallaxLayer>
        )}

        {/* Section 5: Contact */}
        <ContactSection />
          </>
        )}
      </main>

      <footer
        id="connect-footer"
        className="relative z-10 border-t border-white/10 bg-[#041108]/92 py-5"
      >
        <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.06em] text-[#8C7F70]">
            <span className="h-6 w-6 shrink-0 overflow-hidden rounded-md border border-white/15 bg-[#1B130E]">
              <img
                src="/assets/aistudio/63cd9e8a-889e-4af6-a583-da515677f63c_6ede8ecc.png"
                alt="PURVEY tiger mascot"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </span>
            <span>PURVEY</span>
          </span>
          <SocialLinks variant="compact" />
        </div>
      </footer>

      <VideoLightbox
        video={activeLightboxVideo}
        onClose={() => setLightboxTarget(null)}
        onDelete={
          activeLightboxVideo
            ? () => handleDeleteVideo(activeLightboxVideo.id, activeLightboxVideo.section)
            : undefined
        }
        onPrev={() => {
          if (lightboxTarget === 'reels') {
            setReelsIndex((i) => Math.max(0, i - 1));
          } else {
            setShowreelIndex((i) => Math.max(0, i - 1));
          }
        }}
        onNext={() => {
          if (lightboxTarget === 'reels') {
            setReelsIndex((i) => Math.min(reelsVideos.length - 1, i + 1));
          } else {
            setShowreelIndex((i) => Math.min(showreelVideos.length - 1, i + 1));
          }
        }}
        hasPrev={lightboxIdx > 0}
        hasNext={lightboxIdx < lightboxList.length - 1}
      />
    </div>
  );
}
