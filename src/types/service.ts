export type ServiceWorkMediaKind = 'image' | 'video';

export interface ExtraService {
  id: string;
  title: string;
  workDetails: string;
  mediaKind?: ServiceWorkMediaKind;
  mediaObjectUrl?: string;
  mediaAspectRatio?: number;
  createdAt: number;
}

export interface StoredServiceRecord {
  id: string;
  title: string;
  workDetails: string;
  mediaKind?: ServiceWorkMediaKind;
  mediaBlob?: Blob;
  mediaAspectRatio?: number;
  createdAt: number;
}
