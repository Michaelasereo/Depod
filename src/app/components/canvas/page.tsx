import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoCanvas } from "./DemoCanvas";

export const metadata: Metadata = { title: "Canvas demo · Depod" };

/* /components/canvas?state=filled|empty|references — sample data, nothing is saved. */
export default function CanvasDemo({ searchParams }: PageProps<"/components/canvas">) {
  return (
    <Suspense>
      <Demo searchParams={searchParams} />
    </Suspense>
  );
}

async function Demo({ searchParams }: { searchParams: PageProps<"/components/canvas">["searchParams"] }) {
  const s = (await searchParams).state;
  const state = s === "empty" || s === "references" ? s : "filled";
  return <DemoCanvas key={state} state={state} />;
}
