import { useEffect, useRef, useState } from 'react';
import { sx } from '../lib/style';
import { TIPS } from '../data/help';

interface Props {
  onStartTour: () => void;
  onDemo: () => void;
  onOpenSettings: () => void;
}

/**
 * Bouton « ? » du bandeau : ouvre un menu d'aide regroupant la visite guidée, le
 * mode démo, l'accès aux Paramètres/journal réseau, et une astuce aléatoire.
 */
export function HelpButton({ onStartTour, onDemo, onOpenSettings }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const item = (label: string, desc: string, onClick: () => void, icon: string) => (
    <button
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      style={sx(
        'width:100%;text-align:left;border:none;background:transparent;cursor:pointer;display:flex;align-items:flex-start;gap:10px;padding:9px 12px;border-radius:9px;font-family:inherit;',
      )}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f2f4f8')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={sx('font-size:15px;line-height:1.2;flex:none;')}>{icon}</span>
      <span style={sx('flex:1;min-width:0;')}>
        <span style={sx('display:block;font-size:13px;font-weight:700;color:rgba(0,0,0,0.8);')}>{label}</span>
        <span style={sx('display:block;font-size:11.5px;line-height:1.45;color:rgba(0,0,0,0.5);margin-top:1px;')}>
          {desc}
        </span>
      </span>
    </button>
  );

  return (
    <div ref={ref} style={sx('position:relative;')}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Aide"
        title="Aide"
        style={sx(
          `width:30px;height:30px;border-radius:50%;border:1px solid rgba(0,0,0,0.12);cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;font-size:15px;font-weight:700;background:${
            open ? '#3584e4' : '#fff'
          };color:${open ? '#fff' : 'rgba(0,0,0,0.6)'};transition:all .15s;`,
        )}
      >
        ?
      </button>

      {open && (
        <div
          style={sx(
            'position:absolute;top:38px;right:0;width:288px;z-index:40;background:#fff;border:1px solid rgba(0,0,0,0.1);border-radius:13px;box-shadow:0 16px 40px rgba(0,0,0,0.22);padding:6px;animation:fadeUp .15s ease;',
          )}
        >
          <div
            style={sx(
              'font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:rgba(0,0,0,0.4);padding:8px 12px 4px;',
            )}
          >
            Aide & découverte
          </div>
          {item('Visite guidée', 'Reprendre le tour de l\'application', onStartTour, '🧭')}
          {item('Mode démo', 'Lancer un exemple à données fictives', onDemo, '▶')}
          {item('Paramètres & journal réseau', 'Modèle, conformité, diagnostic port 25', onOpenSettings, '⚙')}

          <div style={sx('margin:6px 8px 8px;background:#f7eefb;border:1px solid #e8d6f3;border-radius:9px;padding:10px 11px;')}>
            <div style={sx('font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#7d2e9b;margin-bottom:3px;')}>
              💡 Astuce · {tip.title}
            </div>
            <div style={sx('font-size:12px;line-height:1.5;color:rgba(0,0,0,0.62);')}>{tip.body}</div>
          </div>
        </div>
      )}
    </div>
  );
}
