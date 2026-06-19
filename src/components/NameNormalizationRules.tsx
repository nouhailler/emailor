import { useState } from 'react';
import { NAME_RULES } from '../data/nameRules';
import { sx } from '../lib/style';

/**
 * Moteur de normalisation des noms internationaux : accordéon de 11 pays
 * (un seul ouvert à la fois).
 */
export function NameNormalizationRules() {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (code: string) => setOpen((cur) => (cur === code ? null : code));

  return (
    <div>
      <div
        style={sx(
          'font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:rgba(0,0,0,0.42);margin-bottom:4px;',
        )}
      >
        Normalisation des noms internationaux
      </div>
      <div style={sx('font-size:12px;line-height:1.55;color:rgba(0,0,0,0.5);margin-bottom:11px;')}>
        Base de règles linguistiques par pays. Cliquez sur un pays pour afficher la particularité,
        l'explication et des exemples de formats d'email générés.
      </div>
      <div style={sx('display:flex;flex-direction:column;gap:7px;')}>
        {NAME_RULES.map((r) => {
          const isOpen = open === r.code;
          return (
            <div
              key={r.code}
              style={sx(
                `background:#fff;border:1px solid ${
                  isOpen ? '#9ec3f3' : 'rgba(0,0,0,0.09)'
                };border-radius:11px;overflow:hidden;transition:border-color .15s;`,
              )}
            >
              <div
                onClick={() => toggle(r.code)}
                style={sx('display:flex;align-items:center;gap:12px;padding:11px 13px;cursor:pointer;')}
              >
                <span
                  style={sx(
                    `flex:none;width:36px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:${
                      isOpen ? '#eaf2fd' : '#f0f0f2'
                    };color:${
                      isOpen ? '#1c64c4' : 'rgba(0,0,0,0.55)'
                    };font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;`,
                  )}
                >
                  {r.code}
                </span>
                <div style={sx('flex:1;min-width:0;')}>
                  <div style={sx('font-size:14px;font-weight:700;color:rgba(0,0,0,0.82);')}>{r.pays}</div>
                  <div style={sx('font-size:12px;color:rgba(0,0,0,0.5);line-height:1.4;')}>{r.particularite}</div>
                </div>
                <span
                  style={sx(
                    `flex:none;font-size:18px;line-height:1;color:rgba(0,0,0,0.35);transform:rotate(${
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
                    'padding:3px 14px 15px;border-top:1px solid rgba(0,0,0,0.07);display:flex;flex-direction:column;gap:12px;animation:fadeUp .2s ease;',
                  )}
                >
                  <div style={sx('display:flex;flex-direction:column;gap:8px;margin-top:11px;')}>
                    {r.paragraphs.map((p, i) => (
                      <div key={i} style={sx('font-size:13px;line-height:1.6;color:rgba(0,0,0,0.66);')}>
                        {p}
                      </div>
                    ))}
                  </div>
                  {r.examples.map((ex, i) => (
                    <div
                      key={i}
                      style={sx('background:#f6f6f8;border:1px solid rgba(0,0,0,0.07);border-radius:9px;padding:11px 12px;')}
                    >
                      <div style={sx('display:flex;align-items:baseline;gap:8px;margin-bottom:9px;flex-wrap:wrap;')}>
                        <span style={sx('font-size:13px;font-weight:700;color:rgba(0,0,0,0.78);')}>{ex.name}</span>
                        {ex.note && (
                          <span style={sx('font-size:11px;font-style:italic;color:rgba(0,0,0,0.45);')}>{ex.note}</span>
                        )}
                      </div>
                      <div style={sx('display:flex;flex-wrap:wrap;gap:6px;')}>
                        {ex.emails.map((em, j) => (
                          <span
                            key={j}
                            style={sx(
                              "font-family:'JetBrains Mono',monospace;font-size:12px;background:#fff;border:1px solid rgba(0,0,0,0.1);color:#1c64c4;border-radius:6px;padding:3px 9px;",
                            )}
                          >
                            {em}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
