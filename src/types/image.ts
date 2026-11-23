export interface GalleryImage {
  id: string;
  name: string;
  title: string;
  description: string;
  size: number;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
  createdAt: number;
  objectUrl: string;
}

export interface StoredImageRecord {
  id: string;
  name: string;
  title?: string;
  description?: string;
  size: number;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
  createdAt: number;
  blob: Blob;
}
