import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
export function LabSelect({ name, items, value, disabled, onChange }: {
  name: string;
  items: readonly { code?: string; title: string }[];
  value: number;
  disabled: boolean;
  onChange: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    options.current[value]?.focus();
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open, value]);

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!open) {
      if (!disabled) setOpen(true);
      return;
    }
    const focused = options.current.findIndex((option) => option === document.activeElement);
    const last = items.length - 1;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? last
      : Math.min(last, Math.max(0, focused + (event.key === 'ArrowDown' ? 1 : -1)));
    options.current[next]?.focus();
  }

  const caption = (index: number) => (
    <span className="lab-scenario-caption">
      {items[index].code && <code>{items[index].code}</code>}
      <span>{items[index].title}</span>
    </span>
  );

  return (
    <div className="lab-scenario-select" ref={root} onKeyDown={handleKeys}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
      <span className="lab-scenario-label">{name}</span>
      <button ref={trigger} type="button" className="lab-scenario-trigger" disabled={disabled}
        aria-label={name + ': ' + items[value].title} aria-haspopup="listbox" aria-expanded={open}
        aria-controls={open ? listId : undefined} onClick={() => setOpen(!open)}>
        {caption(value)}<ChevronDown size={17} aria-hidden="true" />
      </button>
      {open && (
        <div className="lab-scenario-options" id={listId} role="listbox" aria-label={name}>
          {items.map(({ title }, index) => (
            <button key={title} type="button" role="option" aria-selected={index === value} tabIndex={-1}
              ref={(el) => { options.current[index] = el; }}
              onClick={() => { onChange(index); setOpen(false); trigger.current?.focus(); }}>
              {caption(index)}{index === value && <Check size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
