import { useId, useState } from 'react';
import styles from './PerformanceWorkspace.module.css';

type Series = { label: string; values: (number | null)[]; tone?: 'neutral' };

export function PerformanceChart({ title, description, times, unit, series, format, empty }: {
  title: string; description?: string; times: number[]; unit: string; series: Series[]; format: (value: number) => string; empty: string;
}) {
  const id = useId();
  const [active, setActive] = useState<number>();
  const width = 440;
  const left = 63;
  const right = 411;
  const top = 12;
  const bottom = 117;
  const largest = Math.max(1, ...series.flatMap(item => item.values.filter(value => value !== null)));
  const order = 10 ** Math.floor(Math.log10(largest / 4));
  const step = Math.ceil(largest / (4 * order)) * order;
  const x = (index: number) => left + times[index] * (right - left) / Math.max(1, times.at(-1) ?? 1);
  const y = (value: number) => bottom - value / (step * 4) * (bottom - top);
  const textAt = (index: number) => [
    format(times[index]) + ' s', ...series.map(item => {
      const value = item.values[index];
      return item.label + ' ' + (value === null ? 'N/A' : format(value) + ' ' + unit);
    }),
  ].join(' · ');

  return <figure className={styles.chart} aria-labelledby={id}>
    <figcaption id={id}>{title}</figcaption>
    {description && <p>{description}</p>}
    {times.length === 0 ? <p>{empty}</p> : <>
    <div className={styles.legend}>{series.map(item => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}</div>
    <svg viewBox={'0 0 ' + width + ' 145'} role="group" aria-labelledby={id} onMouseLeave={() => setActive(undefined)}>
      {[0, 1, 2, 3, 4].map(tick => <g key={tick}>
        <line x1={left} x2={right} y1={y(step * tick)} y2={y(step * tick)} />
        <text x={left - 7} y={y(step * tick)} textAnchor="end" dominantBaseline="middle">{format(step * tick)} {unit}</text>
      </g>)}
      {times.map((time, index) => (index === times.length - 1 || index % Math.ceil(times.length / 5) === 0) && <g key={index}>
        <line x1={x(index)} x2={x(index)} y1={top} y2={bottom} />
        <text textAnchor="middle" x={x(index)} y={135}>{format(time)}s</text>
      </g>)}
      {series.map(item => {
        const segments: string[][] = [[]];
        item.values.forEach((value, index) => {
          if (value === null) segments.push([]);
          else segments.at(-1)!.push(x(index) + ',' + y(value));
        });
        return <g key={item.label} className={styles.series} data-tone={item.tone}>
          {segments.map((segment, index) => segment.length > 1 && <g key={index}>
            <polygon points={segment[0].split(',')[0] + ',' + bottom + ' ' + segment.join(' ') + ' ' + segment.at(-1)!.split(',')[0] + ',' + bottom} />
            <polyline points={segment.join(' ')} />
          </g>)}
          {item.values.map((value, index) => value !== null && <circle key={index} cx={x(index)} cy={y(value)} r={active === index ? 4 : 2.7} />)}
        </g>;
      })}
      {times.map((_, index) => <rect key={index} x={x(index) - 7} y={top} width={14} height={bottom - top}
        className={styles.hit} tabIndex={0} role="img" aria-label={textAt(index)}
        onFocus={() => setActive(index)} onBlur={() => setActive(undefined)} onMouseEnter={() => setActive(index)}>
        <title>{textAt(index)}</title>
      </rect>)}
    </svg>
    {active !== undefined && active < times.length && <output className={styles.tooltip}>{textAt(active)}</output>}
    </>}
  </figure>;
}
