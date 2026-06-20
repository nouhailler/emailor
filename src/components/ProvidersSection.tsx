import { useState } from 'react';
import { sx } from '../lib/style';
import type { Providers, ProviderName } from '../hooks/useProviders';

interface Props {
  providers: Providers;
}

interface Meta {
  id: ProviderName;
  name: string;
  role: string;
  desc: string;
  url: string;
  placeholder: string;
}

const PROVIDERS: Meta[] = [
  {
    id: 'hunter',
    name: 'Hunter.io',
    role: 'Recherche + vérification',
    desc: 'Active la recherche par données réelles (Email Finder, avec sources publiques) et la vérification SMTP côté serveur.',
    url: 'https://hunter.io/api-keys',
    placeholder: 'clé Hunter…',
  },
  {
    id: 'abstract',
    name: 'Abstract',
    role: 'Vérification',
    desc: 'Validation de délivrabilité (quality score, catch-all, MX, disposable). Insensible au blocage du port 25.',
    url: 'https://app.abstractapi.com/api/email-validation',
    placeholder: 'clé Abstract…',
  },
  {
    id: 'zerobounce',
    name: 'ZeroBounce',
    role: 'Vérification',
    desc: 'Validation riche (status / sub-status, spamtrap, abuse…). Insensible au blocage du port 25.',
    url: 'https://www.zerobounce.net/members/API',
    placeholder: 'clé ZeroBounce…',
  },
];

/**
 * Réglage des fournisseurs de données tiers. Les clés ne servent que côté backend
 * natif (proxy 127.0.0.1) : jamais envoyées au web. Hunter.io ajoute la recherche par
 * données réelles ; Abstract/ZeroBounce ajoutent une vérification qui **contourne le
 * port 25** bloqué (VPN/FAI).
 */
export function ProvidersSection({ providers }: Props) {
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setShown((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div>
      <div
        style={sx(
          'font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:rgba(0,0,0,0.42);margin-bottom:6px;',
        )}
      >
        Fournisseurs de données <span style={sx('font-weight:400;')}>(optionnel)</span>
      </div>
      <div style={sx('font-size:12px;line-height:1.55;color:rgba(0,0,0,0.5);margin-bottom:12px;')}>
        API tierces pour des résultats réels. Les clés restent locales (relayées par le shell natif, jamais
        exposées au navigateur). Abstract et ZeroBounce vérifient depuis leurs serveurs → <strong>insensibles
        au port 25 bloqué</strong>.
      </div>

      <div style={sx('display:flex;flex-direction:column;gap:10px;')}>
        {PROVIDERS.map((p) => {
          const value = providers.keys[p.id];
          const has = value.trim().length > 0;
          return (
            <div
              key={p.id}
              style={sx('background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:12px;padding:13px 14px;')}
            >
              <div style={sx('display:flex;align-items:center;gap:8px;margin-bottom:3px;')}>
                <span style={sx('font-size:13px;font-weight:700;color:rgba(0,0,0,0.8);')}>{p.name}</span>
                <span
                  style={sx(
                    'font-size:10px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:#7d2e9b;background:#f7eefb;border-radius:5px;padding:2px 7px;',
                  )}
                >
                  {p.role}
                </span>
                {has && (
                  <span style={sx('display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:#1a8f57;margin-left:auto;')}>
                    <span style={sx('width:6px;height:6px;border-radius:50%;background:#2ec27e;')} />
                    Activé
                  </span>
                )}
              </div>
              <div style={sx('font-size:12px;line-height:1.5;color:rgba(0,0,0,0.55);margin-bottom:9px;')}>
                {p.desc}{' '}
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  style={sx('color:#3584e4;text-decoration:none;font-weight:700;')}
                >
                  Obtenir une clé
                </a>
              </div>
              <div style={sx('display:flex;gap:8px;align-items:center;')}>
                <input
                  type={shown[p.id] ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => providers.setKey(p.id, e.target.value)}
                  placeholder={p.placeholder}
                  style={sx(
                    "flex:1;min-width:0;border:1px solid rgba(0,0,0,0.14);border-radius:8px;padding:8px 11px;font-family:'JetBrains Mono',monospace;font-size:13px;color:rgba(0,0,0,0.85);background:#fff;",
                  )}
                />
                <button
                  onClick={() => toggle(p.id)}
                  style={sx(
                    'border:1px solid rgba(0,0,0,0.14);background:#fff;border-radius:8px;padding:8px 11px;font-family:inherit;font-size:12px;font-weight:700;color:rgba(0,0,0,0.65);cursor:pointer;white-space:nowrap;',
                  )}
                >
                  {shown[p.id] ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
