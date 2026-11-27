"use client";

/*
 * Prepares a dropped or pasted file for upload (PRD: resize in the browser before upload).
 * - Only images; anything else is skipped (40b "files skipped: not images").
 * - HEIC/HEIF (iPhone photos) are converted to JPEG first.
 * - Longest side is capped at 2560 px, re-encoded as WebP (GIFs keep their animation).
 * - A SHA-256 of the result finds duplicates already in References (40c).
 */
export const MAX_SIDE = 2560;

export type Prepared = { blob: Blob; width: number; height: number; hash: string; name: string; type: string };

const isHeic = (f: File) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);
export const isImage = (f: File) => f.type.startsWith("image/") || isHeic(f);

async function sha256(blob: Blob) {
  const buf = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function prepare(file: File): Promise<Prepared> {
  let source: Blob = file;
  if (isHeic(file)) {
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    source = Array.isArray(out) ? out[0] : out;
  }
  const bitmap = await createImageBitmap(source);
  const { width: w0, height: h0 } = bitmap;

  // GIFs stay as they are (resizing would drop the animation).
  if (file.type === "image/gif") {
    bitmap.close();
    return { blob: file, width: w0, height: h0, hash: await sha256(file), name: file.name, type: "image/gif" };
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const width = Math.round(w0 * scale);
  const height = Math.round(h0 * scale);
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.86 });
  const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return { blob, width, height, hash: await sha256(blob), name, type: "image/webp" };
}
