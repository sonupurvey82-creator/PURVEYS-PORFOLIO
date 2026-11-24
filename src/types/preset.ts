export type PresetCategory =
  | 'Premiere Pro'
  | 'After Effects'
  | 'DaVinci Resolve'
  | 'Lightroom'
  | 'Color LUT'
  | 'Audio / SFX'
  | 'Other';

export type PresetPreviewKind = 'image' | 'video';

export interface PresetItem {
  id: string;
  title: string;
  category: PresetCategory;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileExt: string;
  fileObjectUrl: string;
  previewKind?: PresetPreviewKind;
  previewObjectUrl?: string;
  downloads: number;
  createdAt: number;
}

export interface StoredPresetRecord {
  id: string;
  title: string;
  category: PresetCategory;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileExt: string;
  fileBlob: Blob;
  previewKind?: PresetPreviewKind;
  previewBlob?: Blob;
  downloads: number;
  createdAt: number;
}
