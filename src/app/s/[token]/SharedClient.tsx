"use client";

import { MoodboardCanvas, type SharedMode } from "@/components/canvas/MoodboardCanvas";
import { ProjectCanvas } from "@/components/canvas/ProjectCanvas";
import type { MoodboardApi, MoodboardData, ProjectApi, ProjectData } from "@/components/canvas/types";

/* The shared view is read-only, so nothing here writes. */
const nope = async () => {
  throw new Error("read_only");
};
const moodboardApi: MoodboardApi = { saveBento: nope, setStarter: nope, upload: nope, deleteImage: nope };
const projectApi: ProjectApi = { saveBento: nope, share: { setEnabled: nope } };

export function SharedClient(
  props: { kind: "moodboard"; data: MoodboardData; shared: SharedMode } | { kind: "project"; data: ProjectData; shared: SharedMode },
) {
  return props.kind === "moodboard" ? (
    <MoodboardCanvas data={props.data} api={moodboardApi} shared={props.shared} />
  ) : (
    <ProjectCanvas data={props.data} api={projectApi} shared={props.shared} />
  );
}
