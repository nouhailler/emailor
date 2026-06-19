import type { CSSProperties } from 'react';

/**
 * Convertit une chaîne CSS inline (« prop:val;prop:val ») en objet de style React.
 *
 * La maquette de référence (`Recherche email.dc.html`) exprime tout son style sous
 * forme de chaînes CSS. Pour reproduire l'UI au pixel près sans réécrire chaque
 * déclaration, on conserve ces chaînes verbatim et on les convertit ici.
 */
export function sx(css: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const rule of css.split(';')) {
    const idx = rule.indexOf(':');
    if (idx === -1) continue;
    const prop = rule.slice(0, idx).trim();
    if (!prop) continue;
    const value = rule.slice(idx + 1).trim();
    // kebab-case → camelCase (gère aussi les préfixes vendeurs -webkit-*)
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = value;
  }
  return out as CSSProperties;
}
