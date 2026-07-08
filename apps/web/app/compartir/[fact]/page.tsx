import type { Metadata } from "next";
import { CompartirFactView } from "@/components/compartir/CompartirFactView";
import { SHARE_FACT_IDS, getShareFact } from "@/lib/shareFacts";

// This portal is 100% build-time/static (DESIGN.md INVIOLABLE #4): the
// three share facts below are the only valid segments, ever. Disabling
// dynamicParams means an unknown `/compartir/xxx` 404s instead of Next
// attempting an on-demand render for a param `generateStaticParams` never
// listed.
export const dynamicParams = false;

export function generateStaticParams() {
  return SHARE_FACT_IDS.map((fact) => ({ fact }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fact: string }>;
}): Promise<Metadata> {
  const { fact: factId } = await params;
  const fact = getShareFact(factId);
  if (!fact) {
    return { title: "Compartir" };
  }
  return {
    title: fact.headline,
    description: fact.caption,
    openGraph: {
      title: fact.headline,
      description: fact.caption,
      type: "website",
    },
  };
}

export default async function CompartirFactPage({
  params,
}: {
  params: Promise<{ fact: string }>;
}) {
  const { fact: factId } = await params;
  return <CompartirFactView factId={factId} />;
}
