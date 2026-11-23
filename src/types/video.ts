export type VideoSection = 'showreels' | 'reels';

export interface GalleryVideo {
  id: string;
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
  createdAt: number;
  objectUrl: string;
}

export interface StoredVideoRecord {
  id: string;
  section?: VideoSection;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
  ratioLabel: string;
  duration: number;
  order: number;
  createdAt: number;
  blob: Blob;
}
