import { redirect } from "next/navigation";

/**
 * Option A: Studio lives only on web1 (Good Company).
 * Local: http://localhost:3000/studio — Production: https://goodco.tv/studio
 */
const studioBase = (
  process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || "http://localhost:3000/studio"
).replace(/\/$/, "");

type StudioPageProps = {
  params: Promise<{ tool?: string[] }>;
};

export default async function StudioPage({ params }: StudioPageProps) {
  const { tool } = await params;
  const path = tool?.length ? `/${tool.join("/")}` : "";
  redirect(`${studioBase}${path}`);
}
