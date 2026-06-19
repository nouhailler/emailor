/**
 * Règles de normalisation des noms — portées depuis la maquette de référence.
 * Servent à générer des slugs d'email à partir de prénoms/noms accentués.
 */

/** NFD + suppression des diacritiques + minuscules + espaces compactés. */
export function norm(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Slug strictement alphanumérique (pour la partie locale d'un email). */
export function slug(s: string): string {
  return norm(s).replace(/[^a-z0-9]/g, '');
}

/** Capitalise la première lettre. */
export function cap(s: string): string {
  s = (s || '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
