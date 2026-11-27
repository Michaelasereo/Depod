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
};

/** Where the canvas saves. The real one writes to Supabase; the demo keeps everything in memory. */
export type MoodboardApi = {
  saveBento(doc: BentoDoc): Promise<void>;
  setStarter(starter: StarterLayout): Promise<void>;
  upload(file: Prepared): Promise<CanvasImage>;
  deleteImage(id: string): Promise<void>;
};
