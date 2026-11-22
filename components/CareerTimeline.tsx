import type { Locale } from '@/lib/content';
import { career } from '@/lib/career';
import styles from './CareerTimeline.module.css';

export function CareerTimeline({ locale }: { locale: Locale }) {
  const copy = career[locale];

  return (
    <section id="experience" className={`shell ${styles.section}`} aria-labelledby="experience-title">
      <header className={styles.header}>
        <p className={styles.label}>{copy.label}</p>
        <h2 id="experience-title">{copy.title}<span>.</span></h2>
        <p className={styles.intro}>{copy.description}</p>
      </header>
      <ol className={styles.timeline} role="list">
        {copy.entries.map(entry => (
          <li key={entry.period} className={styles.entry} data-current={entry.current || undefined}>
            <div className={styles.meta}>
              <p className={styles.period}>{entry.period}</p>
              <p className={styles.kind}>{copy.kinds[entry.kind]}</p>
            </div>
            <div className={styles.content}>
              <div className={styles.entryHeading}>
                <h3>{entry.title}</h3>
                {entry.current && <span className={styles.status}>{copy.current}</span>}
              </div>
              <p className={styles.description}>{entry.description}</p>
              <ul className={styles.tags} role="list">
                {entry.tags.map(tag => <li key={tag}>{tag}</li>)}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
