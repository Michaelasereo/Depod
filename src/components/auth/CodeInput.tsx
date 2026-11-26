"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

/* Figma 62a/62b: six 48×56 boxes, radius 12; the box being typed in has the focus border. */
export function CodeInput({ name = "code", error, autoFocus = true }: { name?: string; error?: boolean; autoFocus?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setAt = (i: number, v: string) => {
    const next = [...digits];
    next[i] = v;
    setDigits(next);
  };

  const fill = (from: number, text: string) => {
    const chars = text.replace(/\D/g, "").slice(0, 6 - from).split("");
    if (!chars.length) return;
    const next = [...digits];
    chars.forEach((c, k) => (next[from + k] = c));
    setDigits(next);
    refs.current[Math.min(from + chars.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2" role="group" aria-label="6-digit code">
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={6}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) return fill(i, v);
            setAt(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            fill(i, e.clipboardData.getData("text"));
          }}
          className={cn(
            "h-14 w-12 rounded-xl border bg-bg-surface text-center text-heading-20 text-text-primary outline-none",
            "focus:border-2 focus:border-border-focus",
            error ? "border-text-danger" : "border-border-strong",
          )}
        />
      ))}
    </div>
  );
}
