import type { DeserializeResult, Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_CANVAS,
  MAX_DENSITY,
  MAX_FONT_SIZE,
  MAX_ROTATION,
  MIN_CANVAS,
  MIN_DENSITY,
  MIN_FONT_SIZE,
  MIN_ROTATION,
  PALETTES,
  buildLayers,
  clampNumber,
  clampRotation,
  isValidColor,
  paletteBackground,
  paletteColors,
  pickReadableColor,
  randomSeed,
  summaryText,
  type PaletteId,
  type RotationMode,
  type TextLayer,
  type ToolState,
} from './types';

const VALID_PALETTES: PaletteId[] = ['candy', 'neon', 'pastel', 'mono', 'sunset', 'custom'];
const VALID_ROTATION_MODES: RotationMode[] = ['random', 'range'];

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function validLayers(value: unknown): TextLayer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null
    )
    .map((entry, i) => ({
      id: stringOr(entry.id, `layer-import-${i}`),
      text: stringOr(entry.text, DEFAULT_STATE.phrase),
      fontSize: clampNumber(numberOr(entry.fontSize, 48), MIN_FONT_SIZE, MAX_FONT_SIZE, 48),
      rotation: clampRotation(numberOr(entry.rotation, 0)),
      color: stringOr(entry.color, '#ffffff'),
      x: clampNumber(numberOr(entry.x, 0.5), 0, 1, 0.5),
      y: clampNumber(numberOr(entry.y, 0.5), 0, 1, 0.5),
    }));
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    phrase: state.phrase,
    density: state.density,
    rotationMode: state.rotationMode,
    rotationMin: state.rotationMin,
    rotationMax: state.rotationMax,
    fontSizeMin: state.fontSizeMin,
    fontSizeMax: state.fontSizeMax,
    palette: state.palette,
    customBackground: state.customBackground,
    customColors: state.customColors,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    seed: state.seed,
    layers: state.layers,
  });
}

/** Rebuild layers for a repaired state. */
function withLayers(state: ToolState): ToolState {
  return { ...state, layers: buildLayers(state) };
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected text collage state object',
    };
  }
  const v = data as Record<string, unknown>;
  const palette: PaletteId = VALID_PALETTES.includes(v.palette as PaletteId)
    ? (v.palette as PaletteId)
    : DEFAULT_STATE.palette;
  const rotationMode: RotationMode = VALID_ROTATION_MODES.includes(v.rotationMode as RotationMode)
    ? (v.rotationMode as RotationMode)
    : DEFAULT_STATE.rotationMode;
  const customColors = Array.isArray(v.customColors)
    ? v.customColors.filter((c): c is string => typeof c === 'string' && isValidColor(c))
    : [...DEFAULT_STATE.customColors];
  const state: ToolState = {
    phrase: stringOr(v.phrase, DEFAULT_STATE.phrase) || DEFAULT_STATE.phrase,
    density: clampNumber(
      numberOr(v.density, DEFAULT_STATE.density),
      MIN_DENSITY,
      MAX_DENSITY,
      DEFAULT_STATE.density
    ),
    rotationMode,
    rotationMin: clampRotation(numberOr(v.rotationMin, DEFAULT_STATE.rotationMin)),
    rotationMax: clampRotation(numberOr(v.rotationMax, DEFAULT_STATE.rotationMax)),
    fontSizeMin: clampNumber(
      numberOr(v.fontSizeMin, DEFAULT_STATE.fontSizeMin),
      MIN_FONT_SIZE,
      MAX_FONT_SIZE,
      DEFAULT_STATE.fontSizeMin
    ),
    fontSizeMax: clampNumber(
      numberOr(v.fontSizeMax, DEFAULT_STATE.fontSizeMax),
      MIN_FONT_SIZE,
      MAX_FONT_SIZE,
      DEFAULT_STATE.fontSizeMax
    ),
    palette,
    customBackground: stringOr(v.customBackground, DEFAULT_STATE.customBackground),
    customColors,
    canvasWidth: Math.round(
      clampNumber(
        numberOr(v.canvasWidth, DEFAULT_STATE.canvasWidth),
        MIN_CANVAS,
        MAX_CANVAS,
        DEFAULT_STATE.canvasWidth
      )
    ),
    canvasHeight: Math.round(
      clampNumber(
        numberOr(v.canvasHeight, DEFAULT_STATE.canvasHeight),
        MIN_CANVAS,
        MAX_CANVAS,
        DEFAULT_STATE.canvasHeight
      )
    ),
    seed: numberOr(v.seed, DEFAULT_STATE.seed) >>> 0,
    layers: [],
  };
  const restored = withLayers(state);
  if (Array.isArray(v.layers) && v.layers.length === restored.layers.length) {
    restored.layers = validLayers(v.layers);
  }
  return { success: true, data: restored };
}

/** Re-roll with a fresh random seed, keeping all settings. */
export function shuffleState(state: ToolState): ToolState {
  const seed = randomSeed();
  const next = { ...state, seed };
  return { ...next, layers: buildLayers(next) };
}

/** Rebuild layers from the existing seed (used after settings change). */
export function regenerateLayers(state: ToolState): ToolState {
  return withLayers(state);
}

/** Round-trip check for serialization. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const textCollageTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE, layers: buildLayers(DEFAULT_STATE) },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export {
  DEFAULT_STATE,
  MAX_CANVAS,
  MAX_DENSITY,
  MAX_FONT_SIZE,
  MAX_ROTATION,
  MIN_CANVAS,
  MIN_DENSITY,
  MIN_FONT_SIZE,
  MIN_ROTATION,
  PALETTES,
  buildLayers,
  clampNumber,
  clampRotation,
  isValidColor,
  paletteBackground,
  paletteColors,
  pickReadableColor,
  summaryText,
};
export type { PaletteId, RotationMode, TextLayer, ToolState };
