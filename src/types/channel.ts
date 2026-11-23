export interface StoredChannelRecord {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  logoBlob?: Blob;
}

export interface YouTubeChannel {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  logoObjectUrl?: string;
}
