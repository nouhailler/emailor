import { useEffect, useRef, useState } from 'react';
import { sx } from '../lib/style';
import { useLogs } from '../hooks/useLogs';
import { clearLog, dumpLog, formatTime, PREFIX, type LogDir } from '../lib/logStore';

// Palette « terminal » : vert dominant sur fond noir, nuances par direction.
const COLOR: Record<LogDir, string> = {
  out: '#5ef38c', //  sortant (requête)
  in: '#39d353', //   entrant (réponse)
  info: '#7d8b7d', //  info / trace backend
  err: '#ff6b6b', //   erreur
};

/**
 * Petite console réseau (vert sur noir) en bas des Paramètres. Affiche en direct les
 * aller-retours entre Emailor et le monde extérieur (DNS, SMTP natif, OpenRouter),
 * avec la trace détaillée du port 25. Bouton « Copier » pour coller le journal et
 * analyser pourquoi le port 25 ne s'ouvre pas.
 */
export function LogConsole() {
  const logs = useLogs();
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-défilement vers le bas à chaque nouvelle ligne.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(dumpLog());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <div
        style={sx(
          'font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:rgba(0,0,0,0.42);margin-bottom:10px;',
        )}
      >
        Journal réseau · diagnostic
      </div>
      <div style={sx('font-size:12px;line-height:1.5;color:rgba(0,0,0,0.5);margin-bottom:10px;')}>
        Trace en direct des échanges entre Emailor et l'extérieur (DNS, SMTP natif sur le port 25,
        OpenRouter). Lance une recherche ou « Vérifier la boîte (SMTP) », puis copie le contenu pour
        l'analyser.
      </div>

      <div
        style={sx(
          'background:#0c0f0c;border:1px solid #1c241c;border-radius:11px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.4);',
        )}
      >
        {/* Barre du « terminal » */}
        <div
          style={sx(
            'display:flex;align-items:center;gap:7px;padding:8px 12px;background:#111611;border-bottom:1px solid #1c241c;',
          )}
        >
          <span style={sx('width:11px;height:11px;border-radius:50%;background:#ff5f56;flex:none;')} />
          <span style={sx('width:11px;height:11px;border-radius:50%;background:#ffbd2e;flex:none;')} />
          <span style={sx('width:11px;height:11px;border-radius:50%;background:#27c93f;flex:none;')} />
          <span
            style={sx(
              "margin-left:6px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#5ef38c;opacity:0.8;",
            )}
          >
            emailor — réseau ({logs.length})
          </span>
        </div>

        {/* Corps défilant */}
        <div
          ref={scrollRef}
          style={sx(
            "height:200px;overflow:auto;padding:11px 13px;background:#0c0f0c;font-family:'JetBrains Mono',monospace;font-size:11.5px;line-height:1.65;",
          )}
        >
          {logs.length === 0 ? (
            <div style={sx('color:#3f5a3f;')}>
              <span style={sx('color:#5ef38c;')}>$</span> en attente d'activité réseau…
            </div>
          ) : (
            logs.map((e) => (
              <div key={e.id} style={sx('display:flex;gap:9px;white-space:pre-wrap;word-break:break-word;')}>
                <span style={sx('color:#3f5a3f;flex:none;')}>{formatTime(e.t)}</span>
                <span style={sx(`color:${COLOR[e.dir]};flex:none;`)}>{PREFIX[e.dir]}</span>
                <span style={sx(`color:${COLOR[e.dir]};flex:1;min-width:0;`)}>{e.msg}</span>
              </div>
            ))
          )}
        </div>

        {/* Pied : copier / vider */}
        <div
          style={sx(
            'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;background:#111611;border-top:1px solid #1c241c;',
          )}
        >
          <button
            onClick={clearLog}
            style={sx(
              "border:1px solid #2a352a;background:transparent;color:#7d8b7d;border-radius:7px;padding:6px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;cursor:pointer;",
            )}
          >
            Vider
          </button>
          <button
            onClick={() => void copy()}
            disabled={logs.length === 0}
            style={sx(
              `border:1px solid #2f5a3a;background:${copied ? '#173d22' : '#12241a'};color:#5ef38c;border-radius:7px;padding:6px 14px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;cursor:${
                logs.length === 0 ? 'default' : 'pointer'
              };opacity:${logs.length === 0 ? 0.5 : 1};`,
            )}
          >
            {copied ? '✓ Copié' : 'Copier le journal'}
          </button>
        </div>
      </div>
    </div>
  );
}
