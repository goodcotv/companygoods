"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { BottomChrome } from "@/components/BottomChrome";
import { AnimatedCornerBrackets } from "@/components/AnimatedCornerBrackets";
import { ScaleToFit } from "@/components/ScaleToFit";
import { STAGE_HEIGHT, STAGE_WIDTH } from "@/lib/stage";
import type { Project, TalentDetailData } from "@/sanity/types";

type TalentDetailProps = {
  talent: TalentDetailData;
  projects: Project[];
};

export function TalentDetail({ talent, projects }: TalentDetailProps) {
  const router = useRouter();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    projects[0]?._id ?? null,
  );

  const activeProject =
    projects.find((project) => project._id === activeProjectId) ?? projects[0];
  const mediaVideoUrl = activeProject?.videoUrl;
  const mediaImageUrl =
    activeProject?.imageUrl || talent.imageUrl;

  return (
    <ScaleToFit width={STAGE_WIDTH} height={STAGE_HEIGHT}>
      <div
        className="relative flex flex-col bg-background text-foreground overflow-hidden"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      >
        {/* Full-screen background media */}
        <div className="talent-media">
          {mediaVideoUrl ? (
            <video
              key={activeProject?._id}
              src={mediaVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              aria-label={
                activeProject
                  ? `${activeProject.title} video`
                  : `${talent.name} project video`
              }
            />
          ) : mediaImageUrl ? (
            <Image
              key={activeProject?._id ?? "portrait"}
              src={mediaImageUrl}
              alt={activeProject ? activeProject.title : talent.name}
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          ) : null}
          <div className="talent-media-scrim" />
        </div>

        {/* Brand header */}
        <div className="absolute top-0 left-0 z-20 px-8 pt-4">
          <BrandHeader
            variant="display"
            widthClass="w-[30rem] max-w-full"
          />
        </div>

        {/* Left sidebar with talent name and projects */}
        <div className="absolute left-12 top-[11.5rem] z-10 flex flex-col">
          <div className="flex items-baseline gap-4 mb-6">
            <h1 className="font-sans text-[11px] font-normal tracking-[0.18em] uppercase text-white">
              {talent.name}
            </h1>
            <button
              onClick={() => router.back()}
              className="font-sans text-[13px] font-normal text-white hover:opacity-60 transition-opacity"
              aria-label="Close"
            >
              x
            </button>
          </div>

          {projects.length > 0 && (
            <div className="relative w-[28rem]">
              <AnimatedCornerBrackets inset={0} layoutId="page-corners" />
              <ul className="space-y-3.5 py-5 pl-4 pr-4">
                {projects.map((project) => {
                  const isActive = project._id === activeProject?._id;
                  return (
                    <li key={project._id}>
                      <Link
                        href={`/work/${project.slug}`}
                        className={`block w-full text-left transition-colors ${
                          isActive
                            ? "text-foreground"
                            : "text-white/35 hover:text-foreground"
                        }`}
                        onMouseEnter={() => setActiveProjectId(project._id)}
                      >
                        <span className="block font-heading text-[21pt] font-extrabold leading-none tracking-[-0.02em]">
                          {project.title}
                        </span>
                        {project.client && (
                          <span className="mt-1.5 block font-sans text-[11px] tracking-[0.14em] uppercase">
                            {project.client}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <BottomChrome
          position="inline"
          activeHref="/talent"
          className="absolute right-8 bottom-7 z-30 justify-end"
        />
      </div>
    </ScaleToFit>
  );
}
