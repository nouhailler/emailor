import { useCallback, useState } from 'react';

// Clés des API tierces (Hunter / Abstract / ZeroBounce), persistées en localStorage.
// Elles ne servent que côté backend natif (proxy 127.0.0.1) : jamais exposées au web.

export type ProviderName = 'hunter' | 'abstract' | 'zerobounce';

const STORAGE: Record<ProviderName, string> = {
  hunter: 'oremail_hunter_key',
  abstract: 'oremail_abstract_key',
  zerobounce: 'oremail_zerobounce_key',
};

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export interface ProviderKeys {
  hunter: string;
  abstract: string;
  zerobounce: string;
}

export interface Providers {
  keys: ProviderKeys;
  setKey(name: ProviderName, value: string): void;
  has(name: ProviderName): boolean;
}

/** Réglages des fournisseurs de données tiers (clés API). */
export function useProviders(): Providers {
  const [keys, setKeys] = useState<ProviderKeys>(() => ({
    hunter: read(STORAGE.hunter),
    abstract: read(STORAGE.abstract),
    zerobounce: read(STORAGE.zerobounce),
  }));

  const setKey = useCallback((name: ProviderName, value: string) => {
    setKeys((k) => ({ ...k, [name]: value }));
    try {
      localStorage.setItem(STORAGE[name], value);
    } catch {
      /* localStorage indisponible */
    }
  }, []);

  const has = useCallback((name: ProviderName) => keys[name].trim().length > 0, [keys]);

  return { keys, setKey, has };
}
