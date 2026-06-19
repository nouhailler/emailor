// Tokens de design (couleurs) — extraits de la maquette de référence et du README.
export const C = {
  surface: '#fafafb',
  leftCol: '#ededef',
  card: '#ffffff',
  border: 'rgba(0,0,0,0.09)',
  text: 'rgba(0,0,0,0.85)',
  text2: 'rgba(0,0,0,0.5)',
  label: 'rgba(0,0,0,0.42)',

  blue: '#3584e4',
  blueDark: '#1c64c4',
  blueBg: '#eaf2fd',

  green: '#2ec27e',
  greenText: '#1a8f57',
  greenBg: '#eafaf1',

  purple: '#9141ac',
  purpleText: '#7d2e9b',
  purpleBg: '#f7eefb',
  purpleBorder: '#e8d6f3',

  amber: '#e5a50a',
  amberText: '#9a6700',
  amberBg: '#fdf6e3',

  red: '#e01b24',
  redText: '#c01c28',
  redBg: '#fdecec',
} as const;

/** Style d'un label de section (uppercase). */
export const sectionLabel =
  'font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:rgba(0,0,0,0.42);';
