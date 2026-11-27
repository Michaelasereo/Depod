"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProjectCanvas } from "@/components/canvas/ProjectCanvas";
import type { ProjectApi, ProjectData } from "@/components/canvas/types";
import { createMoodboard } from "@/app/home/actions";
import { setShareLink } from "@/app/share/actions";
import { saveProjectBento } from "./actions";

export function ProjectEditor({ data }: { data: ProjectData }) {
  const router = useRouter();
  const api = useMemo<ProjectApi>(
    () => ({
      saveBento: (doc) => saveProjectBento(data.id, doc),
      share: { setEnabled: (on) => setShareLink("project", data.id, on) },
      createMoodboard: async (name) => {
        const r = await createMoodboard(name, data.id);
        if (!r.ok) return r.error === "limit" ? "The Free plan holds 3 moodboards. Delete one or upgrade to add another." : "We couldn't create the moodboard. Try again.";
        router.push(`/m/${r.id}`);
      },
    }),
    [data.id, router],
  );
  return <ProjectCanvas data={data} api={api} />;
}
