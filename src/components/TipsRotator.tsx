import { useEffect, useState } from 'react';
import { sx } from '../lib/style';
import { TIPS } from '../data/help';

/**
 * Astuce rotative (« Le saviez-vous ? ») affichée dans l'état vide des résultats.
 * Change automatiquement toutes les 6 s ; flèches pour naviguer manuellement.
 */
export function TipsRotator() {
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    const iv = setInterval(() => setI((v) => (v + 1) % TIPS.length), 6000);
    return () => clearInterval(iv);
  }, []);

  const tip = TIPS[i];
  const go = (d: number) => setI((v) => (v + d + TIPS.length) % TIPS.length);

  return (
    <div
      style={sx(
        'max-width:380px;width:100%;background:#f7eefb;border:1px solid #e8d6f3;border-radius:12px;padding:14px 16px;text-align:left;',
      )}
    >
      <div style={sx('display:flex;align-items:center;gap:7px;margin-bottom:6px;')}>
        <span style={sx('font-size:14px;')}>💡</span>
        <span
          style={sx(
            'font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#7d2e9b;',
          )}
        >
          Astuce · {tip.title}
        </span>
      </div>
      <div style={sx('font-size:13px;line-height:1.55;color:rgba(0,0,0,0.66);min-height:54px;')}>{tip.body}</div>
      <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-top:8px;')}>
        <div style={sx('display:flex;gap:4px;')}>
          {TIPS.map((_, idx) => (
            <span
              key={idx}
              style={sx(
                `width:5px;height:5px;border-radius:50%;background:${idx === i ? '#9141ac' : 'rgba(145,65,172,0.25)'};`,
              )}
            />
          ))}
        </div>
        <div style={sx('display:flex;gap:6px;')}>
          <button
            onClick={() => go(-1)}
            style={sx(
              'width:24px;height:24px;border-radius:7px;border:1px solid #e8d6f3;background:#fff;color:#7d2e9b;cursor:pointer;font-size:13px;line-height:1;',
            )}
          >
            ‹
          </button>
          <button
            onClick={() => go(1)}
            style={sx(
              'width:24px;height:24px;border-radius:7px;border:1px solid #e8d6f3;background:#fff;color:#7d2e9b;cursor:pointer;font-size:13px;line-height:1;',
            )}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
