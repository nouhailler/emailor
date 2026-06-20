import { useLayoutEffect, useState } from 'react';
import { sx } from '../lib/style';
import { TOUR_STEPS } from '../data/help';

interface Props {
  /** Termine/passe la visite (mémorisée comme vue). */
  onClose: () => void;
  /** Action « Lancer la démo » de la dernière étape. */
  onDemo: () => void;
}

const CARD_W = 344;

/**
 * Visite guidée (onboarding) : carte explicative + projecteur (spotlight) sur
 * l'élément ciblé de chaque étape. Le fond est assombri ; l'élément en surbrillance
 * reste lisible. Robuste : si la cible est absente, la carte se centre.
 */
export function Onboarding({ onClose, onDemo }: Props) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[i];
  const isLast = i === TOUR_STEPS.length - 1;

  useLayoutEffect(() => {
    if (!step.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const t = setTimeout(measure, 80); // après le scroll fluide
    const iv = setInterval(measure, 300);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
      window.removeEventListener('resize', measure);
    };
  }, [i, step.selector]);

  const next = () => (isLast ? onClose() : setI((v) => v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));

  // Position de la carte : sous la cible si la place le permet, sinon au-dessus ;
  // centrée s'il n'y a pas de cible.
  const PAD = 8;
  let cardCss: string;
  if (rect) {
    const placeBelow = rect.bottom + 210 < window.innerHeight;
    const top = placeBelow ? rect.bottom + PAD + 12 : Math.max(14, rect.top - PAD - 12 - 200);
    const left = Math.max(14, Math.min(rect.left, window.innerWidth - CARD_W - 16));
    cardCss = `position:fixed;top:${top}px;left:${left}px;width:${CARD_W}px;`;
  } else {
    cardCss = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:${CARD_W}px;`;
  }

  return (
    <>
      {/* Capteur de clic plein écran. Sans cible : assombri. Avec cible : transparent
          (l'assombrissement vient du box-shadow du projecteur). */}
      <div
        onClick={onClose}
        style={sx(
          `position:fixed;inset:0;z-index:60;${rect ? '' : 'background:rgba(0,0,0,0.55);'}animation:fadeUp .2s ease;`,
        )}
      />

      {/* Projecteur sur la cible */}
      {rect && (
        <div
          style={sx(
            `position:fixed;z-index:61;pointer-events:none;border-radius:12px;top:${rect.top - PAD}px;left:${
              rect.left - PAD
            }px;width:${rect.width + PAD * 2}px;height:${
              rect.height + PAD * 2
            }px;box-shadow:0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 2px #3584e4;transition:all .2s ease;`,
          )}
        />
      )}

      {/* Carte */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...sx(
            `${cardCss}z-index:62;background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.45);padding:18px 19px 15px;animation:fadeUp .2s ease;font-family:'Cantarell',sans-serif;`,
          ),
        }}
      >
        <div style={sx('font-size:16px;font-weight:700;color:rgba(0,0,0,0.85);margin-bottom:7px;')}>
          {step.title}
        </div>
        <div style={sx('font-size:13px;line-height:1.6;color:rgba(0,0,0,0.62);')}>{step.body}</div>

        {isLast && (
          <button
            onClick={() => {
              onDemo();
              onClose();
            }}
            style={sx(
              'width:100%;margin-top:14px;border:none;background:#9141ac;color:#fff;border-radius:9px;padding:10px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;',
            )}
          >
            ▶ Lancer la démo (données fictives)
          </button>
        )}

        {/* Pied : progression + navigation */}
        <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-top:15px;')}>
          <div style={sx('display:flex;align-items:center;gap:5px;')}>
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={idx}
                style={sx(
                  `width:${idx === i ? 18 : 6}px;height:6px;border-radius:3px;transition:all .2s;background:${
                    idx === i ? '#3584e4' : 'rgba(0,0,0,0.15)'
                  };`,
                )}
              />
            ))}
          </div>
          <div style={sx('display:flex;align-items:center;gap:8px;')}>
            {i > 0 && (
              <button
                onClick={prev}
                style={sx(
                  'border:1px solid rgba(0,0,0,0.14);background:#fff;border-radius:8px;padding:7px 12px;font-family:inherit;font-size:13px;font-weight:700;color:rgba(0,0,0,0.65);cursor:pointer;',
                )}
              >
                Précédent
              </button>
            )}
            <button
              onClick={next}
              style={sx(
                'border:none;background:#3584e4;color:#fff;border-radius:8px;padding:7px 15px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;',
              )}
            >
              {isLast ? 'Terminer' : 'Suivant'}
            </button>
          </div>
        </div>

        {!isLast && (
          <button
            onClick={onClose}
            style={sx(
              'position:absolute;top:14px;right:14px;border:none;background:transparent;color:rgba(0,0,0,0.4);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:2px 4px;',
            )}
          >
            Passer
          </button>
        )}
      </div>
    </>
  );
}
