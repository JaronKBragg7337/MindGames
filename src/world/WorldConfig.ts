export interface WorldConfig {
  index: number;
  name: string;
  code: string;
  rules: string;
  accent: number;
  accentCss: string;
  secondary: number;
  fog: number;
  sky: number;
  timeRate: number;
  transferScale: number;
}

export const WORLD_CONFIGS: readonly WorldConfig[] = [
  {
    index: 0,
    name: 'ORIGIN LAB',
    code: 'W–00 / APPARENT ROOT',
    rules: '1.0× TIME · DOWN GRAVITY',
    accent: 0x53e8ff,
    accentCss: '#53e8ff',
    secondary: 0xffa94a,
    fog: 0x071016,
    sky: 0x03090d,
    timeRate: 1,
    transferScale: 1,
  },
  {
    index: 1,
    name: 'CHROMA FOUNDRY',
    code: 'W–01 / CONTAINED',
    rules: '12× TIME · 0.72× SCALE',
    accent: 0xff4fd8,
    accentCss: '#ff4fd8',
    secondary: 0x42ffc6,
    fog: 0x130719,
    sky: 0x0b030f,
    timeRate: 12,
    transferScale: 0.72,
  },
  {
    index: 2,
    name: 'PARADOX ENGINE',
    code: 'W–02 / CONTAINS ROOT',
    rules: '60× TIME · FOLDING FRAME',
    accent: 0xb8ff42,
    accentCss: '#b8ff42',
    secondary: 0xff7b42,
    fog: 0x0b1306,
    sky: 0x050903,
    timeRate: 60,
    transferScale: 1.48,
  },
] as const;

