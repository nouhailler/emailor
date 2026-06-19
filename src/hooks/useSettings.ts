import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFreeModels, ModelFetchError } from '../services/openRouter';
import type { FreeModel } from '../types';

const KEY_STORAGE = 'oremail_apikey';
const MODEL_STORAGE = 'oremail_model';

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* localStorage indisponible */
  }
}

export interface Settings {
  apiKey: string;
  showKey: boolean;
  selectedModel: string;
  models: FreeModel[];
  loadingModels: boolean;
  modelError: string;
  setApiKey(value: string): void;
  toggleShowKey(): void;
  selectModel(id: string): void;
  refreshModels(): void;
}

/** Réglages OpenRouter (clé API + modèle) persistés en localStorage. */
export function useSettings(): Settings {
  const [apiKey, setApiKeyState] = useState<string>(() => read(KEY_STORAGE));
  const [selectedModel, setSelectedModel] = useState<string>(() => read(MODEL_STORAGE));
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<FreeModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const loadedOnce = useRef(false);

  const refreshModels = useCallback(async () => {
    setLoadingModels(true);
    setModelError('');
    try {
      const free = await fetchFreeModels();
      setModels(free);
    } catch (e) {
      if (e instanceof ModelFetchError) {
        setModels(e.fallback);
        setModelError(e.message);
      } else {
        setModelError('Erreur inattendue lors du chargement des modèles.');
      }
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    void refreshModels();
  }, [refreshModels]);

  const setApiKey = useCallback((value: string) => {
    setApiKeyState(value);
    write(KEY_STORAGE, value);
  }, []);

  const toggleShowKey = useCallback(() => setShowKey((v) => !v), []);

  const selectModel = useCallback((id: string) => {
    setSelectedModel(id);
    write(MODEL_STORAGE, id);
  }, []);

  return {
    apiKey,
    showKey,
    selectedModel,
    models,
    loadingModels,
    modelError,
    setApiKey,
    toggleShowKey,
    selectModel,
    refreshModels: () => void refreshModels(),
  };
}
