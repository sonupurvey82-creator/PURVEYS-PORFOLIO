import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { YouTubeChannel } from '../types/channel';
import { GalleryImage } from '../types/image';
import { PresetCategory, PresetItem, PresetPreviewKind } from '../types/preset';
import { ExtraService, ServiceWorkMediaKind } from '../types/service';
import { GalleryVideo, VideoSection } from '../types/video';
import {
  deleteCloudMedia,
  fetchBlobUrlFromCloud,
  uploadBlobToCloud,
} from './cloudMediaStorage';

function generateValidId(prefix: string): string {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${raw}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function clampString(value: string, maxLength: number, fallback = ''): string {
  const cleaned = value.trim();
  if (!cleaned) return fallback.slice(0, maxLength);
  return cleaned.slice(0, maxLength);
}

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return Date.now();
}

// ============================================================================
// VIDEOS (Showreels + My Reels and Edits)
// ============================================================================

interface FirestoreVideoDoc {
  section: VideoSection;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
  ratioLabel: string;
  duration: number;
  order: number;
  mediaId: string;
  chunkCount: number;
  isPublic: boolean;
  ownerUid: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export function subscribeCloudVideos(
  onData: (videos: GalleryVideo[]) => void,
  onHydrationError?: (msg: string) => void
): () => void {
  const q = query(collection(db, 'videos'), where('isPublic', '==', true));
  let generation = 0;

  return onSnapshot(
    q,
    (snapshot) => {
      const myGen = ++generation;
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        data: d.data() as FirestoreVideoDoc,
      }));

      Promise.all(
        docs.map(async ({ id, data }) => {
          const objectUrl = await fetchBlobUrlFromCloud(
            data.mediaId,
            data.chunkCount,
            data.type || 'video/mp4'
          );
          return {
            id,
            section: data.section === 'reels' ? 'reels' : 'showreels',
            name: data.name,
            size: data.size,
            type: data.type,
            width: data.width,
            height: data.height,
            aspectRatio: data.aspectRatio,
            ratioLabel: data.ratioLabel,
            duration: data.duration,
            order: data.order,
            createdAt: toMillis(data.createdAt),
            objectUrl,
            mediaId: data.mediaId,
            chunkCount: data.chunkCount,
          } satisfies GalleryVideo;
        })
      )
        .then((resolved) => {
          if (myGen !== generation) return;
          resolved.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
          onData(resolved);
        })
        .catch((err) => {
          console.error('Video media hydration error:', err);
          onHydrationError?.(err instanceof Error ? err.message : 'Unable to load video media.');
        });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'videos');
    }
  );
}

