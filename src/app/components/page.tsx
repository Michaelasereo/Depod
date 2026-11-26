import type { Metadata } from "next";
import { Showcase } from "./Showcase";

export const metadata: Metadata = { title: "Components · Depod" };

export default function ComponentsPage() {
  return <Showcase />;
}
