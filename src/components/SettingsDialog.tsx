import { formatCtx } from '../services/openRouter';
import { sx } from '../lib/style';
import type { Settings } from '../hooks/useSettings';
import { ComplianceNotice } from './ComplianceNotice';
import { NameNormalizationRules } from './NameNormalizationRules';

interface Props {
  settings: Settings;
  publicOnly: boolean;
  onPublicOnlyChange: (v: boolean) => void;
  onClose: () => void;
  onSave: () => void;
}

export function SettingsDialog({ settings, publicOnly, onPublicOnlyChange, onClose, onSave }: Props) {
  const {
    apiKey,
    showKey,
    selectedModel,
    models,
    loadingModels,
    modelError,
    setApiKey,
    toggleShowKey,
    selectModel,
    refreshModels,
  } = settings;
  const hasKey = apiKey.trim().length > 0;

  return (
    <div
      style={sx(
        'position:absolute;inset:0;background:rgba(0,0,0,0.30);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:30;animation:fadeUp .18s ease;',
      )}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={sx(
          'width:560px;max-width:calc(100% - 48px);max-height:calc(100% - 40px);background:#fafafb;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.45);display:flex;flex-direction:column;overflow:hidden;',
        )}
      >
        {/* En-tête */}
        <div
          style={sx(
            'height:50px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 10px 0 18px;border-bottom:1px solid rgba(0,0,0,0.09);background:#fafafb;',
          )}
        >
          <div style={sx('font-size:15px;font-weight:700;color:rgba(0,0,0,0.85);')}>Paramètres</div>
          <button
            onClick={onClose}
            style={sx(
              'width:26px;height:26px;border-radius:50%;border:none;background:rgba(0,0,0,0.07);display:flex;align-items:center;justify-content:center;cursor:pointer;color:rgba(0,0,0,0.6);font-size:13px;',
            )}
          >
            ✕
          </button>
        </div>

        <div style={sx('padding:20px 22px;overflow:auto;display:flex;flex-direction:column;gap:24px;')}>
          {/* Connexion OpenRouter */}
          <div>
            <div
              style={sx(
                'font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:rgba(0,0,0,0.42);margin-bottom:10px;',
              )}
            >
              Connexion OpenRouter
            </div>
            <div style={sx('background:#fff;border:1px solid rgba(0,0,0,0.09);border-radius:12px;padding:14px 15px;')}>
              <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;')}>
                <div style={sx('font-size:13px;font-weight:700;color:rgba(0,0,0,0.7);')}>Clé API</div>
                {hasKey && (
                  <span style={sx('display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#1a8f57;')}>
                    <span style={sx('width:7px;height:7px;border-radius:50%;background:#2ec27e;')} />
                    Enregistrée
                  </span>
                )}
              </div>
              <div style={sx('display:flex;gap:8px;align-items:center;')}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-…"
                  style={sx(
                    "flex:1;min-width:0;border:1px solid rgba(0,0,0,0.14);border-radius:8px;padding:9px 11px;font-family:'JetBrains Mono',monospace;font-size:13px;color:rgba(0,0,0,0.85);background:#fff;",
                  )}
                />
                <button
                  onClick={toggleShowKey}
                  style={sx(
                    'border:1px solid rgba(0,0,0,0.14);background:#fff;border-radius:8px;padding:9px 12px;font-family:inherit;font-size:13px;font-weight:700;color:rgba(0,0,0,0.65);cursor:pointer;white-space:nowrap;',
                  )}
                >
                  {showKey ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <div style={sx('margin-top:9px;font-size:12px;line-height:1.5;color:rgba(0,0,0,0.5);')}>
                Créez une clé gratuite sur{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener"
                  style={sx('color:#3584e4;text-decoration:none;font-weight:700;')}
                >
                  openrouter.ai/keys
                </a>
                . Elle est stockée localement sur cette machine.
              </div>
            </div>
          </div>

          {/* Modèle gratuit */}
          <div>
            <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;')}>
              <div
                style={sx(
                  'font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:rgba(0,0,0,0.42);',
                )}
              >
                Modèle gratuit · {models.length}
              </div>
              <button
                onClick={refreshModels}
                style={sx(
                  'display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(0,0,0,0.14);background:#fff;border-radius:8px;padding:5px 11px;font-family:inherit;font-size:12px;font-weight:700;color:rgba(0,0,0,0.65);cursor:pointer;',
                )}
              >
                ↻ Actualiser
              </button>
            </div>

            {loadingModels && (
              <div style={sx('display:flex;align-items:center;gap:10px;padding:14px;color:rgba(0,0,0,0.55);font-size:13px;')}>
                <span
                  style={sx(
                    'width:14px;height:14px;border:2px solid rgba(0,0,0,0.2);border-top-color:#3584e4;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;',
                  )}
                />
                Chargement des modèles…
              </div>
            )}

            {modelError && (
              <div
                style={sx(
                  'margin-bottom:9px;font-size:12px;line-height:1.5;color:#9a6700;background:#fdf6e3;border:1px solid #efe1a6;border-radius:8px;padding:9px 11px;',
                )}
              >
                {modelError}
              </div>
            )}

            <div style={sx('display:flex;flex-direction:column;gap:8px;')}>
              {models.map((m) => {
                const selected = m.id === selectedModel;
                return (
                  <div
                    key={m.id}
                    onClick={() => selectModel(m.id)}
                    style={sx(
                      `display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:10px;cursor:pointer;border:1px solid ${
                        selected ? '#9ec3f3' : 'rgba(0,0,0,0.09)'
                      };background:${selected ? '#eaf2fd' : '#fff'};transition:background .15s;`,
                    )}
                  >
                    <div style={sx('flex:1;min-width:0;')}>
                      <div style={sx('font-size:14px;font-weight:700;color:rgba(0,0,0,0.82);')}>{m.name}</div>
                      <div
                        style={sx(
                          "font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(0,0,0,0.45);word-break:break-all;margin-top:1px;",
                        )}
                      >
                        {m.id}
                      </div>
                    </div>
                    <span
                      style={sx(
                        'font-size:11px;font-weight:700;color:rgba(0,0,0,0.5);background:#f0f0f2;border-radius:6px;padding:3px 8px;white-space:nowrap;flex:none;',
                      )}
                    >
                      {formatCtx(m.ctx)}
                    </span>
                    {selected && (
                      <span
                        style={sx(
                          'width:22px;height:22px;border-radius:50%;background:#3584e4;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex:none;',
                        )}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conformité */}
          <ComplianceNotice publicOnly={publicOnly} onChange={onPublicOnlyChange} />

          {/* Normalisation des noms */}
          <NameNormalizationRules />
        </div>

        {/* Pied */}
        <div
          style={sx(
            'padding:12px 18px;flex:none;border-top:1px solid rgba(0,0,0,0.09);display:flex;justify-content:flex-end;gap:10px;',
          )}
        >
          <button
            onClick={onClose}
            style={sx(
              'border:1px solid rgba(0,0,0,0.14);background:#fff;border-radius:9px;padding:9px 16px;font-family:inherit;font-size:14px;font-weight:700;color:rgba(0,0,0,0.7);cursor:pointer;',
            )}
          >
            Fermer
          </button>
          <button
            onClick={onSave}
            style={sx(
              'border:none;background:#3584e4;color:#fff;border-radius:9px;padding:9px 18px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;',
            )}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
