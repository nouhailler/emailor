import { useEffect, useState } from 'react';
import { getCapabilities, type Capabilities } from '../services/desktopApi';

/** Capacités du shell natif (SMTP réel) ; { desktop:false, smtp:false } en web. */
export function useDesktopCapabilities(): Capabilities {
  const [caps, setCaps] = useState<Capabilities>({ desktop: false, smtp: false });
  useEffect(() => {
    let alive = true;
    getCapabilities().then((c) => {
      if (alive) setCaps(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return caps;
}
