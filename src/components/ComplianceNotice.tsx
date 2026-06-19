import { useEffect, useState } from 'react';
import { sx } from '../lib/style';

const STORAGE = 'oremail_public_only';

/** Le mode « sources publiques uniquement » est-il actif ? (par défaut : oui). */
export function usePublicOnly(): [boolean, (v: boolean) => void] {
  const [publicOnly, setPublicOnly] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE) !== '0';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, publicOnly ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [publicOnly]);
  return [publicOnly, setPublicOnly];
}

interface Props {
  publicOnly: boolean;
  onChange: (value: boolean) => void;
}

/**
 * Encart de conformité (RGPD / CGU). La vérification SMTP et l'agrégation
 * d'identité depuis des sources publiques doivent être validées par l'équipe
 * produit avant activation des vérifications réseau réelles.
 */
export function ComplianceNotice({ publicOnly, onChange }: Props) {
  return (
    <div>
      <div
        style={sx(
          'font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:rgba(0,0,0,0.42);margin-bottom:10px;',
        )}
      >
        Conformité &amp; périmètre
      </div>
      <div
        style={sx(
          'background:#fdf6e3;border:1px solid #efe1a6;border-radius:12px;padding:14px 15px;display:flex;flex-direction:column;gap:12px;',
        )}
      >
        <div style={sx('font-size:12px;line-height:1.6;color:#9a6700;')}>
          La vérification SMTP et l'agrégation d'identité depuis des sources publiques touchent au RGPD
          et aux CGU des plateformes. Les vérifications réseau réelles (DNS/MX, SMTP) doivent passer par
          un service serveur dédié et être validées par l'équipe produit avant activation.
        </div>
        <label style={sx('display:flex;align-items:flex-start;gap:10px;cursor:pointer;')}>
          <input
            type="checkbox"
            checked={publicOnly}
            onChange={(e) => onChange(e.target.checked)}
            style={sx('margin-top:2px;width:16px;height:16px;flex:none;accent-color:#3584e4;cursor:pointer;')}
          />
          <span style={sx('font-size:13px;line-height:1.5;color:rgba(0,0,0,0.72);')}>
            <span style={sx('font-weight:700;')}>Sources publiques uniquement</span>
            <br />
            Désactive toute sonde réseau active (SMTP, énumération). Seules les traces publiques sont
            exploitées.
          </span>
        </label>
      </div>
    </div>
  );
}