export async function createCloudVideo(params: {
  id?: string;
  section: VideoSection;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
  ratioLabel: string;
  duration: number;
  order: number;
  blob: Blob;
  ownerUid: string;
}): Promise<string> {
  const id = params.id ? params.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) : generateValidId('vid');
  const mediaId = generateValidId('med_vid');
  const mimeType = clampString(params.type || 'video/mp4', 100, 'video/mp4');

  const { chunkCount } = await uploadBlobToCloud(mediaId, params.blob, params.ownerUid);

  const path = `videos/${id}`;
  try {
    await setDoc(doc(db, 'videos', id), {
      section: params.section,
      name: clampString(params.name, 200, 'Gallery Video'),
      size: Math.max(0, Math.round(params.size)),
      type: mimeType,
      width: Math.max(1, Math.min(16384, Math.round(params.width || 1920))),
      height: Math.max(1, Math.min(16384, Math.round(params.height || 1080))),
      aspectRatio: Math.max(0.05, Math.min(50, Number(params.aspectRatio || 16 / 9))),
      ratioLabel: clampString(params.ratioLabel || '16:9', 24, '16:9'),
      duration: Math.max(0, Math.min(86400, Number(params.duration || 0))),
      order: Math.max(0, Math.round(params.order)),
      mediaId,
      chunkCount,
      isPublic: true,
      ownerUid: params.ownerUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteCloudMedia(mediaId, chunkCount).catch(() => {});
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return id;
}

export async function deleteCloudVideo(video: GalleryVideo): Promise<void> {
  const path = `videos/${video.id}`;
  try {
    await deleteDoc(doc(db, 'videos', video.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }

  if (video.mediaId && video.chunkCount) {
    await deleteCloudMedia(video.mediaId, video.chunkCount).catch(() => {});
  }
}

// ============================================================================
// ENGINE USED BY ME IMAGES
// ============================================================================

interface FirestoreEngineDoc {
  name: string;
  title: string;
  description: string;
  size: number;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
  mediaId: string;
  chunkCount: number;
  isPublic: boolean;
  ownerUid: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export function subscribeCloudEngines(
  onData: (images: GalleryImage[]) => void,
  onHydrationError?: (msg: string) => void
): () => void {
  const q = query(collection(db, 'engines'), where('isPublic', '==', true));
  let generation = 0;

  return onSnapshot(
    q,
    (snapshot) => {
      const myGen = ++generation;
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        data: d.data() as FirestoreEngineDoc,
      }));

      Promise.all(
        docs.map(async ({ id, data }) => {
          const objectUrl = await fetchBlobUrlFromCloud(
            data.mediaId,
            data.chunkCount,
            data.type || 'image/jpeg'
          );
          return {
            id,
            name: data.name,
            title: data.title,
            description: data.description,
            size: data.size,
            type: data.type,
            width: data.width,
            height: data.height,
            aspectRatio: data.aspectRatio,
            createdAt: toMillis(data.createdAt),
            objectUrl,
            mediaId: data.mediaId,
            chunkCount: data.chunkCount,
          } satisfies GalleryImage;
        })
      )
        .then((resolved) => {
          if (myGen !== generation) return;
          resolved.sort((a, b) => a.createdAt - b.createdAt);
          onData(resolved);
        })
        .catch((err) => {
          console.error('Engine image hydration error:', err);
          onHydrationError?.(err instanceof Error ? err.message : 'Unable to load engine images.');
        });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'engines');
    }
  );
}

export async function createCloudEngine(params: {
  id?: string;
  name: string;
  title: string;
  description: string;
  size: number;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
  blob: Blob;
  ownerUid: string;
}): Promise<string> {
  const id = params.id ? params.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) : generateValidId('eng');
  const mediaId = generateValidId('med_eng');
  const mimeType = clampString(params.type || 'image/jpeg', 100, 'image/jpeg');

  const { chunkCount } = await uploadBlobToCloud(mediaId, params.blob, params.ownerUid);

  const path = `engines/${id}`;
  try {
    await setDoc(doc(db, 'engines', id), {
      name: clampString(params.name, 200, 'Engine Image'),
      title: clampString(params.title || params.name, 200, 'Engine Image'),
      description: params.description.trim().slice(0, 4000),
      size: Math.max(0, Math.round(params.size)),
      type: mimeType,
      width: Math.max(1, Math.min(16384, Math.round(params.width || 1200))),
      height: Math.max(1, Math.min(16384, Math.round(params.height || 900))),
      aspectRatio: Math.max(0.05, Math.min(50, Number(params.aspectRatio || 4 / 3))),
      mediaId,
      chunkCount,
      isPublic: true,
      ownerUid: params.ownerUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteCloudMedia(mediaId, chunkCount).catch(() => {});
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return id;
}

export async function updateCloudEngineInfo(
  id: string,
  updates: { title: string; description: string }
): Promise<void> {
  const path = `engines/${id}`;
  try {
    await updateDoc(doc(db, 'engines', id), {
      title: clampString(updates.title, 200, 'Engine Image'),
      description: updates.description.trim().slice(0, 4000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudEngine(image: GalleryImage): Promise<void> {
  const path = `engines/${image.id}`;
  try {
    await deleteDoc(doc(db, 'engines', image.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }

  if (image.mediaId && image.chunkCount) {
    await deleteCloudMedia(image.mediaId, image.chunkCount).catch(() => {});
  }
}

// ============================================================================
// EXTRA SERVICES
// ============================================================================

interface FirestoreServiceDoc {
  title: string;
  workDetails: string;
  mediaKind: 'none' | ServiceWorkMediaKind;
  mediaId: string;
  mediaChunkCount: number;
  mediaMimeType: string;
  mediaAspectRatio: number;
  isPublic: boolean;
  ownerUid: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export function subscribeCloudServices(
  onData: (services: ExtraService[]) => void,
  onHydrationError?: (msg: string) => void
): () => void {
  const q = query(collection(db, 'services'), where('isPublic', '==', true));
  let generation = 0;

  return onSnapshot(
    q,
    (snapshot) => {
      const myGen = ++generation;
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        data: d.data() as FirestoreServiceDoc,
      }));

      Promise.all(
        docs.map(async ({ id, data }) => {
          let mediaObjectUrl: string | undefined;
          if (data.mediaKind !== 'none' && data.mediaId && data.mediaChunkCount > 0) {
            mediaObjectUrl = await fetchBlobUrlFromCloud(
              data.mediaId,
              data.mediaChunkCount,
              data.mediaMimeType || 'application/octet-stream'
            );
          }
          return {
            id,
            title: data.title,
            workDetails: data.workDetails,
            mediaKind: data.mediaKind === 'none' ? undefined : data.mediaKind,
            mediaObjectUrl,
            mediaAspectRatio: data.mediaAspectRatio > 0 ? data.mediaAspectRatio : undefined,
            mediaId: data.mediaId || undefined,
            mediaChunkCount: data.mediaChunkCount || undefined,
            mediaMimeType: data.mediaMimeType || undefined,
            createdAt: toMillis(data.createdAt),
          } satisfies ExtraService;
        })
      )
        .then((resolved) => {
          if (myGen !== generation) return;
          resolved.sort((a, b) => a.createdAt - b.createdAt);
          onData(resolved);
        })
        .catch((err) => {
          console.error('Services hydration error:', err);
          onHydrationError?.(err instanceof Error ? err.message : 'Unable to load services.');
        });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
    }
  );
}

export async function saveCloudService(params: {
  existing?: ExtraService;
  id?: string;
  title: string;
  workDetails: string;
  mediaKind?: ServiceWorkMediaKind;
  mediaBlob?: Blob;
  mediaAspectRatio?: number;
  removeExistingMedia?: boolean;
  ownerUid: string;
}): Promise<string> {
  const isUpdate = Boolean(params.id && params.existing);
  const id = params.id ? params.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) : generateValidId('srv');
  const path = `services/${id}`;

  let mediaKind: 'none' | ServiceWorkMediaKind = params.existing?.mediaKind ?? 'none';
  let mediaId = params.existing?.mediaId ?? '';
  let mediaChunkCount = params.existing?.mediaChunkCount ?? 0;
  let mediaMimeType = params.existing?.mediaMimeType ?? '';
  let mediaAspectRatio = params.existing?.mediaAspectRatio ?? 0;

  let oldMediaToDelete: { id: string; count: number } | null = null;

  if (params.mediaBlob && params.mediaKind) {
    if (params.existing?.mediaId && params.existing?.mediaChunkCount) {
      oldMediaToDelete = { id: params.existing.mediaId, count: params.existing.mediaChunkCount };
    }
    const newMediaId = generateValidId('med_srv');
    const uploaded = await uploadBlobToCloud(newMediaId, params.mediaBlob, params.ownerUid);
    mediaKind = params.mediaKind;
    mediaId = uploaded.mediaId;
    mediaChunkCount = uploaded.chunkCount;
    mediaMimeType = clampString(params.mediaBlob.type || 'application/octet-stream', 100);
    mediaAspectRatio = Math.max(0.05, Math.min(50, Number(params.mediaAspectRatio || 16 / 9)));
  } else if (params.removeExistingMedia) {
    if (params.existing?.mediaId && params.existing?.mediaChunkCount) {
      oldMediaToDelete = { id: params.existing.mediaId, count: params.existing.mediaChunkCount };
    }
    mediaKind = 'none';
    mediaId = '';
    mediaChunkCount = 0;
    mediaMimeType = '';
    mediaAspectRatio = 0;
  }

  try {
    if (isUpdate) {
      await updateDoc(doc(db, 'services', id), {
        title: clampString(params.title, 200, 'Extra Service'),
        workDetails: clampString(params.workDetails, 4000, 'Custom workflow'),
        mediaKind,
        mediaId,
        mediaChunkCount,
        mediaMimeType,
        mediaAspectRatio,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'services', id), {
        title: clampString(params.title, 200, 'Extra Service'),
        workDetails: clampString(params.workDetails, 4000, 'Custom workflow'),
        mediaKind,
        mediaId,
        mediaChunkCount,
        mediaMimeType,
        mediaAspectRatio,
        isPublic: true,
        ownerUid: params.ownerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }

  if (oldMediaToDelete) {
    await deleteCloudMedia(oldMediaToDelete.id, oldMediaToDelete.count).catch(() => {});
  }

  return id;
}

export async function deleteCloudService(service: ExtraService): Promise<void> {
  const path = `services/${service.id}`;
  try {
    await deleteDoc(doc(db, 'services', service.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
  if (service.mediaId && service.mediaChunkCount) {
    await deleteCloudMedia(service.mediaId, service.mediaChunkCount).catch(() => {});
  }
}

// ============================================================================
// YOUTUBE CHANNELS
// ============================================================================

interface FirestoreChannelDoc {
  name: string;
  url: string;
  logoMediaId: string;
  logoChunkCount: number;
  logoMimeType: string;
  isPublic: boolean;
  ownerUid: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export function subscribeCloudChannels(
  onData: (channels: YouTubeChannel[]) => void,
  onHydrationError?: (msg: string) => void
): () => void {
  const q = query(collection(db, 'channels'), where('isPublic', '==', true));
  let generation = 0;

  return onSnapshot(
    q,
    (snapshot) => {
      const myGen = ++generation;
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        data: d.data() as FirestoreChannelDoc,
      }));

      Promise.all(
        docs.map(async ({ id, data }) => {
          let logoObjectUrl: string | undefined;
          if (data.logoMediaId && data.logoChunkCount > 0) {
            logoObjectUrl = await fetchBlobUrlFromCloud(
              data.logoMediaId,
              data.logoChunkCount,
              data.logoMimeType || 'image/png'
            );
          }
          return {
            id,
            name: data.name,
            url: data.url,
            createdAt: toMillis(data.createdAt),
            logoObjectUrl,
            logoMediaId: data.logoMediaId || undefined,
            logoChunkCount: data.logoChunkCount || undefined,
            logoMimeType: data.logoMimeType || undefined,
          } satisfies YouTubeChannel;
        })
      )
        .then((resolved) => {
          if (myGen !== generation) return;
          resolved.sort((a, b) => a.createdAt - b.createdAt);
          onData(resolved);
        })
        .catch((err) => {
          console.error('Channels hydration error:', err);
          onHydrationError?.(err instanceof Error ? err.message : 'Unable to load channels.');
        });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'channels');
    }
  );
}

export async function saveCloudChannel(params: {
  existing?: YouTubeChannel;
  id?: string;
  name: string;
  url: string;
  logoBlob?: Blob;
  removeExistingLogo?: boolean;
  ownerUid: string;
}): Promise<string> {
  const isUpdate = Boolean(params.id && params.existing);
  const id = params.id ? params.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) : generateValidId('ch');
  const path = `channels/${id}`;

  let logoMediaId = params.existing?.logoMediaId ?? '';
  let logoChunkCount = params.existing?.logoChunkCount ?? 0;
  let logoMimeType = params.existing?.logoMimeType ?? '';
  let oldLogoToDelete: { id: string; count: number } | null = null;

  if (params.logoBlob) {
    if (params.existing?.logoMediaId && params.existing?.logoChunkCount) {
      oldLogoToDelete = { id: params.existing.logoMediaId, count: params.existing.logoChunkCount };
    }
    const newMediaId = generateValidId('med_ch');
    const uploaded = await uploadBlobToCloud(newMediaId, params.logoBlob, params.ownerUid);
    logoMediaId = uploaded.mediaId;
    logoChunkCount = uploaded.chunkCount;
    logoMimeType = clampString(params.logoBlob.type || 'image/png', 100);
  } else if (params.removeExistingLogo) {
    if (params.existing?.logoMediaId && params.existing?.logoChunkCount) {
      oldLogoToDelete = { id: params.existing.logoMediaId, count: params.existing.logoChunkCount };
    }
    logoMediaId = '';
    logoChunkCount = 0;
    logoMimeType = '';
  }

  try {
    if (isUpdate) {
      await updateDoc(doc(db, 'channels', id), {
        name: clampString(params.name, 200, 'YouTube Channel'),
        url: clampString(params.url, 500, 'https://youtube.com'),
        logoMediaId,
        logoChunkCount,
        logoMimeType,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'channels', id), {
        name: clampString(params.name, 200, 'YouTube Channel'),
        url: clampString(params.url, 500, 'https://youtube.com'),
        logoMediaId,
        logoChunkCount,
        logoMimeType,
        isPublic: true,
        ownerUid: params.ownerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }

  if (oldLogoToDelete) {
    await deleteCloudMedia(oldLogoToDelete.id, oldLogoToDelete.count).catch(() => {});
  }

  return id;
}

export async function deleteCloudChannel(channel: YouTubeChannel): Promise<void> {
  const path = `channels/${channel.id}`;
  try {
    await deleteDoc(doc(db, 'channels', channel.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
  if (channel.logoMediaId && channel.logoChunkCount) {
    await deleteCloudMedia(channel.logoMediaId, channel.logoChunkCount).catch(() => {});
  }
}

// ============================================================================
// PRESETS LIBRARY
// ============================================================================

interface FirestorePresetDoc {
  title: string;
  category: PresetCategory;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileExt: string;
  fileMediaId: string;
  fileChunkCount: number;
  previewKind: 'none' | PresetPreviewKind;
  previewMediaId: string;
  previewChunkCount: number;
  previewMimeType: string;
  downloads: number;
  isPublic: boolean;
  ownerUid: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export function subscribeCloudPresets(
  onData: (presets: PresetItem[]) => void,
  onHydrationError?: (msg: string) => void
): () => void {
  const q = query(collection(db, 'presets'), where('isPublic', '==', true));
  let generation = 0;

  return onSnapshot(
    q,
    (snapshot) => {
      const myGen = ++generation;
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        data: d.data() as FirestorePresetDoc,
      }));

      Promise.all(
        docs.map(async ({ id, data }) => {
          const fileObjectUrl = await fetchBlobUrlFromCloud(
            data.fileMediaId,
            data.fileChunkCount,
            data.fileType || 'application/octet-stream'
          );

          let previewObjectUrl: string | undefined;
          if (data.previewKind !== 'none' && data.previewMediaId && data.previewChunkCount > 0) {
            previewObjectUrl = await fetchBlobUrlFromCloud(
              data.previewMediaId,
              data.previewChunkCount,
              data.previewMimeType || 'image/jpeg'
            );
          }

          return {
            id,
            title: data.title,
            category: data.category,
            description: data.description,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            fileExt: data.fileExt,
            fileObjectUrl,
            previewKind: data.previewKind === 'none' ? undefined : data.previewKind,
            previewObjectUrl,
            fileMediaId: data.fileMediaId,
            fileChunkCount: data.fileChunkCount,
            previewMediaId: data.previewMediaId || undefined,
            previewChunkCount: data.previewChunkCount || undefined,
            previewMimeType: data.previewMimeType || undefined,
            downloads: data.downloads ?? 0,
            createdAt: toMillis(data.createdAt),
          } satisfies PresetItem;
        })
      )
        .then((resolved) => {
          if (myGen !== generation) return;
          resolved.sort((a, b) => b.createdAt - a.createdAt);
          onData(resolved);
        })
        .catch((err) => {
          console.error('Presets hydration error:', err);
          onHydrationError?.(err instanceof Error ? err.message : 'Unable to load presets.');
        });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'presets');
    }
  );
}

export async function saveCloudPreset(params: {
  existing?: PresetItem;
  id?: string;
  title: string;
  category: PresetCategory;
  description: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileExt?: string;
  fileBlob?: Blob;
  previewKind?: PresetPreviewKind;
  previewBlob?: Blob;
  removeExistingPreview?: boolean;
  downloads?: number;
  ownerUid: string;
}): Promise<string> {
  const isUpdate = Boolean(params.id && params.existing);
  const id = params.id ? params.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) : generateValidId('pst');
  const path = `presets/${id}`;

  let fileName = params.existing?.fileName ?? 'preset.bin';
  let fileSize = params.existing?.fileSize ?? 0;
  let fileType = params.existing?.fileType ?? 'application/octet-stream';
  let fileExt = params.existing?.fileExt ?? 'FILE';
  let fileMediaId = params.existing?.fileMediaId ?? '';
  let fileChunkCount = params.existing?.fileChunkCount ?? 0;

  let oldFileToDelete: { id: string; count: number } | null = null;
  if (params.fileBlob) {
    if (params.existing?.fileMediaId && params.existing?.fileChunkCount) {
      oldFileToDelete = { id: params.existing.fileMediaId, count: params.existing.fileChunkCount };
    }
    const newFileMediaId = generateValidId('med_pst');
    const uploaded = await uploadBlobToCloud(newFileMediaId, params.fileBlob, params.ownerUid);
    fileName = clampString(params.fileName || 'preset.bin', 260, 'preset.bin');
    fileSize = Math.max(0, Math.round(params.fileSize ?? params.fileBlob.size));
    fileType = clampString(params.fileType || params.fileBlob.type || 'application/octet-stream', 120, 'application/octet-stream');
    fileExt = clampString(params.fileExt || 'FILE', 16, 'FILE');
    fileMediaId = uploaded.mediaId;
    fileChunkCount = uploaded.chunkCount;
  }

  let previewKind: 'none' | PresetPreviewKind = params.existing?.previewKind ?? 'none';
  let previewMediaId = params.existing?.previewMediaId ?? '';
  let previewChunkCount = params.existing?.previewChunkCount ?? 0;
  let previewMimeType = params.existing?.previewMimeType ?? '';
  let oldPreviewToDelete: { id: string; count: number } | null = null;

  if (params.previewBlob && params.previewKind) {
    if (params.existing?.previewMediaId && params.existing?.previewChunkCount) {
      oldPreviewToDelete = {
        id: params.existing.previewMediaId,
        count: params.existing.previewChunkCount,
      };
    }
    const newPreviewId = generateValidId('med_prv');
    const uploaded = await uploadBlobToCloud(newPreviewId, params.previewBlob, params.ownerUid);
    previewKind = params.previewKind;
    previewMediaId = uploaded.mediaId;
    previewChunkCount = uploaded.chunkCount;
    previewMimeType = clampString(params.previewBlob.type || 'image/jpeg', 100, 'image/jpeg');
  } else if (params.removeExistingPreview) {
    if (params.existing?.previewMediaId && params.existing?.previewChunkCount) {
      oldPreviewToDelete = {
        id: params.existing.previewMediaId,
        count: params.existing.previewChunkCount,
      };
    }
    previewKind = 'none';
    previewMediaId = '';
    previewChunkCount = 0;
    previewMimeType = '';
  }

  const downloads = Math.max(0, Math.round(params.downloads ?? params.existing?.downloads ?? 0));

  try {
    if (isUpdate) {
      await updateDoc(doc(db, 'presets', id), {
        title: clampString(params.title, 200, 'Preset Pack'),
        category: params.category,
        description: params.description.trim().slice(0, 4000),
        fileName,
        fileSize,
        fileType,
        fileExt,
        fileMediaId,
        fileChunkCount,
        previewKind,
        previewMediaId,
        previewChunkCount,
        previewMimeType,
        downloads,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'presets', id), {
        title: clampString(params.title, 200, 'Preset Pack'),
        category: params.category,
        description: params.description.trim().slice(0, 4000),
        fileName,
        fileSize,
        fileType,
        fileExt,
        fileMediaId,
        fileChunkCount,
        previewKind,
        previewMediaId,
        previewChunkCount,
        previewMimeType,
        downloads,
        isPublic: true,
        ownerUid: params.ownerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }

  if (oldFileToDelete) {
    await deleteCloudMedia(oldFileToDelete.id, oldFileToDelete.count).catch(() => {});
  }
  if (oldPreviewToDelete) {
    await deleteCloudMedia(oldPreviewToDelete.id, oldPreviewToDelete.count).catch(() => {});
  }

  return id;
}

export async function deleteCloudPreset(preset: PresetItem): Promise<void> {
  const path = `presets/${preset.id}`;
  try {
    await deleteDoc(doc(db, 'presets', preset.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }

  if (preset.fileMediaId && preset.fileChunkCount) {
    await deleteCloudMedia(preset.fileMediaId, preset.fileChunkCount).catch(() => {});
  }
  if (preset.previewMediaId && preset.previewChunkCount) {
    await deleteCloudMedia(preset.previewMediaId, preset.previewChunkCount).catch(() => {});
  }
}
