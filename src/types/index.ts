// Central type definitions for the conference portal.

/** Supported previewable file categories. */
export type FileType =
  | "pdf"
  | "image"
  | "video"
  | "html"
  | "text"
  | "document"
  | "unknown";

/** A conference track definition (static configuration). */
export interface Track {
  id: number;
  title: string;
  subtitle: string;
  folder: string;
  /** Themed icon key — mapped to a Lucide icon in the TrackIcon component. */
  icon: TrackIconKey;
}

/** Keys for the themed track-icon mapper (see TrackIcon.tsx). */
export type TrackIconKey =
  | "law"
  | "security"
  | "technology"
  | "governance"
  | "media";

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

/** An audience question (fetched from an external API, normalized). */
export interface AudienceQuestion {
  id: string;
  question: string;
  author?: string;
  /** Optional link to a conference track. */
  trackId?: number;
  /** ISO timestamp of when the question was asked. */
  createdAt?: string;
  /** Lifecycle status from the external Q&A system. */
  status?: "NEW" | "ANSWERED" | "ARCHIVED";
  /** Upvote count from the audience. */
  upvotes?: number;
  /** Lecturer's answer / notes (when answered). */
  lecturerNotes?: string;
}

/** Response payload for /api/audience-questions. */
export interface AudienceQuestionsApiResponse {
  questions: AudienceQuestion[];
  /** "external" if fetched from the configured API, "sample" if fallback. */
  source: "external" | "sample";
}
