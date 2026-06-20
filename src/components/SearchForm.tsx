import type { KeyboardEvent } from 'react';
import { sx } from '../lib/style';
import { sectionLabel } from '../lib/theme';
import { HelpTip } from './HelpTip';
import type { SearchInput } from '../types';

interface Props {
  value: SearchInput;
  searching: boolean;
  onChange: (patch: Partial<SearchInput>) => void;
  onSubmit: () => void;
}

const fieldLabel = sx('font-size:11px;font-weight:700;color:rgba(0,0,0,0.45);');
const input = sx(
  'width:100%;border:none;background:transparent;font-family:inherit;font-size:15px;color:rgba(0,0,0,0.85);padding:2px 0 0;',
);
const inputMono = sx(
  "width:100%;border:none;background:transparent;font-family:'JetBrains Mono',monospace;font-size:14px;color:rgba(0,0,0,0.85);padding:2px 0 0;",
);

export function SearchForm({ value, searching, onChange, onSubmit }: Props) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') onSubmit();
  };

  const btnStyle = sx(
    `width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;gap:9px;background:#3584e4;color:#fff;border:none;border-radius:9px;padding:12px;font-family:inherit;font-size:15px;font-weight:700;cursor:${
      searching ? 'default' : 'pointer'
    };opacity:${searching ? '0.75' : '1'};`,
  );

  return (
    <>
      <div style={{ ...sx(sectionLabel), marginBottom: 10 }}>Personne à rechercher</div>

      <div style={sx('background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:12px;overflow:hidden;')}>
        <div style={sx('padding:9px 14px;')}>
          <div style={fieldLabel}>Prénom</div>
          <input
            value={value.prenom}
            onChange={(e) => onChange({ prenom: e.target.value })}
            onKeyDown={onKey}
            placeholder="Roger"
            style={input}
          />
        </div>
        <div style={sx('padding:9px 14px;border-top:1px solid rgba(0,0,0,0.07);')}>
          <div style={fieldLabel}>Nom</div>
          <input
            value={value.nom}
            onChange={(e) => onChange({ nom: e.target.value })}
            onKeyDown={onKey}
            placeholder="Dupont"
            style={input}
          />
        </div>
        <div style={sx('padding:9px 14px;border-top:1px solid rgba(0,0,0,0.07);')}>
          <div style={sx('display:flex;align-items:center;gap:6px;')}>
            <span style={fieldLabel}>Société</span>
            <HelpTip text="Tapez un fournisseur perso (gmail, outlook, yahoo, proton…) ici pour générer directement des adresses personnelles prénom.nom@…, au lieu de chercher une entreprise." />
          </div>
          <input
            value={value.societe}
            onChange={(e) => onChange({ societe: e.target.value })}
            onKeyDown={onKey}
            placeholder="Nestlé"
            style={input}
          />
        </div>
        <div style={sx('padding:9px 14px;border-top:1px solid rgba(0,0,0,0.07);')}>
          <div style={sx('display:flex;align-items:center;gap:6px;')}>
            <span style={fieldLabel}>
              Domaine connu <span style={sx('font-weight:400;')}>(optionnel)</span>
            </span>
            <HelpTip text="Si vous connaissez le domaine (ex. nestle.com), renseignez-le : la vérification DNS, le format dominant et le score de confiance deviennent plus fiables." />
          </div>
          <input
            value={value.domaine}
            onChange={(e) => onChange({ domaine: e.target.value })}
            onKeyDown={onKey}
            placeholder="nestle.com"
            style={inputMono}
          />
        </div>
      </div>

      <button onClick={onSubmit} disabled={searching} style={btnStyle}>
        {searching && (
          <span
            style={sx(
              'width:13px;height:13px;border:2px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;',
            )}
          />
        )}
        {searching ? 'Recherche en cours…' : 'Lancer la recherche'}
      </button>
    </>
  );
}
