import type { ReactNode } from 'react';
import { sx } from '../lib/style';
import { sectionLabel } from '../lib/theme';
import { SmtpVerify } from './SmtpVerify';
import type { SmtpResult } from '../services/desktopApi';
import type {
  Candidate,
  CandidateStatus,
  DomainGuess,
  EmailFormat,
  Source,
  SourceStatus,
  TriState,
} from '../types';

interface Props {
  best: Candidate | null;
  showBest: boolean;
  copied: boolean;
  onCopy: () => void;
  domains: DomainGuess[];
  format: EmailFormat | null;
  sources: Source[];
  candidates: Candidate[];
  /** Shell natif avec SMTP réel disponible (desktop). */
  nativeSmtp?: boolean;
  /** Mode « sources publiques uniquement » : désactive les sondes actives (SMTP). */
  publicOnly?: boolean;
  /** Confiance calculée pour l'adresse retenue (remplace le score brut sur la carte). */
  computedScore?: number | null;
  /** Remonte le résultat SMTP (recalcul du score). */
  onSmtpResult?: (result: SmtpResult) => void;
  /** Bloc « Résolution d'identité », rendu en tête des résultats. */
  identitySlot?: ReactNode;
  /** Bloc « Vérification technique », rendu entre les sources et les adresses testées. */
  techSlot?: ReactNode;
  /** Tableau de score calculé, rendu après la vérification technique. */
  scoreSlot?: ReactNode;
}

const tone = {
  ok: 'background:#eafaf1;color:#1a8f57;',
  warn: 'background:#fdf6e3;color:#9a6700;',
  fail: 'background:#fdecec;color:#c01c28;',
  dim: 'background:#f0f0f2;color:rgba(0,0,0,0.45);',
};

function chip(label: string, t: keyof typeof tone, mono = false) {
  return { label, style: `display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;${mono ? "font-family:'JetBrains Mono',monospace;" : ''}${tone[t]}` };
}

function triChip(label: string, v: TriState) {
  return v === true ? chip(`${label} ✓`, 'ok') : v === 'partial' ? chip(`${label} ~`, 'warn') : chip(`${label} —`, 'dim');
}

// --- Domaines ---

function domainBarColor(score: number): string {
  return score >= 70 ? '#2ec27e' : score >= 40 ? '#e5a50a' : '#c9ccd1';
}

