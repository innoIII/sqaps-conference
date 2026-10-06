// Central type definitions for the conference portal.

/** Supported previewable file categories. */
export type FileType = "pdf" | "image" | "video" | "html" | "text" | "unknown";

/** A conference track definition (static configuration). */
export interface Track {
  id: number;
  title: string;
  subtitle: string;
  folder: string;
}

/** A file discovered on the server filesystem for a given track. */
export interface ContentFile {
  name: string;
  /** Public URL used to fetch/preview/download the file. */
  url: string;
  type: FileType;
  extension: string;
  size: number;
}

/** Track metadata returned by the API (no internal paths). */
export interface TrackInfo {
  id: number;
  title: string;
  subtitle: string;
}

/** Successful API response payload. */
export interface TrackApiResponse {
  track: TrackInfo;
  files: ContentFile[];
}

/** Error API response payload. */
export interface ApiErrorResponse {
  error: string;
  code?: "INVALID_TRACK" | "NOT_FOUND" | "EMPTY" | "SERVER_ERROR";
}
