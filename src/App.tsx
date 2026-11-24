import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { CloudUpload, Lock, LogOut, Plus } from 'lucide-react';
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
import {
  auth,
  isOwnerUser,
  OWNER_ADMIN_EMAIL,
  signInWithOwnerGoogle,
  signOutOwner,
} from './firebase';
import { YouTubeChannel } from './types/channel';
import { GalleryImage } from './types/image';
import { PresetCategory, PresetItem, PresetPreviewKind } from './types/preset';
import { ExtraService, ServiceWorkMediaKind } from './types/service';
import { GalleryVideo, VideoSection } from './types/video';
import {
  getYouTubeChannelRecord,
  loadYouTubeChannels,
} from './utils/channelStorage';
import { extractImageMetadata, isImageFile, loadGalleryImages } from './utils/imageStorage';
import {
  createCloudEngine,
  createCloudVideo,
  deleteCloudChannel,
  deleteCloudEngine,
  deleteCloudPreset,
  deleteCloudService,
  deleteCloudVideo,
  saveCloudChannel,
  saveCloudPreset,
  saveCloudService,
  subscribeCloudChannels,
  subscribeCloudEngines,
  subscribeCloudPresets,
  subscribeCloudServices,
  subscribeCloudVideos,
  updateCloudEngineInfo,
} from './utils/portfolioCloudSync';
import {
  extractFileExtension,
  getPresetRecord,
  inferPresetCategory,
  loadPresets,
} from './utils/presetStorage';
import { getExtraServiceRecord, loadExtraServices } from './utils/serviceStorage';
import {
  extractVideoMetadata,
  isVideoFile,
  loadGalleryVideos,
} from './utils/videoStorage';