function DomainsSection({ domains }: { domains: DomainGuess[] }) {
  const top = domains.length ? Math.max(...domains.map((d) => d.score)) : -1;
  return (
    <>
      <div style={{ ...sx(sectionLabel), margin: '6px 0 10px' }}>Domaines probables · {domains.length}</div>
      <div style={sx('display:flex;flex-direction:column;gap:8px;margin-bottom:22px;')}>
        {domains.map((d) => {
          const isTop = d.score === top;
          const chips = [
            triChip('Site', d.site),
            triChip('MX', d.mx),
            d.pub > 0 ? chip(`Emails publics · ${d.pub}`, 'ok') : chip('Emails publics —', 'dim'),
          ];
          return (
            <div
              key={d.domain}
              style={sx(
                `background:#fff;border:1px solid ${
                  isTop ? '#bfe8d2' : 'rgba(0,0,0,0.09)'
                };border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;animation:fadeUp .25s ease;${
                  isTop ? 'box-shadow:0 1px 8px rgba(46,194,126,0.12);' : ''
                }`,
              )}
            >
              <div style={sx('display:flex;align-items:center;gap:12px;justify-content:space-between;')}>
                <span style={sx('display:flex;align-items:center;gap:9px;min-width:0;')}>
                  <span
                    style={sx(
                      "font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:600;color:rgba(0,0,0,0.85);word-break:break-all;",
                    )}
                  >
                    {d.domain}
                  </span>
                  {isTop && (
                    <span
                      style={sx(
                        'flex:none;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:#eafaf1;color:#1a8f57;',
                      )}
                    >
                      Retenu
                    </span>
                  )}
                </span>
                <span style={sx('font-size:15px;font-weight:700;color:rgba(0,0,0,0.7);flex:none;')}>{d.score} %</span>
              </div>
              <div style={sx('display:flex;align-items:center;gap:14px;')}>
                <div
                  style={sx(
                    'flex:1;height:7px;border-radius:999px;background:#e6e6e9;overflow:hidden;min-width:70px;',
                  )}
                >
                  <div
                    style={sx(
                      `height:7px;border-radius:999px;width:${d.score}%;background:${domainBarColor(
                        d.score,
                      )};transition:width .5s ease;`,
                    )}
                  />
                </div>
                <span style={sx('display:flex;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end;')}>
                  {chips.map((c, i) => (
                    <span key={i} style={sx(c.style)}>
                      {c.label}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// --- Format principal ---

function FormatSection({ format }: { format: EmailFormat }) {
  return (
    <>
      <div style={{ ...sx(sectionLabel), margin: '6px 0 10px' }}>Format principal</div>
      <div
        style={sx(
          'background:#fff;border:1px solid #cfe0f7;border-radius:12px;padding:15px 16px;margin-bottom:22px;animation:fadeUp .25s ease;',
        )}
      >
        <div style={sx('display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap;')}>
          <div style={sx('display:flex;align-items:center;gap:12px;min-width:0;flex-wrap:wrap;')}>
            <span
              style={sx(
                "font-family:'JetBrains Mono',monospace;font-size:19px;font-weight:700;color:#1c64c4;background:#eaf2fd;border-radius:8px;padding:5px 13px;",
              )}
            >
              {format.primary}
            </span>
            <span style={sx('font-size:13px;color:rgba(0,0,0,0.5);')}>
              par ex.{' '}
              <span style={sx("font-family:'JetBrains Mono',monospace;color:rgba(0,0,0,0.7);")}>
                {format.example}
              </span>
            </span>
          </div>
          <div style={sx('text-align:right;flex:none;')}>
            <div style={sx('font-size:22px;font-weight:700;color:#1c64c4;line-height:1;')}>
              {format.confidence} %
            </div>
            <div style={sx('font-size:11px;color:rgba(0,0,0,0.5);')}>confiance</div>
          </div>
        </div>
        <div style={sx('margin-top:12px;height:7px;border-radius:999px;background:#e6e6e9;overflow:hidden;')}>
          <div
            style={sx(`height:7px;border-radius:999px;width:${format.confidence}%;background:#3584e4;transition:width .5s ease;`)}
          />
        </div>
        <div style={sx('margin-top:14px;display:flex;flex-direction:column;gap:7px;')}>
          {format.distribution.map((fm, i) => (
            <div key={i} style={sx('display:flex;align-items:center;gap:10px;')}>
              <span
                style={sx(
                  "font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(0,0,0,0.6);width:120px;flex:none;",
                )}
              >
                {fm.fmt}
              </span>
              <div style={sx('flex:1;height:5px;border-radius:999px;background:#ececed;overflow:hidden;')}>
                <div
                  style={sx(
                    `height:5px;border-radius:999px;width:${fm.pct}%;background:${
                      fm.pct >= 50 ? '#3584e4' : 'rgba(0,0,0,0.25)'
                    };`,
                  )}
                />
              </div>
              <span
                style={sx('font-size:11px;font-weight:700;color:rgba(0,0,0,0.5);width:36px;text-align:right;flex:none;')}
              >
                {fm.pct} %
              </span>
            </div>
          ))}
        </div>
        <div style={sx('margin-top:14px;border-top:1px solid rgba(0,0,0,0.07);padding-top:12px;')}>
          <div
            style={sx(
              'font-size:11px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:rgba(0,0,0,0.4);margin-bottom:8px;',
            )}
          >
Exemples au format · {format.samples.length}
          </div>
          <div style={sx('display:flex;gap:7px;flex-wrap:wrap;')}>
            {format.samples.map((sm, i) => (
              <span
                key={i}
                style={sx(
                  "font-family:'JetBrains Mono',monospace;font-size:12px;background:#f0f0f2;color:rgba(0,0,0,0.62);border-radius:6px;padding:3px 9px;",
                )}
              >
                {sm}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// --- Sources ---

const SOURCE_TONE: Record<SourceStatus, { dot: string; bg: string; color: string; label: string }> = {
  found: { dot: '#2ec27e', bg: '#eafaf1', color: '#1a8f57', label: 'Trouvé' },
  partial: { dot: '#e5a50a', bg: '#fdf6e3', color: '#9a6700', label: 'Indirect' },
  none: { dot: '#c9ccd1', bg: '#f0f0f2', color: 'rgba(0,0,0,0.5)', label: 'Aucun' },
};

function SourcesSection({ sources }: { sources: Source[] }) {
  return (
    <>
      <div style={{ ...sx(sectionLabel), margin: '6px 0 10px' }}>Sources analysées · {sources.length}</div>
      <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:22px;')}>
        {sources.map((src, i) => {
          const m = SOURCE_TONE[src.status] ?? SOURCE_TONE.none;
          return (
            <div
              key={i}
              style={sx(
                'display:flex;gap:10px;align-items:center;background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:10px;padding:10px 12px;animation:fadeUp .25s ease;',
              )}
            >
              <span style={sx(`width:9px;height:9px;border-radius:50%;flex:none;background:${m.dot};`)} />
              <div style={sx('flex:1;min-width:0;')}>
                <div style={sx('font-size:13px;font-weight:700;color:rgba(0,0,0,0.78);')}>{src.label}</div>
                <div style={sx('font-size:11px;color:rgba(0,0,0,0.5);line-height:1.4;')}>{src.detail}</div>
              </div>
              <span
                style={sx(
                  `flex:none;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:${m.bg};color:${m.color};white-space:nowrap;`,
                )}
              >
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// --- Adresses testées ---

const CAND_TONE: Record<CandidateStatus, { label: string; bg: string; color: string; bd: string }> = {
  valide: { label: 'Valide', bg: '#eafaf1', color: '#1a8f57', bd: '#bfe8d2' },
  invalide: { label: 'Invalide', bg: '#fdecec', color: '#c01c28', bd: '#f1cccd' },
  incertain: { label: 'Incertain', bg: '#fdf6e3', color: '#9a6700', bd: '#efe1a6' },
  testing: { label: 'Test en cours…', bg: '#eaf2fd', color: '#1c64c4', bd: '#cfe0f7' },
};

function candidateChips(c: Candidate) {
  const chips = [];
  if (c.smtp === 'ok') chips.push(chip('SMTP 250', 'ok', true));
  else if (c.smtp === 'fail') chips.push(chip('SMTP 550', 'fail', true));
  else chips.push(chip('SMTP ?', 'dim', true));
  chips.push(c.web === 'ok' ? chip('Web ✓', 'ok', true) : chip('Web —', 'dim', true));
  return chips;
}

function CandidatesSection({ candidates }: { candidates: Candidate[] }) {
  return (
    <>
      <div style={{ ...sx(sectionLabel), margin: '6px 0 10px' }}>Adresses testées · {candidates.length}</div>
      <div style={sx('display:flex;flex-direction:column;gap:9px;')}>
        {candidates.map((c) => {
          const status = c.status ?? 'testing';
          const m = CAND_TONE[status];
          const isTesting = status === 'testing';
          const isValide = status === 'valide';
          const barColor: Record<CandidateStatus, string> = {
            testing: '#c9ccd1',
            valide: '#2ec27e',
            incertain: '#e5a50a',
            invalide: '#c9ccd1',
          };
          const barStyle = isTesting
            ? 'height:6px;border-radius:999px;width:100%;background:linear-gradient(90deg,rgba(53,132,228,.15),#3584e4,rgba(53,132,228,.15));background-size:200% 100%;animation:shimmer 1.1s linear infinite;'
            : `height:6px;border-radius:999px;width:${c.score}%;background:${barColor[status]};transition:width .5s ease;`;
          return (
            <div
              key={c.email}
              style={sx(
                `background:#fff;border:1px solid ${
                  isValide ? '#bfe8d2' : 'rgba(0,0,0,0.09)'
                };border-radius:11px;padding:13px 15px;display:flex;flex-direction:column;gap:11px;animation:fadeUp .25s ease;${
                  isValide ? 'box-shadow:0 1px 8px rgba(46,194,126,0.12);' : ''
                }`,
              )}
            >
              <div style={sx('display:flex;align-items:center;gap:12px;justify-content:space-between;')}>
                <span
                  style={sx(
                    "font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;color:rgba(0,0,0,0.82);word-break:break-all;",
                  )}
                >
                  {c.email}
                </span>
                <span
                  style={sx(
                    `display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;font-size:12px;font-weight:700;background:${m.bg};color:${m.color};border:1px solid ${m.bd};white-space:nowrap;flex:none;`,
                  )}
                >
                  {isTesting && (
                    <span
                      style={sx(
                        'width:11px;height:11px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;',
                      )}
                    />
                  )}
                  {m.label}
                </span>
              </div>
              <div style={sx('display:flex;align-items:center;gap:14px;')}>
                <div style={sx('flex:1;height:6px;border-radius:999px;background:#e6e6e9;overflow:hidden;min-width:70px;')}>
                  <div style={sx(barStyle)} />
                </div>
                {!isTesting && (
                  <span style={sx('font-size:12px;font-weight:700;color:rgba(0,0,0,0.55);min-width:34px;text-align:right;')}>
                    {c.score} %
                  </span>
                )}
                {!isTesting && (
                  <span style={sx('display:flex;gap:6px;')}>
                    {candidateChips(c).map((ch, i) => (
                      <span key={i} style={sx(ch.style)}>
                        {ch.label}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ResultsList({
  best,
  showBest,
  copied,
  onCopy,
  domains,
  format,
  sources,
  candidates,
  nativeSmtp,
  publicOnly,
  computedScore,
  onSmtpResult,
  identitySlot,
  techSlot,
  scoreSlot,
}: Props) {
  return (
    <>
      {identitySlot}
      {showBest && best && (
        <div
          style={sx(
            'display:flex;align-items:center;gap:16px;background:#eafaf1;border:1px solid #bfe8d2;border-radius:12px;padding:16px 18px;margin:12px 0 20px;animation:fadeUp .3s ease;',
          )}
        >
          <div
            style={sx(
              'width:36px;height:36px;border-radius:50%;background:#2ec27e;display:flex;align-items:center;justify-content:center;color:#fff;font-size:19px;font-weight:700;flex:none;',
            )}
          >
            ✓
          </div>
          <div style={sx('flex:1;min-width:0;')}>
            <div
              style={sx(
                'font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#1a8f57;margin-bottom:3px;',
              )}
            >
              Adresse identifiée
            </div>
            <div
              style={sx(
                "font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:600;color:rgba(0,0,0,0.85);word-break:break-all;",
              )}
            >
              {best.email}
            </div>
          </div>
          <div style={sx('text-align:right;flex:none;')}>
            <div style={sx('font-size:22px;font-weight:700;color:#1a8f57;line-height:1;')}>
              {computedScore ?? best.score} %
            </div>
            <div style={sx('font-size:11px;color:rgba(0,0,0,0.5);')}>
              {computedScore != null ? 'confiance calculée' : 'confiance'}
            </div>
          </div>
          <button
            onClick={onCopy}
            style={sx(
              'border:none;background:#2ec27e;color:#fff;border-radius:8px;padding:9px 15px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;flex:none;',
            )}
          >
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      )}

      {showBest &&
        best &&
        nativeSmtp &&
        (publicOnly ? (
          <div
            style={sx(
              'margin:-8px 0 20px;font-size:12px;line-height:1.5;color:rgba(0,0,0,0.5);background:#fdf6e3;border:1px solid #efe1a6;border-radius:9px;padding:9px 12px;',
            )}
          >
            Vérification SMTP réelle disponible (shell natif). Désactivez «&nbsp;Sources publiques
            uniquement&nbsp;» dans les Paramètres pour l'activer.
          </div>
        ) : (
          <SmtpVerify email={best.email} onResult={onSmtpResult} />
        ))}

      {domains.length > 0 && <DomainsSection domains={domains} />}
      {format && <FormatSection format={format} />}
      {sources.length > 0 && <SourcesSection sources={sources} />}
      {techSlot}
      {scoreSlot}
      {candidates.length > 0 && <CandidatesSection candidates={candidates} />}
    </>
  );
}
