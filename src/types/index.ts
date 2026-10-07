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
  /** External Q&A session id — each track shows only its own audience questions. */
  sessionId: string;
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
  /** Which research paper this question is about (1-5, or 0/undefined = general). */
  paperSlot?: number;
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

// ─────────────────────────────────────────────────────────────────────
// Session / Papers / Report — per-track structured content (DB-backed)
// ─────────────────────────────────────────────────────────────────────

/** Session-level info shown in the track header (4 fields). */
export interface TrackSessionInfo {
  trackId: number;
  time?: string;
  venue?: string;
  chair?: string;
  secretary?: string;
}

/** A research paper slot (up to 5 per track). */
export interface ResearchPaper {
  trackId: number;
  slot: number; // 1..5
  title?: string;
  researcher?: string;
  /** Relative URL to the paper PDF, e.g. "/papers/track-1/paper-1.pdf" */
  paperUrl?: string;
  /** Relative URL to the researcher's CV PDF, e.g. "/papers/track-1/cv-1.pdf" */
  cvUrl?: string;
}

/** The session chair's private report (not shown to visitors). */
export interface SessionReport {
  trackId: number;
  content?: string;
  editedBy?: string;
  updatedAt?: string;
}

/** Full session data returned by /api/sessions/[trackId]. */
export interface TrackSessionApiResponse {
  session: TrackSessionInfo;
  papers: ResearchPaper[]; // length 5, may have empty slots
}

/** Generic success/error payloads for PUT routes. */
export interface ApiSuccessResponse {
  success: true;
}
export interface ApiErrorPayload {
  error: string;
}
