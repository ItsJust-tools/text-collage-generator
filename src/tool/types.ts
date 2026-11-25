/** Curated palette id. */
export type PaletteId = 'candy' | 'neon' | 'pastel' | 'mono' | 'sunset' | 'custom';

/** A named set of background/text colors. */
export interface Palette {
  id: PaletteId;
  label: string;
  background: string;
  colors: string[];
}

export const PALETTES: Palette[] = [
  {
    id: 'candy',
    label: 'Candy',
    background: '#1b1030',
    colors: ['#ff6ec7', '#ffd93d', '#6ef2c4', '#9d7bff', '#ff9d76'],
  },
  {
    id: 'neon',
    label: 'Neon',
    background: '#0a0a14',
    colors: ['#00e5ff', '#ff2d95', '#39ff14', '#ffe600', '#b537f2'],
  },
  {
    id: 'pastel',
    label: 'Pastel',
    background: '#fff6ef',
    colors: ['#f8a1c4', '#a1d8f8', '#c2f5a9', '#f8dd9b', '#c9a8f0'],
  },
  {
    id: 'mono',
    label: 'Mono',
    background: '#111111',
    colors: ['#f5f5f5', '#cfcfcf', '#a8a8a8', '#7d7d7d', '#565656'],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    background: '#2b0f2e',
    colors: ['#ff7043', '#ffb347', '#ff5e78', '#ffd27d', '#c94f7c'],
  },
  { id: 'custom', label: 'Custom', background: '#101018', colors: [] },
];

/** Rotation mode: each layer either gets a fully random angle or one restricted to a range. */
export type RotationMode = 'random' | 'range';

export interface TextLayer {
  /** Unique layer id. */
  id: string;
  /** Text shown by this layer (defaults to the source phrase). */
  text: string;
  /** Font size in px. */
  fontSize: number;
  /** Rotation in degrees (−180..180). */
  rotation: number;
  /** CSS color for the text. */
  color: string;
  /** Normalized canvas position (0..1 of width/height). */
  x: number;
  y: number;
}

export interface ToolState {
  /** The word or phrase repeated across the collage. */
  phrase: string;
  /** Number of text layers on the canvas. */
  density: number;
  /** Rotation strategy for layers. */
  rotationMode: RotationMode;
  /** Minimum rotation for range mode (degrees). */
  rotationMin: number;
  /** Maximum rotation for range mode (degrees). */
  rotationMax: number;
  /** Minimum font size in px. */
  fontSizeMin: number;
  /** Maximum font size in px. */
  fontSizeMax: number;
  /** Selected palette id. */
  palette: PaletteId;
  /** Custom background color used for the custom palette. */
  customBackground: string;
  /** Custom text colors used (cycled) for the custom palette. */
  customColors: string[];
  /** Canvas width in px (export resolution). */
  canvasWidth: number;
  /** Canvas height in px (export resolution). */
  canvasHeight: number;
  /** Deterministic seed shown so layouts can be reproduced. */
  seed: number;
  /** Current layers, derived from the seed + settings. */
  layers: TextLayer[];
}

export const DEFAULT_STATE: ToolState = {
  phrase: 'hello',
  density: 24,
  rotationMode: 'random',
  rotationMin: -45,
  rotationMax: 45,
  fontSizeMin: 24,
  fontSizeMax: 96,
  palette: 'candy',
  customBackground: '#101018',
  customColors: ['#ff6ec7', '#ffd93d', '#6ef2c4'],
  canvasWidth: 1080,
  canvasHeight: 1080,
  seed: 123456789,
  layers: [],
};

export const MIN_DENSITY = 1;
export const MAX_DENSITY = 80;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 300;
export const MIN_ROTATION = -180;
export const MAX_ROTATION = 180;
export const MIN_CANVAS = 200;
export const MAX_CANVAS = 4000;

/** Clamp a number into [min, max]; NaN falls back to fallback. */
export function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Clamp rotation degrees to [-180, 180]. */
export function clampRotation(value: number): number {
  return clampNumber(value, MIN_ROTATION, MAX_ROTATION, 0);
}

