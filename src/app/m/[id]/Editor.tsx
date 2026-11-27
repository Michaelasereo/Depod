"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { MoodboardCanvas } from "@/components/canvas/MoodboardCanvas";
import { PlanLimitError, type MoodboardApi, type MoodboardData } from "@/components/canvas/types";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { deleteMoodboard } from "@/app/home/actions";
import { setShareLink } from "@/app/share/actions";
import { deleteImage, recordImage, saveBento, setStarter } from "./actions";

/* Wires the canvas to Supabase: files go straight from the browser to private Storage, rows through server actions. */
export function Editor({ data, workspaceId, userName }: { data: MoodboardData; workspaceId: string; userName: string }) {
  const router = useRouter();
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
        if (!saved.ok) throw new PlanLimitError();
        return { id: saved.id, url: saved.url, width: f.width, height: f.height, name: f.name, hash: f.hash, addedBy: userName, addedAt: saved.addedAt };
      },
      share: { setEnabled: (on) => setShareLink("moodboard", data.id, on) },
      deleteMoodboard: async (typed) => {
        const r = await deleteMoodboard(data.id, typed);
        if (!r.ok) return r.error === "name" ? "That name doesn't match." : "Couldn't delete. Try again.";
        router.push("/home");
      },
    };
  }, [data.id, workspaceId, userName, router]);

  return <MoodboardCanvas data={data} api={api} />;
}
