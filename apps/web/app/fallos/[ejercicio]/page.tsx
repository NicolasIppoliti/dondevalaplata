import type { Metadata } from "next";
import { FalloEjercicioView } from "@/components/fallos/FalloEjercicioView";
import { getFalloEjerciciosDescending, getPortalData } from "@/lib/sources";

export function generateStaticParams() {
  const { fallos } = getPortalData();
  const ejercicios = getFalloEjerciciosDescending(fallos);
  return ejercicios.map((ejercicio) => ({ ejercicio }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ejercicio: string }>;
}): Promise<Metadata> {
  const { ejercicio } = await params;
  return {
    title: `Multas del Tribunal de Cuentas — ejercicio ${ejercicio}`,
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
