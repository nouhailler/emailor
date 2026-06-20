import { useState } from 'react';
import { sx } from '../lib/style';
import { verifyEmail, type SmtpResult, type SmtpStatus, type VerifyMethod } from '../services/desktopApi';

/** Une méthode de vérification disponible (sonde locale ou fournisseur tiers). */
export interface VerifyOption {
  id: VerifyMethod;
  label: string;
  /** Clé API (vide pour la sonde SMTP locale). */
  key?: string;
}

interface Props {
  email: string;
  options: VerifyOption[];
  /** Remonte le résultat (pour recalculer le score de confiance). */
  onResult?: (result: SmtpResult) => void;
}

interface Tone {
  bg: string;
  border: string;
  color: string;
  dot: string;
  label: string;
}

const TONE: Record<SmtpStatus, Tone> = {
  deliverable: { bg: '#eafaf1', border: '#bfe8d2', color: '#1a8f57', dot: '#2ec27e', label: 'Boîte confirmée' },
  undeliverable: { bg: '#fdecec', border: '#f1cccd', color: '#c01c28', dot: '#e01b24', label: 'Boîte inexistante' },
  catch_all: { bg: '#fdf6e3', border: '#efe1a6', color: '#9a6700', dot: '#e5a50a', label: 'Indéterminé · catch-all' },
  unknown: { bg: '#fdf6e3', border: '#efe1a6', color: '#9a6700', dot: '#e5a50a', label: 'Réponse ambiguë' },
  no_mx: { bg: '#fdecec', border: '#f1cccd', color: '#c01c28', dot: '#e01b24', label: 'Domaine sans MX' },
  timeout: { bg: '#f0f0f2', border: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.6)', dot: '#c9ccd1', label: 'MX injoignable' },
  unreachable: { bg: '#f0f0f2', border: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.6)', dot: '#c9ccd1', label: 'MX injoignable' },
  smtp_error: { bg: '#f0f0f2', border: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.6)', dot: '#c9ccd1', label: 'Erreur SMTP' },
  provider_error: { bg: '#f0f0f2', border: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.6)', dot: '#c9ccd1', label: 'Erreur fournisseur' },
  invalid_syntax: { bg: '#fdecec', border: '#f1cccd', color: '#c01c28', dot: '#e01b24', label: 'Syntaxe invalide' },
};

function reliabilityNote(r: SmtpResult): string {
  switch (r.status) {
    case 'deliverable':
      return 'Le serveur a accepté le destinataire et rejette les adresses bidon. Forte probabilité d\'existence.';
    case 'undeliverable':
      return 'Le destinataire a été rejeté. La boîte n\'existe probablement pas.';
    case 'catch_all':
      return 'Le domaine accepte aussi une adresse aléatoire : impossible de distinguer une vraie boîte (catch-all / anti-énumération).';
    case 'unknown':
      return 'Réponse non concluante. On s\'appuie sur le format et l\'identité résolue.';
    case 'unreachable':
    case 'timeout':
      return 'Le port 25 sortant est filtré (VPN / FAI). Essayez une vérification via API (Hunter/Abstract/ZeroBounce), insensible au port 25.';
    case 'provider_error':
      return r.message || 'Le fournisseur n\'a pas pu répondre (clé API ? quota ?).';
    default:
      return r.message || '';
  }
}

export function SmtpVerify({ email, options, onResult }: Props) {
  const [loading, setLoading] = useState<VerifyMethod | null>(null);
  const [result, setResult] = useState<SmtpResult | null>(null);
  const [error, setError] = useState('');

  const run = async (opt: VerifyOption) => {
    setLoading(opt.id);
    setError('');
    setResult(null);
    try {
      const r = await verifyEmail(email, opt.id, opt.key ?? '');
      setResult(r);
      onResult?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(null);
    }
  };

  const tone = result ? TONE[result.status] : null;

  return (
    <div style={sx('margin:-8px 0 20px;')}>
      <div style={sx('display:flex;flex-wrap:wrap;gap:8px;align-items:center;')}>
        {options.map((opt, idx) => {
          const isNative = opt.id === 'smtp';
          const busy = loading === opt.id;
          const primary = idx === 0;
          return (
            <button
              key={opt.id}
              onClick={() => void run(opt)}
              disabled={loading !== null}
              style={sx(
                `display:inline-flex;align-items:center;gap:7px;border-radius:9px;padding:8px 13px;font-family:inherit;font-size:13px;font-weight:700;cursor:${
                  loading ? 'default' : 'pointer'
                };border:1px solid ${primary ? '#9ec3f3' : 'rgba(0,0,0,0.14)'};background:${
                  primary ? '#fff' : '#fafafb'
                };color:${primary ? '#1c64c4' : 'rgba(0,0,0,0.7)'};`,
              )}
            >
              {busy && (
                <span
                  style={sx(
                    'width:12px;height:12px;border:2px solid rgba(28,100,196,0.35);border-top-color:#1c64c4;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;',
                  )}
                />
              )}
              {busy
                ? 'Vérification…'
                : isNative
                  ? 'Vérifier la boîte (SMTP)'
                  : `Vérifier via ${opt.label}`}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={sx('margin-top:9px;font-size:12px;color:#c01c28;')}>Échec de la vérification : {error}</div>
      )}

      {result && tone && (
        <div
          style={sx(
            `margin-top:10px;background:${tone.bg};border:1px solid ${tone.border};border-radius:10px;padding:12px 13px;animation:fadeUp .25s ease;`,
          )}
        >
          <div style={sx('display:flex;align-items:center;gap:9px;flex-wrap:wrap;')}>
            <span style={sx(`width:9px;height:9px;border-radius:50%;flex:none;background:${tone.dot};`)} />
            <span style={sx(`font-size:13px;font-weight:700;color:${tone.color};`)}>{tone.label}</span>
            {result.provider && (
              <span
                style={sx(
                  'font-size:11px;font-weight:700;color:#7d2e9b;background:#f7eefb;border-radius:6px;padding:2px 8px;text-transform:capitalize;',
                )}
              >
                {result.provider}
              </span>
            )}
            {typeof result.code === 'number' && (
              <span
                style={sx(
                  "font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#1c64c4;background:#eaf2fd;border-radius:6px;padding:2px 8px;",
                )}
              >
                RCPT {result.code}
              </span>
            )}
            {typeof result.score === 'number' && (
              <span
                style={sx(
                  "font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#1a8f57;background:#eafaf1;border-radius:6px;padding:2px 8px;",
                )}
              >
                fiabilité {result.score} %
              </span>
            )}
            {result.catch_all && (
              <span
                style={sx(
                  "font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#9a6700;background:#fdf6e3;border-radius:6px;padding:2px 8px;",
                )}
              >
                catch-all {result.code_catchall ?? ''}
              </span>
            )}
            {result.mx && (
              <span style={sx("font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(0,0,0,0.45);")}>
                {result.mx}
              </span>
            )}
          </div>
          {reliabilityNote(result) && (
            <div style={sx('font-size:12px;line-height:1.5;color:rgba(0,0,0,0.6);margin-top:7px;')}>
              {reliabilityNote(result)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
