"use client";

import { usePathname } from "next/navigation";
import { SettingsNavItem } from "@/components/app/app";

const items = ["Account", "Preferences", "Security", "Workspace", "Members", "Plans", "Billing"];

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((i) => {
        const href = `/settings/${i.toLowerCase()}`;
        return (
          <SettingsNavItem key={i} href={href} selected={path === href}>
            {i}
          </SettingsNavItem>
        );
      })}
    </nav>
  );
}
