import { sx } from '../lib/style';

interface Props {
  onExit: () => void;
}

/**
 * Bandeau « Mode démo » affiché au-dessus des résultats lorsqu'une démo à données
 * FICTIVES est lancée — pour qu'on ne confonde jamais la démo avec un vrai résultat.
 */
export function DemoBanner({ onExit }: Props) {
  return (
    <div
      style={sx(
        'display:flex;align-items:center;gap:11px;background:#f7eefb;border:1px solid #e8d6f3;border-radius:10px;padding:10px 13px;margin-bottom:16px;',
      )}
    >
      <span
        style={sx(
          'font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#fff;background:#9141ac;border-radius:6px;padding:3px 8px;flex:none;',
        )}
      >
        ▶ Mode démo
      </span>
      <span style={sx('flex:1;min-width:0;font-size:12.5px;line-height:1.5;color:#7d2e9b;')}>
        Données <strong>fictives</strong> (cas « Roger Dupont ») — aucune recherche réelle n'est effectuée.
      </span>
      <button
        onClick={onExit}
        style={sx(
          'flex:none;border:1px solid #e8d6f3;background:#fff;border-radius:8px;padding:6px 12px;font-family:inherit;font-size:12px;font-weight:700;color:#7d2e9b;cursor:pointer;',
        )}
      >
        Quitter la démo
      </button>
    </div>
  );
}
