import type { Locale } from '@/lib/content';
import { stack } from '@/lib/stack';
import styles from './StackSection.module.css';

export function StackSection({ locale }: { locale: Locale }) {
  const { title, description, categories } = stack[locale];

  return (
    <section id="stack" className={`shell ${styles.section}`} aria-labelledby="stack-title">
      <header className={styles.header}>
        <p className={styles.label}>Tech stack / Expertise</p>
        <h2 id="stack-title">{title}</h2>
        <p className={styles.intro}>{description}</p>
      </header>
      <ol className={styles.panel} role="list">
        {categories.map(({ title, description, tags }, index) => (
          <li key={title} className={styles.row}>
            <div className={styles.identity}>
              <span className={styles.number} aria-hidden="true">0{index + 1} /</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </div>
            <ul className={styles.tags} role="list">
              {tags.map(tag => <li key={tag}>{tag}</li>)}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
