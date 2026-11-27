import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Depod",
  description: "A canvas to collect references, build bentos, and choose a direction with your team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Theme comes from Preferences (light, dark, system); Light is the default.
  return (
    <html lang="en" data-theme="light" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
