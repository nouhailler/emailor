import { useCallback, useMemo, useState } from 'react';
import { sx } from './lib/style';
import { modelNameFromId } from './services/openRouter';
import { simulatedSearchService } from './services/searchService';
import { createOpenRouterSearchService } from './services/openRouterSearch';
import { maybePersonalSearch } from './services/personalEmailSearch';
import { computeScore, type ScoreContext } from './services/scoring';
import type { SmtpResult } from './services/desktopApi';
import { useEmailSearch } from './hooks/useEmailSearch';
import { useSettings } from './hooks/useSettings';
import { useDesktopCapabilities } from './hooks/useDesktopCapabilities';
import { SearchForm } from './components/SearchForm';
import { PingAddress } from './components/PingAddress';
import { ReasoningPanel } from './components/ReasoningPanel';
import { IdentityResolution } from './components/IdentityResolution';
import { TechnicalVerification } from './components/TechnicalVerification';
import { ResultsList } from './components/ResultsList';
import { ScorePanel } from './components/ScorePanel';
import { SettingsDialog } from './components/SettingsDialog';
import { usePublicOnly } from './components/ComplianceNotice';
import type { SearchInput } from './types';

export function App() {
  const [form, setForm] = useState<SearchInput>({
    prenom: 'Roger',
    nom: 'Dupont',
    societe: 'Nestlé',
    domaine: '',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showConfigNotice, setShowConfigNotice] = useState(false);
  const [smtpResult, setSmtpResult] = useState<SmtpResult | null>(null);

  const search = useEmailSearch();
  const settings = useSettings();
  const [publicOnly, setPublicOnly] = usePublicOnly();
  const caps = useDesktopCapabilities();

  const patchForm = useCallback((patch: Partial<SearchInput>) => setForm((f) => ({ ...f, ...patch })), []);

  const openSettings = () => setSettingsOpen(true);
  const closeSettings = () => setSettingsOpen(false);
  const saveSettings = () => setSettingsOpen(false);

  const searching = search.phase === 'searching';
  const hasResults = search.phase !== 'idle';

  const modelConnected = !!settings.selectedModel && settings.apiKey.trim().length > 0;

  // Service de recherche RÉEL (LLM OpenRouter), reconstruit si la clé/le modèle changent.
  const realService = useMemo(
    () =>
      createOpenRouterSearchService(() => ({
        apiKey: settings.apiKey,
        model: settings.selectedModel,
      })),
    [settings.apiKey, settings.selectedModel],
  );

  const launchSearch = () => {
    setSmtpResult(null);
    // Exception : fournisseur d'email personnel (gmail…) → adresses perso, sans LLM.
    const personal = maybePersonalSearch(form);
    if (personal) {
      setShowConfigNotice(false);
      search.run(form, personal);
      return;
    }
    // Sinon, recherche réelle via OpenRouter si configuré.
    if (modelConnected) {
      setShowConfigNotice(false);
      search.run(form, realService);
    } else {
      setShowConfigNotice(true);
    }
  };

  // Démo explicite à données FICTIVES (le cas vedette « Dupont »).
  const launchDemo = () => {
    setSmtpResult(null);
    setShowConfigNotice(false);
    search.run(form, simulatedSearchService);
  };

  const resetSearch = () => {
    setSmtpResult(null);
    setShowConfigNotice(false);
    search.reset();
  };

  // Score de confiance CALCULÉ pour l'adresse retenue (recalculé si la vérif SMTP change).
  const score = useMemo(() => {
    if (!search.best) return null;
    const domain = search.best.email.split('@')[1] ?? '';
    const domainGuess = search.domains.find((d) => d.domain === domain);
    const context: ScoreContext = {
      domainVerified: domainGuess?.mx === true,
      domainDetail: domainGuess?.mx === true ? `${domain} · MX présent` : domain || 'domaine inconnu',
      formatPrimary: search.format?.primary ?? '—',
      formatConfidence: search.format?.confidence ?? 0,
      identityConfidence: search.identity?.confidence ?? null,
      publiclyObserved: search.best.web === 'ok',
      smtpStatus: smtpResult?.status,
    };
    return computeScore(context);
  }, [search.best, search.domains, search.format, search.identity, smtpResult]);

  const modelChipLabel = settings.selectedModel
    ? modelNameFromId(settings.selectedModel, settings.models)
    : 'Configurer le modèle';

  return (
    <div
      style={sx(
        "height:100vh;width:100%;background:#fafafb;display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:'Cantarell',sans-serif;",
      )}
    >
          {/* Barre de titre */}
          <div
            style={sx(
              'height:50px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 10px;background:#fafafb;border-bottom:1px solid rgba(0,0,0,0.09);',
            )}
          >
            <div style={sx('display:flex;align-items:center;gap:2px;width:160px;')}>
              <button
                onClick={openSettings}
                style={sx(
                  'width:32px;height:32px;border-radius:7px;border:none;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;',
                )}
              >
                <span
                  style={sx(
                    'display:block;width:15px;height:2px;background:rgba(0,0,0,0.62);box-shadow:0 5px 0 rgba(0,0,0,0.62), 0 -5px 0 rgba(0,0,0,0.62);',
                  )}
                />
              </button>
            </div>
            <div style={sx('text-align:center;flex:1;')}>
              <div style={sx('font-size:14px;font-weight:700;color:rgba(0,0,0,0.85);line-height:1.1;')}>
                Recherche d'email
              </div>
              <button
                onClick={openSettings}
                style={sx(
                  'display:inline-flex;align-items:center;gap:6px;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;color:rgba(0,0,0,0.5);padding:2px 8px;border-radius:7px;margin-top:1px;',
                )}
              >
                <span
                  style={sx(
                    `width:7px;height:7px;border-radius:50%;flex:none;background:${
                      modelConnected ? '#2ec27e' : 'rgba(0,0,0,0.3)'
                    };`,
                  )}
                />
                {modelChipLabel}
              </button>
            </div>
            {/* Espaceur pour conserver le titre centré */}
            <div style={sx('width:160px;flex:none;')} />
          </div>

          {/* Corps deux colonnes */}
          <div style={sx('flex:1;display:flex;min-height:0;')}>
            {/* Gauche : formulaire + raisonnement */}
            <div
              style={sx(
                'width:386px;flex:none;background:#ededef;border-right:1px solid rgba(0,0,0,0.08);display:flex;flex-direction:column;overflow:auto;',
              )}
            >
              <div style={sx('padding:22px 20px;display:flex;flex-direction:column;')}>
                <SearchForm
                  value={form}
                  searching={searching}
                  onChange={patchForm}
                  onSubmit={launchSearch}
                />
                <PingAddress suggestedEmail={search.best?.email ?? ''} />
                <ReasoningPanel searching={searching} reasoning={search.reasoning} />
              </div>
            </div>

            {/* Droite : résultats */}
            <div style={sx('flex:1;background:#fafafb;display:flex;flex-direction:column;min-width:0;overflow:auto;')}>
              <div style={sx('padding:22px 28px;display:flex;flex-direction:column;min-height:100%;')}>
                <div style={sx('display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;')}>
                  <div style={sx('font-size:17px;font-weight:700;color:rgba(0,0,0,0.85);')}>Résultats</div>
                  {hasResults && (
                    <button
                      onClick={resetSearch}
                      style={sx(
                        'border:1px solid rgba(0,0,0,0.14);background:#fff;border-radius:8px;padding:6px 13px;font-family:inherit;font-size:13px;font-weight:700;color:rgba(0,0,0,0.7);cursor:pointer;',
                      )}
                    >
                      Nouvelle recherche
                    </button>
                  )}
                </div>

                {!hasResults && showConfigNotice ? (
                  <div
                    style={sx(
                      'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;padding:40px;',
                    )}
                  >
                    <div
                      style={sx(
                        'max-width:420px;background:#eaf2fd;border:1px solid #cfe0f7;border-radius:12px;padding:18px 20px;',
                      )}
                    >
                      <div style={sx('font-size:15px;font-weight:700;color:#1c64c4;margin-bottom:6px;')}>
                        Recherche réelle non configurée
                      </div>
                      <div style={sx('font-size:13px;line-height:1.6;color:rgba(0,0,0,0.6);')}>
                        Pour une recherche réelle (modèle OpenRouter + DNS), renseignez votre clé API et
                        sélectionnez un modèle gratuit dans les Paramètres. Aucune donnée n'est inventée :
                        les résultats reflètent l'analyse réelle du modèle.
                      </div>
                      <div style={sx('display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap;')}>
                        <button
                          onClick={openSettings}
                          style={sx(
                            'border:none;background:#3584e4;color:#fff;border-radius:9px;padding:9px 16px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;',
                          )}
                        >
                          Ouvrir les paramètres
                        </button>
                        <button
                          onClick={launchDemo}
                          style={sx(
                            'border:1px solid rgba(0,0,0,0.14);background:#fff;border-radius:9px;padding:9px 16px;font-family:inherit;font-size:13px;font-weight:700;color:rgba(0,0,0,0.7);cursor:pointer;',
                          )}
                        >
                          Lancer une démo (données fictives)
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !hasResults ? (
                  <div
                    style={sx(
                      'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;color:rgba(0,0,0,0.4);padding:40px;',
                    )}
                  >
                    <svg
                      width="68"
                      height="68"
                      viewBox="0 0 64 64"
                      fill="none"
                      stroke="rgba(0,0,0,0.2)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    >
                      <rect x="8" y="16" width="48" height="34" rx="4" />
                      <path d="M10 20 L32 38 L54 20" />
                    </svg>
                    <div style={sx('font-size:15px;line-height:1.5;max-width:340px;')}>
                      Renseignez le prénom, le nom et la société,
                      <br />
                      puis lancez la recherche assistée par l'IA.
                    </div>
                  </div>
                ) : (
                  <div>
                    <ResultsList
                      best={search.best}
                      showBest={!!search.best && search.phase === 'done'}
                      copied={search.copied}
                      onCopy={search.copyBest}
                      domains={search.domains}
                      format={search.format}
                      sources={search.sources}
                      candidates={search.candidates}
                      nativeSmtp={caps.smtp}
                      publicOnly={publicOnly}
                      computedScore={search.phase === 'done' ? (score?.total ?? null) : null}
                      onSmtpResult={setSmtpResult}
                      identitySlot={
                        search.identity && (
                          <IdentityResolution identity={search.identity} signals={search.idSignals} />
                        )
                      }
                      techSlot={
                        search.techTests.length > 0 && (
                          <TechnicalVerification tests={search.techTests} />
                        )
                      }
                      scoreSlot={
                        search.phase === 'done' && score && (
                          <ScorePanel signals={score.signals} total={score.total} />
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {settingsOpen && (
            <SettingsDialog
              settings={settings}
              publicOnly={publicOnly}
              onPublicOnlyChange={setPublicOnly}
              onClose={closeSettings}
              onSave={saveSettings}
            />
          )}
    </div>
  );
}
