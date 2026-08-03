"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BottomChrome } from "@/components/BottomChrome";
import { BrandHeader } from "@/components/BrandHeader";
import { ScaleToFit } from "@/components/ScaleToFit";
import { STAGE_HEIGHT, STAGE_WIDTH } from "@/lib/stage";
import type { Project, TalentDetailData } from "@/sanity/types";

type TalentDetailProps = {
  talent: TalentDetailData;
  projects: Project[];
};

export function TalentDetail({ talent, projects }: TalentDetailProps) {
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
        className="relative flex flex-col bg-background text-foreground"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      >
        <div className="px-8 pt-4">
          <BrandHeader
            variant="display"
            widthClass="w-[30rem] max-w-full"
          />
        </div>

        <div className="talent-body">
          <div className="talent-detail-layout">
            <div className="talent-detail-image">
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
                  width={400}
                  height={600}
                  style={{ objectFit: "cover" }}
                />
              ) : null}
            </div>

            <div className="talent-detail-info">
              <h1 className="talent-detail-name">{talent.name}</h1>
              {talent.featuredWorkTitle && (
                <p className="talent-detail-work">{talent.featuredWorkTitle}</p>
              )}
              {talent.bio && (
                <p className="talent-detail-bio">{talent.bio}</p>
              )}

              {projects.length > 0 && (
                <div className="talent-projects">
                  <h2 className="talent-projects-title">Projects</h2>
                  <ul className="talent-projects-list">
                    {projects.map((project) => {
                      const isActive = project._id === activeProject?._id;
                      return (
                        <li key={project._id} className="talent-project-item">
                          <Link
                            href={`/work/${project.slug}`}
                            className={
                              isActive
                                ? "talent-project-link is-active"
                                : "talent-project-link"
                            }
                            onMouseEnter={() =>
                              setActiveProjectId(project._id)
                            }
                          >
                            <div className="talent-project-info">
                              <h3 className="talent-project-title">
                                {project.title}
                              </h3>
                              {project.client && (
                                <p className="talent-project-client">
                                  {project.client}
                                </p>
                              )}
                              {project.postWorkerDescription && (
                                <p className="talent-project-desc">
                                  {project.postWorkerDescription}
                                </p>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
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
