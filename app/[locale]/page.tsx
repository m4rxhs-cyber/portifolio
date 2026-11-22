import { notFound } from 'next/navigation';
import {
  ArrowRight, ArrowUpRight, CodeXml, FlaskConical, Github,
  Infinity as InfinityIcon, Linkedin, Mail, Play, Timer, Users, CheckCheck,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { AboutSection } from '@/components/AboutSection';
import { LaptopNetworkCable } from '@/components/LaptopNetworkCable';
import { NetworkConnections } from '@/components/NetworkConnections';
import { ProjectDetails } from '@/components/ProjectDetails';
import { StackSection } from '@/components/StackSection';
import { QAWorkflow } from '@/components/QAWorkflow';
import { TestExecutionDashboard } from '@/components/TestExecutionDashboard';
import { TestLab } from '@/components/test-lab/TestLab';
import { content } from '@/lib/content';
import { featuredProjects, github, home, linkedin, resume } from '@/lib/home';

export function generateStaticParams() {
  return [{ locale: 'pt' }, { locale: 'en' }];
}

export default async function Portfolio({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'pt' && locale !== 'en') notFound();

  const t = home[locale];
  const profile = content[locale];
  const metrics = [
    { value: t.years, Icon: CodeXml },
    { value: '20 min', Icon: Timer },
    { value: t.drivers, Icon: Users },
    { value: '~25', Icon: CheckCheck },
    { value: 'CI/CD', Icon: InfinityIcon },
  ];

  return (
    <>
      <a className="skip-link" href="#home">{t.skip}</a>
      <Header locale={locale} />
      <main>
        <section id="home" className="hero">
          <div className="hero-scene">
            <svg className="laptop-projection" viewBox="0 0 1920 640" preserveAspectRatio="none">
              <foreignObject width="1920" height="640">
                <div className="laptop-artboard">
                  <div className="laptop-screen"><TestExecutionDashboard locale={locale} /></div>
                </div>
              </foreignObject>
            </svg>
          </div>
          <div className="shell hero-inner">
            <div className="hero-copy">
              <p className="section-label">Quality Assurance <span>/</span> <span>Test Automation</span></p>
              <h1>{t.title}<br /><em>{t.emphasis}</em><span className="cursor" aria-hidden="true">_</span></h1>
              <p className="hero-intro">{t.intro}</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#projects"><Play size={15} />{t.projects}</a>
                <a className="button button-outline" href="#lab"><FlaskConical size={16} />{t.lab}</a>
              </div>
            </div>
          </div>
          <div className="hero-mobile-scene" role="img" aria-label={locale === 'pt'
            ? 'Estúdio de engenharia com caneca QA e smartphone exibindo um painel demonstrativo de testes Android, regressão e E2E.'
            : 'Engineering studio with a QA mug and a smartphone showing a demo dashboard for Android, regression, and E2E tests.'} />
        </section>
        <div className="shell metrics-wrap">
          <ul className="metrics">
            {metrics.map(({ value, Icon }, i) => (
              <li key={value}><Icon aria-hidden="true" /><div><strong>{value}</strong><span>{t.metrics[i]}</span></div></li>
            ))}
          </ul>
          <LaptopNetworkCable />
        </div>
        <section id="projects" className="shell featured">
          <div className="qa-project-intro">
            <NetworkConnections segment="metrics" />
            <div className="featured-heading">
              <div><p className="section-label">{t.featured}</p><h2>{t.cases}</h2></div>
              <a href={`${github}?tab=repositories`} target="_blank" rel="noopener noreferrer">{t.all}<ArrowRight size={16} /></a>
            </div>
          </div>
          <div className="project-grid">
            {featuredProjects.map((project, i) => (
              <article className="project-card" key={project.id}>
                <div aria-hidden="true" className={'project-cover cover-' + project.id} />
                <div className="project-copy">
                  <span className="project-tag">{t.tags[i]}</span>
                  <h3>
                    <a
                      href={'url' in project ? project.url : '#' + project.id}
                      target={'url' in project ? '_blank' : undefined}
                      rel={'url' in project ? 'noopener noreferrer' : undefined}
                    >
                      {t.projectTitles[i]}<ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </h3>
                  <p>{t.projectDescriptions[i]}</p>
                  <ul>{project.technologies.map((technology) => <li key={technology}>{technology}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
          <NetworkConnections segment="workflow" />
          <QAWorkflow locale={locale} />
        </section>
        <AboutSection locale={locale} />
        <ProjectDetails key={locale} locale={locale} />
        <section id="lab" className="shell supporting">
          <TestLab locale={locale} embedded />
        </section>
        <StackSection locale={locale} />
        <section id="experience" className="shell supporting">
          <h2>{profile.experienceTitle}</h2>
          {profile.experience.map((entry) => (
            <article className="experience-entry" key={entry.date}><p>{entry.date}</p><div><h3>{entry.role}</h3><p>{entry.desc}</p></div></article>
          ))}
        </section>
      </main>
      <footer id="contact" className="shell supporting">
        <h2>{profile.contactTitle}</h2><p>{profile.contactText}</p>
        <div className="hero-actions">
          <a className="button button-outline" href="mailto:contato.neemias.sales@gmail.com"><Mail size={16} />E-mail</a>
          <a className="button button-outline" href={linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={16} />LinkedIn</a>
          <a className="button button-outline" href={github} target="_blank" rel="noopener noreferrer"><Github size={16} />GitHub</a>
          <a className="button button-outline" href={resume} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={16} />{t.resume}</a>
        </div>
      </footer>
    </>
  );
}
