import { sx } from '../lib/style';
import { sectionLabel } from '../lib/theme';
import type { IdentityHeader, IdentitySignal } from '../types';

interface Props {
  identity: IdentityHeader;
  signals: IdentitySignal[];
}

function candidateBarColor(score: number): string {
  return score >= 90 ? '#9141ac' : score >= 80 ? '#b16cc9' : '#c9ccd1';
}

export function IdentityResolution({ identity, signals }: Props) {
  return (
    <div style={{ margin: '12px 0 24px' }}>
      <div style={{ ...sx(sectionLabel), marginBottom: 3 }}>Résolution d'identité</div>
      <div style={sx('font-size:13px;color:rgba(0,0,0,0.5);line-height:1.5;margin-bottom:12px;')}>
        Cette personne trouvée sur Internet est-elle la même que celle que vous cherchez ? Rapprochement
        basé sur les traces numériques publiques.
      </div>

      {/* Identité consolidée */}
      <div
        style={sx(
          'display:flex;align-items:center;gap:16px;background:#f7eefb;border:1px solid #e8d6f3;border-radius:12px;padding:15px 18px;animation:fadeUp .3s ease;',
        )}
      >
        <div
          style={sx(
            'width:36px;height:36px;border-radius:50%;background:#9141ac;display:flex;align-items:center;justify-content:center;flex:none;',
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
          </svg>
        </div>
        <div style={sx('flex:1;min-width:0;')}>
          <div
            style={sx(
              'font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#7d2e9b;margin-bottom:3px;',
            )}
          >
            Identité consolidée
          </div>
          <div style={sx('font-size:17px;font-weight:700;color:rgba(0,0,0,0.85);word-break:break-word;')}>
            {identity.canonical}
          </div>
          <div style={sx('font-size:12px;color:rgba(0,0,0,0.5);margin-top:2px;')}>{identity.summary}</div>
        </div>
        <div style={sx('text-align:right;flex:none;')}>
          <div style={sx('font-size:22px;font-weight:700;color:#9141ac;line-height:1;')}>
            {identity.confidence} %
          </div>
          <div style={sx('font-size:11px;color:rgba(0,0,0,0.5);')}>confiance</div>
        </div>
      </div>

      {/* Identités candidates */}
      <div style={{ ...sx(sectionLabel), margin: '18px 0 9px' }}>Identités candidates</div>
      <div style={sx('display:flex;flex-direction:column;gap:7px;')}>
        {identity.candidates.map((c, i) => (
          <div
            key={i}
            style={sx(
              `display:flex;align-items:center;gap:14px;background:#fff;border:1px solid ${
                c.canonical ? '#e8d6f3' : 'rgba(0,0,0,0.09)'
              };border-radius:10px;padding:11px 14px;animation:fadeUp .25s ease;${
                c.canonical ? 'box-shadow:0 1px 8px rgba(145,65,172,0.1);' : ''
              }`,
            )}
          >
            <div style={sx('flex:1;min-width:0;')}>
              <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap;')}>
                <span style={sx('font-size:14px;font-weight:700;color:rgba(0,0,0,0.82);')}>{c.name}</span>
                {c.canonical && (
                  <span
                    style={sx(
                      'flex:none;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:#f3e3fa;color:#7d2e9b;',
                    )}
                  >
                    Retenu
                  </span>
                )}
              </div>
              <div style={sx('font-size:11px;color:rgba(0,0,0,0.45);margin-top:1px;')}>{c.note}</div>
            </div>
            <div
              style={sx(
                'width:110px;flex:none;height:6px;border-radius:999px;background:#e6e6e9;overflow:hidden;',
              )}
            >
              <div
                style={sx(
                  `height:6px;border-radius:999px;width:${c.score}%;background:${candidateBarColor(
                    c.score,
                  )};transition:width .5s ease;`,
                )}
              />
            </div>
            <span
              style={sx(
                'font-size:14px;font-weight:700;color:rgba(0,0,0,0.7);width:44px;text-align:right;flex:none;',
              )}
            >
              {c.score} %
            </span>
          </div>
        ))}
      </div>

      {/* Signaux de rapprochement */}
      {signals.length > 0 && (
        <>
          <div style={{ ...sx(sectionLabel), margin: '18px 0 9px' }}>
            Signaux de rapprochement · {signals.length}
          </div>
          <div style={sx('display:flex;flex-direction:column;gap:9px;')}>
            {signals.map((sig) => (
              <div
                key={sig.num}
                style={sx(
                  'background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:11px;padding:13px 15px;animation:fadeUp .25s ease;',
                )}
              >
                <div style={sx('display:flex;align-items:center;gap:11px;')}>
                  <span
                    style={sx(
                      'width:24px;height:24px;border-radius:7px;background:#f7eefb;color:#9141ac;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex:none;',
                    )}
                  >
                    {sig.num}
                  </span>
                  <div style={sx('flex:1;min-width:0;font-size:14px;font-weight:700;color:rgba(0,0,0,0.82);')}>
                    {sig.title}
                  </div>
                  <span
                    style={sx(
                      'flex:none;font-size:12px;font-weight:700;color:#1a8f57;background:#eafaf1;border-radius:6px;padding:3px 9px;',
                    )}
                  >
                    {sig.weight}
                  </span>
                </div>
                <div
                  style={sx(
                    'font-size:12px;line-height:1.55;color:rgba(0,0,0,0.55);margin-top:8px;padding-left:35px;',
                  )}
                >
                  {sig.desc}
                </div>
                {sig.items && sig.items.length > 0 && (
                  <div style={sx('margin-top:10px;padding-left:35px;display:flex;flex-direction:column;gap:6px;')}>
                    {sig.items.map((it, i) => (
                      <div key={i} style={sx('display:flex;align-items:baseline;gap:10px;')}>
                        <span
                          style={sx(
                            "flex:none;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#9141ac;min-width:38px;",
                          )}
                        >
                          {it.tag}
                        </span>
                        <span style={sx('font-size:12px;line-height:1.5;color:rgba(0,0,0,0.7);word-break:break-word;')}>
                          {it.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {sig.chips && sig.chips.length > 0 && (
                  <div style={sx('margin-top:10px;padding-left:35px;display:flex;flex-wrap:wrap;gap:6px;')}>
                    {sig.chips.map((ch, i) => (
                      <span
                        key={i}
                        style={sx(
                          'font-size:11px;font-weight:600;color:#1a8f57;background:#eafaf1;border-radius:6px;padding:3px 9px;',
                        )}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
                {sig.verdict && (
                  <div
                    style={sx(
                      'margin-top:11px;margin-left:35px;padding-top:9px;border-top:1px solid rgba(0,0,0,0.06);font-size:12px;font-weight:700;color:#7d2e9b;',
                    )}
                  >
                    → {sig.verdict}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
