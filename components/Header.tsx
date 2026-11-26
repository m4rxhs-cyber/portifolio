'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, FlaskConical, Github, Linkedin } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { github, home, linkedin, resume, sectionIds } from '@/lib/home';

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

export function Header({ locale, labPage = false }: { locale: Locale; labPage?: boolean }) {
  const t = home[locale];
  const router = useRouter();
  const labHref = `/${locale}/test-lab`;
  const [active, setActive] = useState<string>('home');
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (labPage || process.env.NODE_ENV !== 'production') return;

    let cancelPrefetch: (() => void) | undefined;

    function prefetch() {
      const { connection } = navigator as Navigator & { connection?: NetworkInformation };
      if (connection?.saveData || connection?.effectiveType?.endsWith('2g')) return;
      router.prefetch(labHref);
    }

    function schedulePrefetch() {
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(prefetch);
        cancelPrefetch = () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(prefetch, 1000);
        cancelPrefetch = () => window.clearTimeout(id);
      }
    }

    if (document.readyState === 'complete') schedulePrefetch();
    else window.addEventListener('load', schedulePrefetch, { once: true });

    return () => {
      window.removeEventListener('load', schedulePrefetch);
      cancelPrefetch?.();
    };
  }, [labHref, labPage, router]);

  useEffect(() => {
    if (labPage) return;
    const sections = sectionIds.map((id) => document.getElementById(id));
    function updateActive() {
      const root = document.documentElement;
      const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
      const scrollPadding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
      const anchor = sections.find((section) => section && '#' + section.id === window.location.hash);
      if (anchor) {
        const top = anchor.getBoundingClientRect().top + window.scrollY - scrollPadding;
        const destination = Math.min(maxScroll, Math.max(0, top));
        if (Math.abs(window.scrollY - destination) <= 2) {
          setActive(anchor.id);
          return;
        }
      }

      if (maxScroll > 0 && window.scrollY >= maxScroll - 2) {
        setActive('contact');
        return;
      }

      const threshold = Math.min(140, window.innerHeight / 4);
      const current = sections.flatMap((section) => section ? [{ id: section.id, top: section.getBoundingClientRect().top }] : [])
        .filter(({ top }) => top <= threshold)
        .sort((first, second) => second.top - first.top)[0];
      setActive(current?.id ?? 'home');
    }
    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);
    window.addEventListener('hashchange', updateActive);
    return () => {
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
      window.removeEventListener('hashchange', updateActive);
    };
  }, [labPage]);

  const closeMenu = () => { if (menu.current) menu.current.open = false; };
  const links = <>
    {sectionIds.map((id, index) => labPage ? (
      <Link key={id} href={`/${locale}#${id}`} onClick={closeMenu}>{t.nav[index]}</Link>
    ) : (
      <a key={id} href={'#' + id} aria-current={id === active ? 'location' : undefined} onClick={closeMenu}>{t.nav[index]}</a>
    ))}
    <Link href={labHref} prefetch={false} aria-current={labPage ? 'page' : undefined} onClick={closeMenu}>
      <FlaskConical size={14} aria-hidden="true" />{t.nav[sectionIds.length]}
    </Link>
  </>;

  const alternate = locale === 'pt' ? 'en' : 'pt';

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href={labPage ? `/${locale}` : '#home'}>
          <span className="brand-mark" aria-hidden="true"><i />NS</span>
          <span className="brand-name">Neemias Sales<small>{locale === 'pt' ? 'Analista de QA' : 'QA Engineer'}</small></span>
        </Link>
        <nav className="desktop-nav" aria-label={t.menu}>{links}</nav>
        <div className="header-actions">
          <a className="social" aria-label="GitHub" href={github} target="_blank" rel="noopener noreferrer"><Github size={17} /></a>
          <a className="social" aria-label="LinkedIn" href={linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={16} /></a>
          <a className="language" href={'/' + alternate + (labPage ? '/test-lab' : active === 'home' ? '' : '#' + active)} hrefLang={alternate} lang={alternate}
            aria-label={alternate === 'en' ? 'English' : 'Português'}
            onClick={(event) => {
              const hash = window.location.hash;
              if (hash && !labPage) {
                event.currentTarget.href = '/' + alternate + hash;
              }
            }}>{alternate.toUpperCase()}</a>
          <a className="resume" href={resume} target="_blank" rel="noopener noreferrer">{t.resume}<ArrowUpRight size={14} /></a>
          <details className="mobile-menu" ref={menu}>
            <summary>{t.menu}</summary>
            <nav aria-label={t.menu}>{links}</nav>
          </details>
        </div>
      </div>
    </header>
  );
}
