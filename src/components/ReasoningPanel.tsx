import { sx } from '../lib/style';
import { sectionLabel } from '../lib/theme';
import type { ReasonKind, ReasonLine } from '../types';

interface Props {
  searching: boolean;
  reasoning: ReasonLine[];
}

const KIND_COLOR: Record<ReasonKind, string> = {
  info: '#3584e4',
  fail: '#e01b24',
  success: '#2ec27e',
  discovery: '#9141ac',
};

function rowStyle(kind: ReasonKind): string {
  if (kind === 'discovery')
    return 'display:flex;gap:10px;align-items:flex-start;padding:9px 11px;margin:2px 0;background:#f7eefb;border:1px solid #e8d6f3;border-radius:8px;animation:fadeUp .25s ease;';
  if (kind === 'success')
    return 'display:flex;gap:10px;align-items:flex-start;padding:9px 11px;margin:2px 0;background:#eafaf1;border:1px solid #cdeedd;border-radius:8px;animation:fadeUp .25s ease;';
  return 'display:flex;gap:10px;align-items:flex-start;padding:7px 5px;animation:fadeUp .25s ease;';
}

export function ReasoningPanel({ searching, reasoning }: Props) {
  return (
    <>
      <div style={sx('margin-top:22px;display:flex;align-items:center;gap:8px;')}>
        <div style={sx(sectionLabel)}>Raisonnement de l'IA</div>
        {searching && (
          <span
            style={sx(
              'width:7px;height:7px;border-radius:50%;background:#3584e4;animation:pulse 1s ease-in-out infinite;',
            )}
          />
        )}
      </div>

      {reasoning.length === 0 ? (
        <div
          style={sx(
            'margin-top:10px;font-size:13px;line-height:1.5;color:rgba(0,0,0,0.42);background:#fff;border:1px dashed rgba(0,0,0,0.13);border-radius:10px;padding:14px;',
          )}
        >
          Le détail des hypothèses, des tests et de la déduction du domaine s'affichera ici pendant la
          recherche.
        </div>
      ) : (
        <div
          style={sx(
            'margin-top:10px;background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:10px;padding:8px 10px;',
          )}
        >
          {reasoning.map((line, i) => (
            <div key={i} style={sx(rowStyle(line.kind))}>
              <span
                style={sx(
                  `width:8px;height:8px;border-radius:50%;margin-top:6px;flex:none;background:${KIND_COLOR[line.kind]};`,
                )}
              />
              <span style={sx('font-size:13px;line-height:1.5;color:rgba(0,0,0,0.74);')}>{line.text}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
