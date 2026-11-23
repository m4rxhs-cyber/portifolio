import { useRef } from 'react';
import styles from './RestWorkspace.module.css';

export function RestTabs({ id, label, tabs, active, onChange }: {
  id: string; label: string; tabs: readonly string[]; active: number; onChange: (index: number) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={styles.tabs} role="tablist" aria-label={label}>
    {tabs.map((tab, index) => (
      <button key={tab} ref={node => { buttons.current[index] = node; }} id={`${id}-tab-${index}`} type="button" role="tab"
        aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1}
        onClick={() => onChange(index)} onKeyDown={event => {
          const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
          if (next === undefined) return;
          event.preventDefault(); onChange(next); buttons.current[next]?.focus();
        }}>{tab}</button>
    ))}
  </div>;
}
