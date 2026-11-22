'use client';

import { useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { featuredProjects, home } from '@/lib/home';
import { projectDetails } from '@/lib/project-details';
import styles from './ProjectDetails.module.css';

type ProjectId = (typeof featuredProjects)[number]['id'];

export function ProjectDetails({ locale }: { locale: Locale }) {
  const [openProject, setOpenProject] = useState<ProjectId | null>(null);
  const copy = projectDetails[locale];
  const { projectTitles, projectRepository } = home[locale];

  return (
    <section id="project-details" className={`shell ${styles.section}`} aria-labelledby="project-details-title">
      <header className={styles.header}>
        <p className={styles.label}>{copy.label}</p>
        <h2 id="project-details-title">{copy.heading}{' '}<span>{copy.emphasis}</span></h2>
        <p className={styles.description}>{copy.description}</p>
      </header>
      <div className={styles.cards}>
        {featuredProjects.map((project, index) => {
          const study = copy.cases[project.id];
          const expanded = openProject === project.id;
          const titleId = `project-${project.id}-title`;
          const panelId = `project-${project.id}-panel`;

          return (
            <article id={project.id} key={project.id} className={styles.card} data-expanded={expanded} aria-labelledby={titleId}>
              <div className={styles.summary}>
                <div className={styles.identity}>
                  <p className={styles.category}>{study.category}</p>
                  <h3 id={titleId}>{projectTitles[index]}</h3>
                </div>
                <div className={styles.overview}>
                  <p>{study.summary}</p>
                  {'url' in project && (
                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                      {projectRepository}<ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  )}
                </div>
                <ul className={styles.tools} role="list">
                  {project.technologies.map((technology) => <li key={technology}>{technology}</li>)}
                </ul>
                <button
                  type="button"
                  className={styles.toggle}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpenProject(current => current === project.id ? null : project.id)}
                >
                  {expanded ? copy.collapse : copy.expand}<ChevronDown size={18} aria-hidden="true" />
                </button>
              </div>
              <div id={panelId} className={styles.panel} inert={!expanded} aria-hidden={!expanded}>
                <div className={styles.panelClip}>
                  <div className={styles.panelContent}>
                    {study.sections.map(([title, description]) => (
                      <div key={title}>
                        <h4>{title}</h4>
                        <p>{description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
