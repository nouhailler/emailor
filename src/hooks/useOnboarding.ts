import { useEffect, useState } from 'react';

const KEY = 'oremail_onboarded';

export interface Onboarding {
  /** La visite est-elle ouverte ? */
  open: boolean;
  /** (Re)lance la visite guidée. */
  start: () => void;
  /** Termine/passe la visite et la mémorise comme vue. */
  finish: () => void;
}

/**
 * Onboarding : ouvre automatiquement la visite guidée au tout premier lancement
 * (mémorisé en localStorage), et permet de la relancer depuis le bouton « ? ».
 */
export function useOnboarding(): Onboarding {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== '1') setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const start = () => setOpen(true);

  return { open, start, finish };
}
