import type { BentoDoc } from "@/lib/bento/doc";
import type { StarterLayout } from "@/lib/bento/layout";
import type { Prepared } from "@/lib/upload/prepare";

/** An image on the moodboard: in References always, in the bento when a tile points at it. */
export type CanvasImage = {
  id: string;
  url: string;
  width: number;
  height: number;
  name: string;
  hash?: string;
  addedBy?: string;
  addedAt?: string;
  /** Local-only states while a file is on its way. */
  status?: "uploading" | "failed";
};

export type MoodboardData = {
  id: string;
  name: string;
  projectName?: string;
  starter: StarterLayout;
  images: CanvasImage[];
  doc: BentoDoc;
  canEdit: boolean;
  people: Array<{ initials: string; name: string }>;
  /** Plan rules: image cap per moodboard (null = unlimited) and the export mark (Free can't turn it off). */
  plan: "free" | "pro" | "team" | "enterprise";
  imageLimit: number | null;
  markLocked: boolean;
  /** 16: the share link. The demo has none. */
  share?: ShareState;
};

/** Where the canvas saves. The real one writes to Supabase; the demo keeps everything in memory. */
export type MoodboardApi = {
  saveBento(doc: BentoDoc): Promise<void>;
  setStarter(starter: StarterLayout): Promise<void>;
  upload(file: Prepared): Promise<CanvasImage>;
  deleteImage(id: string): Promise<void>;
  /** 30: returns an error message, or nothing when deleted. */
  deleteMoodboard?(typedName: string): Promise<string | void>;
  share?: ShareApi;
};

/** Thrown by `upload` when the plan's image limit is reached (19). */
export class PlanLimitError extends Error {}

/** A moodboard as a card on the project canvas (05): its bento, and the images it holds. */
export type ProjectBoard = { id: string; name: string; tiles: import("@/lib/bento/layout").Tile[]; images: CanvasImage[] };

export type ProjectData = {
  id: string;
  name: string;
  boards: ProjectBoard[];
  doc: BentoDoc;
  canEdit: boolean;
  people: Array<{ initials: string; name: string }>;
  share: ShareState;
};

/** The project canvas saves only its bento; moodboards are edited on their own canvas. */
export type ProjectApi = {
  saveBento(doc: BentoDoc): Promise<void>;
  createMoodboard?(name: string): Promise<string | void>;
  share: ShareApi;
};

/** 16, link section: one share link per moodboard or project. */
export type ShareState = { enabled: boolean; url: string | null };
export type ShareApi = { setEnabled(on: boolean): Promise<ShareState> };
