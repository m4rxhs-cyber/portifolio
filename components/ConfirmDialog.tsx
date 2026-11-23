'use client';

import { useEffect, useId, useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, onConfirm, onCancel, variant = 'default', loading = false, loadingLabel, error }: {
  open: boolean; title: string; description: string; confirmLabel: string; cancelLabel: string;
  onConfirm: () => void; onCancel: () => void; variant?: 'default' | 'destructive'; loading?: boolean; loadingLabel?: string; error?: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal();
      cancel.current?.focus();
    } else if (!open && element.open) {
      element.close();
      previousFocus.current?.focus();
      previousFocus.current = null;
    }
  }, [open]);

  return <dialog ref={dialog} className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={loading}
    onKeyDown={event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (!loading) onCancel();
    }}
    onCancel={event => { event.preventDefault(); if (!loading) onCancel(); }}>
    <div className={styles.heading}>
      {variant === 'destructive' && <TriangleAlert size={20} className={styles.warning} aria-hidden="true" />}
      <h2 id={`${id}-title`}>{title}</h2>
    </div>
    <p id={`${id}-description`}>{description}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.actions}>
      <button ref={cancel} type="button" aria-disabled={loading} onClick={() => { if (!loading) onCancel(); }}>{cancelLabel}</button>
      <button type="button" data-variant={variant} aria-disabled={loading} onClick={() => { if (!loading) onConfirm(); }}>{loading ? loadingLabel ?? confirmLabel : confirmLabel}</button>
    </div>
  </dialog>;
}