/** Resolve active text colors for the current palette, falling back to a default. */
export function paletteColors(state: ToolState): string[] {
  if (state.palette === 'custom') {
    const colors = state.customColors.filter(
      (c) => typeof c === 'string' && c.length > 0 && isValidColor(c)
    );
    if (colors.length > 0) return colors;
    return ['#ffffff'];
  }
  const palette = PALETTES.find((p) => p.id === state.palette) ?? PALETTES[0];
  return palette?.colors ?? ['#ffffff'];
}

/** Resolve the active background color. */
export function paletteBackground(state: ToolState): string {
  if (state.palette === 'custom')
    return isValidColor(state.customBackground)
      ? state.customBackground
      : DEFAULT_STATE.customBackground;
  return PALETTES.find((p) => p.id === state.palette)?.background ?? '#101018';
}

/** Basic validity check for hex / rgb() / named CSS colors used by the tool. */
export function isValidColor(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return true;
  if (/^rgb(a)?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)$/i.test(trimmed))
    return true;
  return /^[a-z]+$/i.test(trimmed);
}

/** Mulberry32 PRNG — deterministic layout generation from a seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a fresh random 32-bit seed. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

/**
 * Build the layer layout for a given state + seed.
 * The same seed and settings always produce identical layers.
 */
export function buildLayers(state: ToolState): TextLayer[] {
  const rand = mulberry32(state.seed);
  const colors = paletteColors(state);
  const bg = paletteBackground(state);
  const sizeMin = clampNumber(
    state.fontSizeMin,
    MIN_FONT_SIZE,
    MAX_FONT_SIZE,
    DEFAULT_STATE.fontSizeMin
  );
  const sizeMax = Math.max(
    sizeMin,
    clampNumber(state.fontSizeMax, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_STATE.fontSizeMax)
  );
  const normalizedPhrase = state.phrase.trim().length > 0 ? state.phrase.trim() : 'hello';
  const count = clampNumber(state.density, MIN_DENSITY, MAX_DENSITY, DEFAULT_STATE.density);
  const rotationMin =
    state.rotationMode === 'range' ? clampRotation(state.rotationMin) : MIN_ROTATION;
  const rotationMax =
    state.rotationMode === 'range' ? clampRotation(state.rotationMax) : MAX_ROTATION;
  const lo = Math.min(rotationMin, rotationMax);
  const hi = Math.max(rotationMin, rotationMax);

  const layers: TextLayer[] = [];
  for (let i = 0; i < count; i++) {
    const rotation = lo + rand() * (hi - lo);
    const fontSize = sizeMin + rand() * (sizeMax - sizeMin);
    const color = colors[i % colors.length] ?? '#ffffff';
    const backgroundReadable = pickReadableColor(bg);
    layers.push({
      id: `layer-${state.seed}-${i}`,
      text: normalizedPhrase,
      fontSize: Math.round(fontSize * 10) / 10,
      rotation: Math.round(rotation * 10) / 10,
      color:
        color === backgroundReadable
          ? colors.length > 1
            ? (colors[i + 1] ?? colors[0] ?? color)
            : color
          : color,
      x: rand(),
      y: rand(),
    });
  }
  return layers;
}

/** Pick a color that contrasts with the given background. */
export function pickReadableColor(background: string): string {
  try {
    if (background.startsWith('#')) {
      let hex = background.slice(1);
      if (hex.length === 3)
        hex = Array.from(hex)
          .map((c) => c + c)
          .join('');
      const r = Number.parseInt(hex.slice(0, 2) ?? '0', 16);
      const g = Number.parseInt(hex.slice(2, 4) ?? '0', 16);
      const b = Number.parseInt(hex.slice(4, 6) ?? '0', 16);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      return luminance > 140 ? '#111111' : '#ffffff';
    }
  } catch {
    // ignore parse failures
  }
  return '#ffffff';
}

/** Human readable summary line, e.g. '10 layers — "love"'. */
export function summaryText(state: ToolState): string {
  const count = clampNumber(state.density, MIN_DENSITY, MAX_DENSITY, DEFAULT_STATE.density);
  const phrase = state.phrase.trim() || 'hello';
  return `${count} layer${count === 1 ? '' : 's'} — "${phrase}"`;
}
