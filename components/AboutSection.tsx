import { aboutCopy } from '@/lib/about';
import type { Locale } from '@/lib/content';

export function AboutSection({ locale }: { locale: Locale }) {
  const copy = aboutCopy[locale];
  const [educationStart, degree, educationMiddle, award, educationEnd] = copy.education;

  return (
    <section id="about" className="shell about-section" aria-labelledby="about-title">
      <header className="about-header">
        <p className="about-kicker">{copy.label}</p>
        <h2 id="about-title">{copy.heading}{' '}<span>{copy.emphasis}</span></h2>
      </header>
      <div className="about-introduction">
        {copy.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <p className="about-education">
        {educationStart}<strong>{degree}</strong>{educationMiddle}<strong>{award}</strong>{educationEnd}
      </p>
      <div className="about-specialties">
        <h3 className="about-kicker">{copy.specialties}</h3>
        <ol className="about-cards">
          {copy.cards.map(({ title, description }, index) => (
            <li key={title}>
              <span className="about-card-number" aria-hidden="true">0{index + 1} /</span>
              <h4>{title}</h4>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
