import { ArrowUpRight, FileText, Github, Linkedin, Mail } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { contactCopy } from '@/lib/contact';
import { github, home, linkedin, resume } from '@/lib/home';
import styles from './ContactSection.module.css';

const channels = [
  { id: 'email', title: 'E-mail', href: 'mailto:contato.neemias.sales@gmail.com', Icon: Mail },
  { id: 'linkedin', title: 'LinkedIn', href: linkedin, Icon: Linkedin },
  { id: 'github', title: 'GitHub', href: github, Icon: Github },
  { id: 'resume', href: resume, Icon: FileText },
] as const;

export function ContactSection({ locale }: { locale: Locale }) {
  const copy = contactCopy[locale];

  return (
    <footer id="contact" className={`shell ${styles.section}`} aria-labelledby="contact-title">
      <div className={styles.message}>
        <p className={styles.label}>{copy.label}</p>
        <h2 id="contact-title">
          {copy.title[0]}{' '}<span className={styles.titleEnding}>{copy.title[1]}<span className={styles.period}>.</span></span>
        </h2>
        <p className={styles.description}>{copy.description}</p>
        <p className={styles.availability}>{copy.availability}</p>
      </div>
      <div className={styles.channels}>
        <h3 className={styles.label}>{copy.channels}</h3>
        <ul className={styles.list} role="list">
          {channels.map(({ id, href, Icon, ...channel }) => (
            <li key={id}>
              <a href={href} target={id === 'email' ? undefined : '_blank'} rel={id === 'email' ? undefined : 'noopener noreferrer'}>
                <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
                <span className={styles.channelCopy}>
                  <strong>{'title' in channel ? channel.title : home[locale].resume}</strong>
                  <span>{copy.descriptions[id]}</span>
                </span>
                <ArrowUpRight size={20} className={styles.arrow} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
