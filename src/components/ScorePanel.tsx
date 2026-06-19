import { useState } from 'react';
import { sx } from '../lib/style';
import { sectionLabel } from '../lib/theme';
import type { ScoredSignal } from '../services/scoring';

interface Props {
  signals: ScoredSignal[];
  total: number;
}

function totalColor(total: number): string {
  return total >= 70 ? '#1a8f57' : total >= 40 ? '#9a6700' : '#c01c28';
}

function weightLabel(s: ScoredSignal): string {
  return `${s.weight > 0 ? '+' : ''}${s.weight}`;
}

/**
 * Tableau de score **calculé** pour l'adresse retenue : seuls les signaux réellement
 * vérifiés contribuent, et le total est leur somme. Cliquer une ligne explique le
 * poids (méthodologie) et pourquoi il s'applique — ou non — à ce résultat.
 */
export function ScorePanel({ signals, total }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <div style={{ ...sx(sectionLabel), margin: '6px 0 10px' }}>Score de confiance · calculé</div>
      <div
        style={sx(
          'background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:11px;overflow:hidden;margin-bottom:22px;animation:fadeUp .25s ease;',
        )}
      >
        {/* En-tête : total */}
        <div
          style={sx(
            'display:flex;align-items:center;justify-content:space-between;padding:12px 15px;background:#f6f6f8;border-bottom:1px solid rgba(0,0,0,0.07);',
          )}
        >
          <div>
            <div style={sx('font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:rgba(0,0,0,0.5);')}>
              Confiance calculée
            </div>
            <div style={sx('font-size:11px;color:rgba(0,0,0,0.45);margin-top:2px;')}>
              somme des signaux vérifiés · cliquez une ligne pour le détail
            </div>
          </div>
          <div style={sx(`font-size:24px;font-weight:700;line-height:1;color:${totalColor(total)};`)}>{total} %</div>
        </div>

        {/* Lignes signal */}
        {signals.map((s) => {
          const isOpen = open === s.key;
          const accent = s.applied ? (s.penalty ? '#c01c28' : '#1a8f57') : 'rgba(0,0,0,0.4)';
          return (
            <div key={s.key} style={sx('border-top:1px solid rgba(0,0,0,0.05);')}>
              <div
                onClick={() => setOpen((cur) => (cur === s.key ? null : s.key))}
                style={sx('display:flex;align-items:center;gap:12px;padding:11px 15px;cursor:pointer;')}
              >
                <span
                  style={sx(
                    `width:18px;height:18px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;${
                      s.applied
                        ? s.penalty
                          ? 'background:#fdecec;color:#c01c28;'
                          : 'background:#eafaf1;color:#1a8f57;'
                        : 'background:#f0f0f2;color:rgba(0,0,0,0.4);'
                    }`,
                  )}
                >
                  {s.applied ? (s.penalty ? '!' : '✓') : s.pending ? '…' : '–'}
                </span>
                <span style={sx('flex:1;min-width:0;font-size:13px;color:rgba(0,0,0,0.78);')}>
                  {s.label}
                  {s.pending && (
                    <span style={sx('font-size:11px;color:rgba(0,0,0,0.4);')}> · en attente</span>
                  )}
                </span>
                <span
                  style={sx(
                    `font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;flex:none;color:${accent};${
                      s.applied ? '' : 'opacity:0.45;text-decoration:line-through;'
                    }`,
                  )}
                >
                  {weightLabel(s)}
                </span>
                <span
                  style={sx(
                    `flex:none;font-size:16px;line-height:1;color:rgba(0,0,0,0.3);transform:rotate(${
                      isOpen ? '90deg' : '0deg'
                    });transition:transform .2s;`,
                  )}
                >
                  ›
                </span>
              </div>
              {isOpen && (
                <div
                  style={sx(
                    'padding:0 15px 13px 45px;display:flex;flex-direction:column;gap:8px;animation:fadeUp .2s ease;',
                  )}
                >
                  <div style={sx('font-size:12px;line-height:1.6;color:rgba(0,0,0,0.66);')}>
                    <span style={sx('font-weight:700;color:rgba(0,0,0,0.5);')}>Pourquoi ce poids — </span>
                    {s.why}
                  </div>
                  <div
                    style={sx(
                      `font-size:12px;line-height:1.55;font-weight:700;color:${
                        s.applied ? (s.penalty ? '#c01c28' : '#1a8f57') : 'rgba(0,0,0,0.55)'
                      };`,
                    )}
                  >
                    → {s.reason}
                    {s.applied ? ` (${weightLabel(s)} appliqué)` : ' (0 appliqué)'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
