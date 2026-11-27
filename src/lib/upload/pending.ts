"use client";

/*
 * Files dropped on Home ride along to the new moodboard: Home creates the moodboard,
 * parks the files here, and the canvas picks them up on open (client-side navigation keeps this module alive).
 */
const pending = new Map<string, File[]>();

export const parkFiles = (moodboardId: string, files: File[]) => pending.set(moodboardId, files);

export function takeParkedFiles(moodboardId: string): File[] {
  const files = pending.get(moodboardId) ?? [];
  pending.delete(moodboardId);
  return files;
}