export default function App() {
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const canEdit = useMemo(() => isOwnerUser(currentUser), [currentUser]);

  const [videos, setVideos] = useState<GalleryVideo[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [services, setServices] = useState<ExtraService[]>([]);
  const [presets, setPresets] = useState<PresetItem[]>([]);

  const [processingPresets, setProcessingPresets] = useState<boolean>(false);
  const [processingImages, setProcessingImages] = useState<boolean>(false);
  const [isSyncingLocal, setIsSyncingLocal] = useState<boolean>(false);
  const [localDraftCount, setLocalDraftCount] = useState<number>(0);

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

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

  // Subscribe to shared Firestore showcase collections once Firebase Auth finishes initializing
  useEffect(() => {
    if (!authReady) return;

    const loadedFlags = {
      videos: false,
      engines: false,
      services: false,
      channels: false,
      presets: false,
    };

    const markLoaded = (key: keyof typeof loadedFlags) => {
      loadedFlags[key] = true;
      if (
        loadedFlags.videos &&
        loadedFlags.engines &&
        loadedFlags.services &&
        loadedFlags.channels &&
        loadedFlags.presets
      ) {
        setIsHydrated(true);
      }
    };

    const unsubVideos = subscribeCloudVideos(
      (items) => {
        setVideos(items);
        markLoaded('videos');
      },
      (msg) => setNotice(msg)
    );

    const unsubEngines = subscribeCloudEngines(
      (items) => {
        setImages(items);
        markLoaded('engines');
      },
      (msg) => setNotice(msg)
    );

    const unsubServices = subscribeCloudServices(
      (items) => {
        setServices(items);
        markLoaded('services');
      },
      (msg) => setNotice(msg)
    );

    const unsubChannels = subscribeCloudChannels(
      (items) => {
        setChannels(items);
        markLoaded('channels');
      },
      (msg) => setNotice(msg)
    );

    const unsubPresets = subscribeCloudPresets(
      (items) => {
        setPresets(items);
        markLoaded('presets');
      },
      (msg) => setNotice(msg)
    );

    const safetyTimeout = window.setTimeout(() => {
      setIsHydrated(true);
    }, 3500);

    return () => {
      window.clearTimeout(safetyTimeout);
      unsubVideos();
      unsubEngines();
      unsubServices();
      unsubChannels();
      unsubPresets();
    };
  }, [authReady]);

  // Check if owner has any legacy browser-local IndexedDB drafts not yet in Firestore
  useEffect(() => {
    if (!canEdit || !isHydrated) {
      setLocalDraftCount(0);
      return;
    }

    let cancelled = false;
    Promise.all([
      loadGalleryVideos(),
      loadGalleryImages(),
      loadExtraServices(),
      loadYouTubeChannels(),
      loadPresets(),
    ]).then(([localVids, localImgs, localSrvs, localChs, localPsts]) => {
      if (cancelled) return;

      const cloudVidIds = new Set(videos.map((v) => v.id));
      const cloudImgIds = new Set(images.map((i) => i.id));
      const cloudSrvIds = new Set(services.map((s) => s.id));
      const cloudChIds = new Set(channels.map((c) => c.id));
      const cloudPstIds = new Set(presets.map((p) => p.id));

      const count =
        localVids.filter((v) => !cloudVidIds.has(v.id)).length +
        localImgs.filter((i) => !cloudImgIds.has(i.id)).length +
        localSrvs.filter((s) => !cloudSrvIds.has(s.id)).length +
        localChs.filter((c) => !cloudChIds.has(c.id)).length +
        localPsts.filter((p) => !cloudPstIds.has(p.id)).length;

      setLocalDraftCount(count);
    });

    return () => {
      cancelled = true;
    };
  }, [canEdit, isHydrated, videos, images, services, channels, presets]);

  const handleSyncLocalDrafts = useCallback(async () => {
    if (!canEdit || !currentUser || isSyncingLocal) return;
    setIsSyncingLocal(true);
    setNotice(null);

    try {
      const [localVids, localImgs, localSrvs, localChs, localPsts] = await Promise.all([
        loadGalleryVideos(),
        loadGalleryImages(),
        loadExtraServices(),
        loadYouTubeChannels(),
        loadPresets(),
      ]);

      const cloudVidIds = new Set(videosRef.current.map((v) => v.id));
      const cloudImgIds = new Set(imagesRef.current.map((i) => i.id));
      const cloudSrvIds = new Set(servicesRef.current.map((s) => s.id));
      const cloudChIds = new Set(channelsRef.current.map((c) => c.id));
      const cloudPstIds = new Set(presetsRef.current.map((p) => p.id));

      for (const vid of localVids) {
        if (cloudVidIds.has(vid.id)) continue;
        const blob = await fetch(vid.objectUrl).then((r) => r.blob());
        await createCloudVideo({
          id: vid.id,
          section: vid.section,
          name: vid.name,
          size: vid.size,
          type: vid.type,
          width: vid.width,
          height: vid.height,
          aspectRatio: vid.aspectRatio,
          ratioLabel: vid.ratioLabel,
          duration: vid.duration,
          order: vid.order,
          blob,
          ownerUid: currentUser.uid,
        });
      }

      for (const img of localImgs) {
        if (cloudImgIds.has(img.id)) continue;
        const blob = await fetch(img.objectUrl).then((r) => r.blob());
        await createCloudEngine({
          id: img.id,
          name: img.name,
          title: img.title,
          description: img.description,
          size: img.size,
          type: img.type,
          width: img.width,
          height: img.height,
          aspectRatio: img.aspectRatio,
          blob,
          ownerUid: currentUser.uid,
        });
      }

      for (const srv of localSrvs) {
        if (cloudSrvIds.has(srv.id)) continue;
        const rec = await getExtraServiceRecord(srv.id);
        await saveCloudService({
          id: srv.id,
          title: srv.title,
          workDetails: srv.workDetails,
          mediaKind: rec?.mediaKind,
          mediaBlob: rec?.mediaBlob,
          mediaAspectRatio: rec?.mediaAspectRatio,
          ownerUid: currentUser.uid,
        });
      }

      for (const ch of localChs) {
        if (cloudChIds.has(ch.id)) continue;
        const rec = await getYouTubeChannelRecord(ch.id);
        await saveCloudChannel({
          id: ch.id,
          name: ch.name,
          url: ch.url,
          logoBlob: rec?.logoBlob,
          ownerUid: currentUser.uid,
        });
      }

      for (const pst of localPsts) {
        if (cloudPstIds.has(pst.id)) continue;
        const rec = await getPresetRecord(pst.id);
        if (!rec?.fileBlob) continue;
        await saveCloudPreset({
          id: pst.id,
          title: pst.title,
          category: pst.category,
          description: pst.description,
          fileName: pst.fileName,
          fileSize: pst.fileSize,
          fileType: pst.fileType,
          fileExt: pst.fileExt,
          fileBlob: rec.fileBlob,
          previewKind: rec.previewKind,
          previewBlob: rec.previewBlob,
          downloads: pst.downloads,
          ownerUid: currentUser.uid,
        });
      }

      setNotice('All local uploads have been published live for every visitor.');
      setLocalDraftCount(0);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to sync local uploads.');
    } finally {
      setIsSyncingLocal(false);
    }
  }, [canEdit, currentUser, isSyncingLocal]);

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
      if (!canEdit || !currentUser) return;
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

        for (let i = 0; i < validVideos.length; i++) {
          const file = validVideos[i];
          const meta = await extractVideoMetadata(file);
          await createCloudVideo({
            section,
            name: file.name.replace(/\.[^/.]+$/, '') || 'Gallery Video',
            size: file.size,
            type: file.type || 'video/mp4',
            width: meta.width,
            height: meta.height,
            aspectRatio: meta.aspectRatio,
            ratioLabel: meta.ratioLabel,
            duration: meta.duration,
            order: startOrder + i,
            blob: file,
            ownerUid: currentUser.uid,
          });
        }

        const firstNewIndex = existingInSection.length;
        setAudioSection(section);

        if (section === 'showreels') {
          setShowreelIndex(firstNewIndex);
          setShowreelPlaying(true);
        } else {
          setReelsIndex(firstNewIndex);
          setReelsPlaying(true);
        }
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Unable to upload video.');
      } finally {
        setProcessing(false);
      }
    },
    [canEdit, currentUser]
  );

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    section: VideoSection
  ) => {
    if (!canEdit) return;
    if (e.target.files && e.target.files.length > 0) {
      void handleFilesSelected(e.target.files, section);
      e.target.value = '';
    }
  };

  const handleDeleteVideo = useCallback(
    async (id: string, section: VideoSection) => {
      if (!canEdit) return;
      const target = videosRef.current.find((v) => v.id === id);
      if (!target) return;

      const remainingCount = videosRef.current.filter(
        (v) => v.section === section && v.id !== id
      ).length;

      try {
        await deleteCloudVideo(target);

        if (section === 'showreels') {
          setShowreelIndex((idx) => (remainingCount === 0 ? 0 : Math.min(idx, remainingCount - 1)));
        } else {
          setReelsIndex((idx) => (remainingCount === 0 ? 0 : Math.min(idx, remainingCount - 1)));
        }

        if (remainingCount === 0) {
          setLightboxTarget((curr) => (curr === section ? null : curr));
        }
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Unable to delete video.');
      }
    },
    [canEdit]
  );

  const handleImagesSelected = useCallback(
    async (fileList: FileList | File[]) => {
      if (!canEdit || !currentUser) return;
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
        for (let i = 0; i < validImages.length; i++) {
          const file = validImages[i];
          const meta = await extractImageMetadata(file);
          const baseName = file.name.replace(/\.[^/.]+$/, '') || 'Engine Image';
          await createCloudEngine({
            name: baseName,
            title: baseName,
            description: '',
            size: file.size,
            type: file.type || 'image/jpeg',
            width: meta.width,
            height: meta.height,
            aspectRatio: meta.aspectRatio,
            blob: file,
            ownerUid: currentUser.uid,
          });
        }
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Unable to upload image.');
      } finally {
        setProcessingImages(false);
      }
    },
    [canEdit, currentUser]
  );

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    if (e.target.files && e.target.files.length > 0) {
      void handleImagesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const handleUpdateImageInfo = useCallback(
    async (id: string, updates: { title: string; description: string }) => {
      if (!canEdit) return;
      await updateCloudEngineInfo(id, updates);
    },
    [canEdit]
  );

  const handleDeleteImage = useCallback(
    async (id: string) => {
      if (!canEdit) return;
      const target = imagesRef.current.find((img) => img.id === id);
      if (!target) return;
      await deleteCloudEngine(target);
    },
    [canEdit]
  );

  const handleSaveChannel = useCallback(
    async (payload: {
      id?: string;
      name: string;
      url: string;
      logoFile?: File | null;
      removeExistingLogo?: boolean;
    }) => {
      if (!canEdit || !currentUser) return;
      const existing = payload.id
        ? channelsRef.current.find((ch) => ch.id === payload.id)
        : undefined;

      await saveCloudChannel({
        existing,
        id: payload.id,
        name: payload.name,
        url: payload.url,
        logoBlob: payload.logoFile ?? undefined,
        removeExistingLogo: payload.removeExistingLogo,
        ownerUid: currentUser.uid,
      });
    },
    [canEdit, currentUser]
  );

  const handleDeleteChannel = useCallback(
    async (id: string) => {
      if (!canEdit) return;
      const target = channelsRef.current.find((ch) => ch.id === id);
      if (!target) return;
      await deleteCloudChannel(target);
    },
    [canEdit]
  );

  const handleSaveService = useCallback(
    async (payload: {
      id?: string;
      title: string;
      workDetails: string;
      mediaFile?: File | null;
      removeExistingMedia?: boolean;
    }) => {
      if (!canEdit || !currentUser) return;
      const existing = payload.id
        ? servicesRef.current.find((s) => s.id === payload.id)
        : undefined;

      let mediaKind: ServiceWorkMediaKind | undefined;
      let mediaAspectRatio: number | undefined;
      if (payload.mediaFile) {
        if (isImageFile(payload.mediaFile)) {
          mediaKind = 'image';
          const meta = await extractImageMetadata(payload.mediaFile);
          mediaAspectRatio = meta.aspectRatio;
        } else {
          mediaKind = 'video';
          const meta = await extractVideoMetadata(payload.mediaFile);
          mediaAspectRatio = meta.aspectRatio;
        }
      }

      await saveCloudService({
        existing,
        id: payload.id,
        title: payload.title,
        workDetails: payload.workDetails,
        mediaKind,
        mediaBlob: payload.mediaFile ?? undefined,
        mediaAspectRatio,
        removeExistingMedia: payload.removeExistingMedia,
        ownerUid: currentUser.uid,
      });
    },
    [canEdit, currentUser]
  );

  const handleDeleteService = useCallback(
    async (id: string) => {
      if (!canEdit) return;
      const target = servicesRef.current.find((s) => s.id === id);
      if (!target) return;
      await deleteCloudService(target);
    },
    [canEdit]
  );

  const handleQuickUploadPresets = useCallback(
    async (fileList: FileList | File[]) => {
      if (!canEdit || !currentUser) return;
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      setProcessingPresets(true);
      try {
        for (let i = 0; i < incoming.length; i++) {
          const file = incoming[i];
          const title = file.name.replace(/\.[^/.]+$/, '') || 'Preset Pack';
          const category = inferPresetCategory(file.name);
          const fileExt = extractFileExtension(file.name);

          await saveCloudPreset({
            title,
            category,
            description: '',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
            fileExt,
            fileBlob: file,
            downloads: 0,
            ownerUid: currentUser.uid,
          });
        }
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Unable to upload preset.');
      } finally {
        setProcessingPresets(false);
      }
    },
    [canEdit, currentUser]
  );

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
      if (!canEdit || !currentUser) return;
      const existing = payload.id
        ? presetsRef.current.find((p) => p.id === payload.id)
        : undefined;

      if (!payload.presetFile && !existing?.fileMediaId) return;

      let previewKind: PresetPreviewKind | undefined;
      if (payload.previewFile) {
        previewKind = isImageFile(payload.previewFile) ? 'image' : 'video';
      }

      await saveCloudPreset({
        existing,
        id: payload.id,
        title: payload.title,
        category: payload.category,
        description: payload.description,
        fileName: payload.presetFile?.name,
        fileSize: payload.presetFile?.size,
        fileType: payload.presetFile?.type || 'application/octet-stream',
        fileExt: payload.presetFile ? extractFileExtension(payload.presetFile.name) : undefined,
        fileBlob: payload.presetFile ?? undefined,
        previewKind,
        previewBlob: payload.previewFile ?? undefined,
        removeExistingPreview: payload.removeExistingPreview,
        ownerUid: currentUser.uid,
      });
    },
    [canEdit, currentUser]
  );

  const handleDeletePreset = useCallback(
    async (id: string) => {
      if (!canEdit) return;
      const target = presetsRef.current.find((p) => p.id === id);
      if (!target) return;
      await deleteCloudPreset(target);
    },
    [canEdit]
  );

  // Public visitors can download any published preset read-only without mutating Firestore
  const handleDownloadPreset = useCallback(async (preset: PresetItem) => {
    const link = document.createElement('a');
    link.href = preset.fileObjectUrl;
    link.download = preset.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleOwnerLogin = useCallback(async () => {
    try {
      const user = await signInWithOwnerGoogle();
      if (!isOwnerUser(user)) {
        setNotice(
          `Signed in as ${user.email ?? 'visitor'}. Only the portfolio owner (${OWNER_ADMIN_EMAIL}) can publish or modify content.`
        );
      } else {
        setNotice(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('popup-closed-by-user')) {
        setNotice('Google sign-in could not be completed. Please try again.');
      }
    }
  }, []);

  const handleOwnerLogout = useCallback(async () => {
    await signOutOwner();
    setNotice(null);
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

      {/* Dedicated Hidden File Inputs (owner only) */}
      {canEdit && (
        <>
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
        </>
      )}

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
              canEdit={canEdit}
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
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => showreelInputRef.current?.click()}
                      disabled={processingShowreels}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F97316]/40 bg-[#1B130E]/85 px-3.5 text-xs font-semibold text-[#FDBA74] transition-colors duration-150 hover:border-[#F97316] hover:bg-[#EA580C] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{processingShowreels ? 'Adding...' : 'Upload Videos'}</span>
                    </button>
                  )}
                </div>
              </ParallaxLayer>

              {!isHydrated ? (
                <div className="flex h-[420px] w-full items-center justify-center">
                  <p className="text-sm text-[#A89A8A]">Loading showcase...</p>
                </div>
              ) : (
                <ParallaxLayer offset={26}>
                  <TigerCarousel3D
                    canEdit={canEdit}
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
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => reelsInputRef.current?.click()}
                        disabled={processingReels}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F97316]/40 bg-[#1B130E]/85 px-3.5 text-xs font-semibold text-[#FDBA74] transition-colors duration-150 hover:border-[#F97316] hover:bg-[#EA580C] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{processingReels ? 'Adding...' : 'Upload Reels'}</span>
                      </button>
                    )}
                  </div>

                  {isHydrated && (
                    <ReelsOrbitalCarousel3D
                      canEdit={canEdit}
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
                  canEdit={canEdit}
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
                  canEdit={canEdit}
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
                  canEdit={canEdit}
                  channels={channels}
                  onSaveChannel={handleSaveChannel}
                  onDeleteChannel={handleDeleteChannel}
                />
              </ParallaxLayer>
            )}

            {/* Section 6: Contact */}
            <ContactSection />
          </>
        )}
      </main>

      <footer
        id="connect-footer"
        className="relative z-10 border-t border-white/10 bg-[#041108]/92 py-5"
      >
        <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
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

            {authReady && (
              currentUser ? (
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#8C7F70]">
                  {canEdit && localDraftCount > 0 && (
                    <button
                      type="button"
                      onClick={handleSyncLocalDrafts}
                      disabled={isSyncingLocal}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#F97316]/40 bg-[#1B130E]/90 px-2.5 py-1 text-[11px] font-medium text-[#FDBA74] transition-colors hover:border-[#F97316] hover:text-[#FFF7ED] disabled:opacity-60 cursor-pointer"
                    >
                      <CloudUpload className="h-3 w-3" />
                      <span>
                        {isSyncingLocal
                          ? 'Publishing...'
                          : `Publish ${localDraftCount} Local Upload${localDraftCount > 1 ? 's' : ''}`}
                      </span>
                    </button>
                  )}

                  <span className="text-[11px] text-[#8C7F70]">
                    {canEdit ? 'Owner Mode' : 'Signed In'}
                  </span>
                  <button
                    type="button"
                    onClick={handleOwnerLogout}
                    className="inline-flex items-center gap-1 text-[11px] text-[#8C7F70] transition-colors hover:text-[#FAF6F0] cursor-pointer"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOwnerLogin}
                  aria-label="Owner Sign In"
                  className="inline-flex items-center gap-1 text-[11px] text-[#6B5F52] transition-colors hover:text-[#B6A99A] cursor-pointer"
                >
                  <Lock className="h-3 w-3" />
                  <span>Owner</span>
                </button>
              )
            )}
          </div>
          <SocialLinks variant="compact" />
        </div>
      </footer>

      <VideoLightbox
        video={activeLightboxVideo}
        onClose={() => setLightboxTarget(null)}
        onDelete={
          canEdit && activeLightboxVideo
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
