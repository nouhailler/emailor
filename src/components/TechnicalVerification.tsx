import { sx } from '../lib/style';
import { sectionLabel } from '../lib/theme';
import type { ScoringRow, TechStatus, TechTest } from '../types';

interface Props {
  tests: TechTest[];
  scoring: ScoringRow[];
}

const STATUS_TONE: Record<TechStatus, { bg: string; color: string }> = {
  ok: { bg: '#eafaf1', color: '#1a8f57' },
  info: { bg: '#eaf2fd', color: '#1c64c4' },
  warn: { bg: '#fdf6e3', color: '#9a6700' },
  fail: { bg: '#fdecec', color: '#c01c28' },
};

function badgeLabel(t: TechTest): string {
  return t.fiab != null ? `Fiabilité ${t.fiab}` : t.statusLabel ?? '';
}

export function TechnicalVerification({ tests, scoring }: Props) {
  return (
    <>
      <div style={{ ...sx(sectionLabel), margin: '6px 0 10px' }}>
        Vérification technique des emails · {tests.length}
      </div>
      <div style={sx('display:flex;flex-direction:column;gap:9px;margin-bottom:14px;')}>
        {tests.map((t) => {
          const tone = STATUS_TONE[t.status] ?? STATUS_TONE.info;
          return (
            <div
              key={t.num}
              style={sx(
                'background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:11px;padding:13px 15px;animation:fadeUp .25s ease;',
              )}
            >
              <div style={sx('display:flex;align-items:center;gap:11px;')}>
                <span
                  style={sx(
                    'width:24px;height:24px;border-radius:7px;background:#eaf2fd;color:#1c64c4;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex:none;',
                  )}
                >
                  {t.num}
                </span>
                <div style={sx('flex:1;min-width:0;font-size:14px;font-weight:700;color:rgba(0,0,0,0.82);')}>
                  {t.title}
                </div>
                <span
                  style={sx(
                    `flex:none;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:${tone.bg};color:${tone.color};white-space:nowrap;`,
                  )}
                >
                  {badgeLabel(t)}
                </span>
              </div>
              <div
                style={sx(
                  'font-size:12px;line-height:1.55;color:rgba(0,0,0,0.55);margin-top:8px;padding-left:35px;',
                )}
              >
                {t.desc}
              </div>
              <div style={sx('margin-top:10px;padding-left:35px;display:flex;flex-direction:column;gap:6px;')}>
                {t.items.map((it, i) => (
                  <div key={i} style={sx('display:flex;align-items:baseline;gap:10px;')}>
                    <span
                      style={sx(
                        "flex:none;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#1c64c4;min-width:44px;",
                      )}
                    >
                      {it.tag}
                    </span>
                    <span
                      style={sx(
                        "font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5;color:rgba(0,0,0,0.7);word-break:break-all;",
                      )}
                    >
                      {it.text}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={sx(
                  'margin-top:11px;margin-left:35px;padding-top:9px;border-top:1px solid rgba(0,0,0,0.06);font-size:12px;font-weight:700;color:#1c64c4;',
                )}
              >
                → {t.verdict}
              </div>
            </div>
          );
        })}
      </div>

      {scoring.length > 0 && (
        <div
          style={sx(
            'background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:11px;overflow:hidden;margin-bottom:22px;animation:fadeUp .25s ease;',
          )}
        >
          <div
            style={sx(
              'display:flex;align-items:center;justify-content:space-between;padding:10px 15px;background:#f6f6f8;border-bottom:1px solid rgba(0,0,0,0.07);',
            )}
          >
            <span style={sx('font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:rgba(0,0,0,0.5);')}>
              Signal
            </span>
            <span style={sx('font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:rgba(0,0,0,0.5);')}>
              Poids
            </span>
          </div>
          {scoring.map((row, i) => (
            <div
              key={i}
              style={sx(
                'display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 15px;border-top:1px solid rgba(0,0,0,0.05);',
              )}
            >
              <span style={sx('font-size:13px;color:rgba(0,0,0,0.72);')}>{row.signal}</span>
              <span
                style={sx(
                  `font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${
                    row.pos ? '#1a8f57' : '#c01c28'
                  };flex:none;`,
                )}
              >
                {row.weight}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
