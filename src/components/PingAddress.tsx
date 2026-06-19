import { useEffect, useRef, useState } from 'react';
import { sx } from '../lib/style';
import { sectionLabel } from '../lib/theme';
import { pingEmail, type PingResult, type PingStatus } from '../services/pingService';

interface Props {
  /** Adresse proposée (la meilleure trouvée par la recherche), pré-remplie. */
  suggestedEmail: string;
}

const TONE: Record<PingStatus, { bg: string; border: string; color: string; dot: string; label: string }> = {
  mx_ok: { bg: '#eafaf1', border: '#bfe8d2', color: '#1a8f57', dot: '#2ec27e', label: 'Domaine joignable' },
  a_only: { bg: '#fdf6e3', border: '#efe1a6', color: '#9a6700', dot: '#e5a50a', label: 'MX implicite' },
  no_mail: { bg: '#fdf6e3', border: '#efe1a6', color: '#9a6700', dot: '#e5a50a', label: 'Pas de réception' },
  invalid_syntax: { bg: '#fdecec', border: '#f1cccd', color: '#c01c28', dot: '#e01b24', label: 'Syntaxe invalide' },
  domain_error: { bg: '#fdecec', border: '#f1cccd', color: '#c01c28', dot: '#e01b24', label: 'Domaine introuvable' },
  network_error: { bg: '#f0f0f2', border: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.6)', dot: '#c9ccd1', label: 'DNS injoignable' },
};

export function PingAddress({ suggestedEmail }: Props) {
  const [email, setEmail] = useState(suggestedEmail);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PingResult | null>(null);
  const lastSuggested = useRef(suggestedEmail);

  // Pré-remplit automatiquement avec la dernière adresse trouvée, tant que
  // l'utilisateur n'a pas saisi autre chose manuellement.
  useEffect(() => {
    if (suggestedEmail && suggestedEmail !== lastSuggested.current) {
      setEmail((cur) => (cur === lastSuggested.current || cur === '' ? suggestedEmail : cur));
      lastSuggested.current = suggestedEmail;
      setResult(null);
    }
  }, [suggestedEmail]);

  const canPing = email.trim().length > 0 && !loading;

  const runPing = async () => {
    if (!canPing) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await pingEmail(email));
    } finally {
      setLoading(false);
    }
  };

  const tone = result ? TONE[result.status] : null;

  return (
    <div style={sx('margin-top:18px;')}>
      <div style={sx(sectionLabel)}>Ping de l'adresse</div>
      <div style={sx('font-size:12px;line-height:1.5;color:rgba(0,0,0,0.5);margin:4px 0 9px;')}>
        Vérifie en DNS (passif, public) que le domaine existe et accepte les emails.
      </div>

      <div style={sx('background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:10px;padding:9px 12px;')}>
        <input
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            lastSuggested.current = e.target.value;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runPing();
          }}
          placeholder="prenom.nom@exemple.com"
          style={sx(
            "width:100%;border:none;background:transparent;font-family:'JetBrains Mono',monospace;font-size:14px;color:rgba(0,0,0,0.85);padding:2px 0;",
          )}
        />
      </div>

      <button
        onClick={() => void runPing()}
        disabled={!canPing}
        style={sx(
          `width:100%;margin-top:9px;display:flex;align-items:center;justify-content:center;gap:9px;background:#fff;color:#1c64c4;border:1px solid #9ec3f3;border-radius:9px;padding:10px;font-family:inherit;font-size:14px;font-weight:700;cursor:${
            canPing ? 'pointer' : 'default'
          };opacity:${email.trim().length === 0 ? '0.6' : '1'};`,
        )}
      >
        {loading && (
          <span
            style={sx(
              'width:13px;height:13px;border:2px solid rgba(28,100,196,0.35);border-top-color:#1c64c4;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;',
            )}
          />
        )}
        {loading ? 'Ping en cours…' : 'Ping de l\'adresse'}
      </button>

      {result && tone && (
        <div
          style={sx(
            `margin-top:10px;background:${tone.bg};border:1px solid ${tone.border};border-radius:10px;padding:12px 13px;animation:fadeUp .25s ease;`,
          )}
        >
          <div style={sx('display:flex;align-items:center;gap:9px;')}>
            <span style={sx(`width:9px;height:9px;border-radius:50%;flex:none;background:${tone.dot};`)} />
            <span style={sx(`font-size:13px;font-weight:700;color:${tone.color};flex:1;min-width:0;`)}>{tone.label}</span>
            {result.status !== 'invalid_syntax' && result.status !== 'network_error' && (
              <span
                style={sx(
                  "font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(0,0,0,0.45);flex:none;",
                )}
              >
                {result.elapsedMs} ms · {result.resolver}
              </span>
            )}
          </div>

          <div style={sx('font-size:12px;line-height:1.5;color:rgba(0,0,0,0.62);margin-top:7px;')}>
            {result.message}
          </div>

          {result.mx.length > 0 && (
            <div style={sx('margin-top:9px;display:flex;flex-direction:column;gap:5px;')}>
              {result.mx.map((mx, i) => (
                <div key={i} style={sx('display:flex;align-items:baseline;gap:9px;')}>
                  <span
                    style={sx(
                      "flex:none;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#1c64c4;min-width:32px;",
                    )}
                  >
                    MX {mx.priority}
                  </span>
                  <span
                    style={sx(
                      "font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(0,0,0,0.7);word-break:break-all;",
                    )}
                  >
                    {mx.host}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div
            style={sx(
              'margin-top:10px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.06);font-size:11px;line-height:1.5;color:rgba(0,0,0,0.45);',
            )}
          >
            Le ping confirme que le domaine reçoit des emails, pas que la boîte existe.
            Vérifier la boîte exige un test SMTP côté serveur.
          </div>
        </div>
      )}
    </div>
  );
}
