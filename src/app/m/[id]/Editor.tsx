"use client";

import { useMemo } from "react";
import { MoodboardCanvas } from "@/components/canvas/MoodboardCanvas";
import type { MoodboardApi, MoodboardData } from "@/components/canvas/types";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { deleteImage, recordImage, saveBento, setStarter } from "./actions";

/* Wires the canvas to Supabase: files go straight from the browser to private Storage, rows through server actions. */
export function Editor({ data, workspaceId, userName }: { data: MoodboardData; workspaceId: string; userName: string }) {
  const api = useMemo<MoodboardApi>(() => {
    const supabase = supabaseBrowser();
    return {
      saveBento: (doc) => saveBento(data.id, doc),
      setStarter: (s) => setStarter(data.id, s),
      deleteImage: (id) => deleteImage(id),
      upload: async (f) => {
        const ext = f.type === "image/gif" ? "gif" : "webp";
        const path = `${workspaceId}/${data.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("images").upload(path, f.blob, { contentType: f.type, upsert: false });
        if (error) throw error;
        const saved = await recordImage(data.id, { path, width: f.width, height: f.height, hash: f.hash, name: f.name });
        return { id: saved.id, url: saved.url, width: f.width, height: f.height, name: f.name, hash: f.hash, addedBy: userName, addedAt: saved.addedAt };
      },
    };
  }, [data.id, workspaceId, userName]);

  return <MoodboardCanvas data={data} api={api} />;
}
