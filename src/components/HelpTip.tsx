import { useEffect, useRef, useState } from 'react';
import { sx } from '../lib/style';

interface Props {
  /** Texte d'aide affiché dans la bulle. */
  text: string;
  /** Diamètre du pastille « ? » (px). */
  size?: number;
}

/**
 * Aide contextuelle : une petite pastille « ? » qui ouvre une bulle explicative au
 * clic. Positionnée en `fixed` (calculée à l'ouverture) pour ne pas être rognée par
 * les conteneurs à `overflow:auto`.
 */
export function HelpTip({ text, size = 16 }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const W = 260;
      const left = Math.max(12, Math.min(r.left, window.innerWidth - W - 12));
      setPos({ top: r.bottom + 8, left });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Aide"
        style={sx(
          `width:${size}px;height:${size}px;border-radius:50%;border:none;flex:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-size:${
            size * 0.68
          }px;font-weight:700;line-height:1;padding:0;background:${
            open ? '#3584e4' : 'rgba(0,0,0,0.10)'
          };color:${open ? '#fff' : 'rgba(0,0,0,0.55)'};transition:background .15s;`,
        )}
      >
        ?
      </button>
      {open && pos && (
        <div
          style={sx(
            `position:fixed;top:${pos.top}px;left:${pos.left}px;width:260px;z-index:80;background:#1f2430;color:#eef1f6;border-radius:10px;padding:11px 13px;font-size:12px;line-height:1.55;box-shadow:0 12px 30px rgba(0,0,0,0.35);animation:fadeUp .15s ease;`,
          )}
        >
          {text}
        </div>
      )}
    </>
  );
}
