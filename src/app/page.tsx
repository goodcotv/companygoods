import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { client } from "@/sanity/lib/client";
import { homepageQuery, talentRosterQuery } from "@/sanity/queries";
import type { HomepageData, PostWorker } from "@/sanity/types";

async function getAppData(): Promise<{
  homepageData: HomepageData;
  talentWorkers: PostWorker[];
}> {
  try {
    const [homepageData, talentWorkers] = await Promise.all([
      client.fetch<HomepageData>(
        homepageQuery,
        {},
        {
          // In development, don't cache. In production, revalidate every 60 seconds
          next: {
            revalidate: process.env.NODE_ENV === "production" ? 60 : 0,
          },
        },
      ),
      client.fetch<PostWorker[]>(
        talentRosterQuery,
        {},
        {
          next: {
            revalidate: process.env.NODE_ENV === "production" ? 60 : 0,
          },
        },
      ),
    ]);

    return {
      homepageData: homepageData || { settings: {} },
      talentWorkers: talentWorkers || [],
    };
  } catch (error) {
    console.error("Failed to fetch app data:", error);
    return {
      homepageData: { settings: {} },
      talentWorkers: [],
    };
  }
}

export default async function Home() {
  const { homepageData, talentWorkers } = await getAppData();

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AppShell homepageData={homepageData} talentWorkers={talentWorkers} />
    </Suspense>
  );
}
