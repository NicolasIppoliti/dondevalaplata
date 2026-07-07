import type { Metadata } from "next";
import { FalloEjercicioView } from "@/components/fallos/FalloEjercicioView";
import { getPortalData } from "@/lib/sources";

export function generateStaticParams() {
  const { fallos } = getPortalData();
  const ejercicios = [...new Set(fallos.records.map((record) => record.ejercicio))];
  return ejercicios.map((ejercicio) => ({ ejercicio }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ejercicio: string }>;
}): Promise<Metadata> {
  const { ejercicio } = await params;
  return {
    title: `Fallo HTC ${ejercicio}`,
  };
}

export default async function FalloEjercicioPage({
  params,
}: {
  params: Promise<{ ejercicio: string }>;
}) {
  const { ejercicio } = await params;
  return <FalloEjercicioView ejercicio={ejercicio} />;
}
