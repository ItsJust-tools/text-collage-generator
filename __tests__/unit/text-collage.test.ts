import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  MAX_DENSITY,
  MIN_DENSITY,
  buildLayers,
  clampNumber,
  clampRotation,
  isValidColor,
  mulberry32,
  paletteBackground,
  paletteColors,
  pickReadableColor,
  randomSeed,
  summaryText,
  type ToolState,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  shuffleState,
  regenerateLayers,
  roundTrips,
  textCollageTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({
  ...DEFAULT_STATE,
  ...patch,
});

describe('mulberry32', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces values in [0, 1)', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs across seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('settings clamping', () => {
  it('clamps values into range', () => {
    expect(clampNumber(500, 1, 80, 24)).toBe(80);
    expect(clampNumber(-5, 1, 80, 24)).toBe(1);
    expect(clampNumber(NaN, 1, 80, 24)).toBe(24);
    expect(clampNumber(25, 1, 80, 24)).toBe(25);
  });

  it('clamps rotation to [-180, 180]', () => {
    expect(clampRotation(200)).toBe(180);
    expect(clampRotation(-200)).toBe(-180);
    expect(clampRotation(NaN)).toBe(0);
  });

  it('honors density bounds', () => {
    expect(MIN_DENSITY).toBeLessThanOrEqual(MAX_DENSITY);
    const s = state({ density: 0 });
    const layers = buildLayers(s);
    expect(layers.length).toBe(MIN_DENSITY);
  });
});

describe('buildLayers', () => {
  it('creates exactly density layers', () => {
    expect(buildLayers(state({ density: 10 })).length).toBe(10);
    expect(buildLayers(state({ density: 37 })).length).toBe(37);
  });

  it('is deterministic for the same seed and settings', () => {
    const a = buildLayers(state({ seed: 999, density: 15 }));
    const b = buildLayers(state({ seed: 999, density: 15 }));
    expect(a).toEqual(b);
  });

  it('differs across seeds', () => {
    const a = buildLayers(state({ seed: 1, density: 10 }));
    const b = buildLayers(state({ seed: 2, density: 10 }));
    expect(a).not.toEqual(b);
  });

  it('keeps layer colors from the active palette', () => {
    const colors = paletteColors(state({ palette: 'neon' }));
    const layers = buildLayers(state({ palette: 'neon', density: 20 }));
    for (const layer of layers) {
      expect(colors).toContain(layer.color);
    }
  });

  it('cycles colors when density exceeds palette size', () => {
    const s = state({ palette: 'mono', density: 12 });
    const layers = buildLayers(s);
    const colors = paletteColors(s);
    expect(colors.length).toBe(5);
    const seen = new Set(layers.map((l) => l.color));
    expect(seen.size).toBeLessThanOrEqual(colors.length);
    expect(seen.size).toBeGreaterThan(0);
  });

  it('falls back to "hello" for blank phrases', () => {
    const layers = buildLayers(state({ phrase: '   ', density: 3 }));
    for (const layer of layers) {
      expect(layer.text).toBe('hello');
    }
  });

  it('trims the phrase', () => {
    const layers = buildLayers(state({ phrase: '  love  ', density: 2 }));
    for (const layer of layers) {
      expect(layer.text).toBe('love');
    }
  });

  it('respects font size range: min <= size <= effective max', () => {
    const s = state({ fontSizeMin: 20, fontSizeMax: 40, density: 30 });
    for (const layer of buildLayers(s)) {
      expect(layer.fontSize).toBeGreaterThanOrEqual(20);
      expect(layer.fontSize).toBeLessThanOrEqual(40);
    }
  });

  it('swaps inverted font size bounds', () => {
    const s = state({ fontSizeMin: 50, fontSizeMax: 10, density: 20 });
    for (const layer of buildLayers(s)) {
      expect(layer.fontSize).toBeGreaterThanOrEqual(10);
      expect(layer.fontSize).toBeLessThanOrEqual(50);
    }
  });

  it('range mode restricts rotation to the configured range', () => {
    const s = state({ rotationMode: 'range', rotationMin: -30, rotationMax: 30, density: 40 });
    for (const layer of buildLayers(s)) {
      expect(layer.rotation).toBeGreaterThanOrEqual(-30);
      expect(layer.rotation).toBeLessThanOrEqual(30);
    }
  });

  it('range mode with inverted bounds still produces rotations within the span', () => {
    const s = state({ rotationMode: 'range', rotationMin: 30, rotationMax: -30, density: 40 });
    for (const layer of buildLayers(s)) {
      expect(layer.rotation).toBeGreaterThanOrEqual(-30);
      expect(layer.rotation).toBeLessThanOrEqual(30);
    }
  });

  it('random mode allows the full [-180, 180] rotation range', () => {
    const s = state({ rotationMode: 'random', density: 60, seed: 31337 });
    const layers = buildLayers(s);
    for (const layer of layers) {
      expect(layer.rotation).toBeGreaterThanOrEqual(-180);
      expect(layer.rotation).toBeLessThanOrEqual(180);
    }
    const spread =
      Math.max(...layers.map((l) => l.rotation)) - Math.min(...layers.map((l) => l.rotation));
    expect(spread).toBeGreaterThan(10);
  });
});

describe('palettes', () => {
  it('exposes curated palettes with colors', () => {
    for (const p of ['candy', 'neon', 'pastel', 'mono', 'sunset'] as const) {
      expect(paletteColors(state({ palette: p })).length).toBeGreaterThan(0);
      expect(paletteBackground(state({ palette: p }))).toMatch(/^#/);
    }
  });

  it('uses custom colors for the custom palette', () => {
    const s = state({ palette: 'custom', customColors: ['#123456', '#654321'] });
    expect(paletteColors(s)).toEqual(['#123456', '#654321']);
    expect(paletteBackground(s)).toBe(s.customBackground);
  });

  it('falls back to white when custom colors are empty or invalid', () => {
    expect(paletteColors(state({ palette: 'custom', customColors: [] }))).toEqual(['#ffffff']);
    expect(paletteColors(state({ palette: 'custom', customColors: ['nope!!'] }))).toEqual([
      '#ffffff',
    ]);
  });

  it('validates colors', () => {
    expect(isValidColor('#fff')).toBe(true);
    expect(isValidColor('#ff00aa')).toBe(true);
    expect(isValidColor('#ff00aa80')).toBe(true);
    expect(isValidColor('rgb(1,2,3)')).toBe(true);
    expect(isValidColor('rgba(1, 2, 3, 0.5)')).toBe(true);
    expect(isValidColor('tomato')).toBe(true);
    expect(isValidColor('#12')).toBe(false);
    expect(isValidColor('#ff00zz')).toBe(false);
    expect(isValidColor('')).toBe(false);
  });

  it('picks readable text colors against light and dark backgrounds', () => {
    expect(pickReadableColor('#ffffff')).toBe('#111111');
    expect(pickReadableColor('#000000')).toBe('#ffffff');
    expect(pickReadableColor('nonsense')).toBe('#ffffff');
  });
});

describe('serialize/deserialize', () => {
  it('round-trips a full state', () => {
    const s = {
      ...state({ seed: 555, density: 12 }),
      layers: buildLayers(state({ seed: 555, density: 12 })),
    };
    expect(roundTrips(s)).toBe(true);
  });

  it('serialize includes settings and seed', () => {
    const text = serializeState(state({ seed: 42, phrase: 'hey' }));
    expect(text).toContain('"seed":42');
    expect(text).toContain('"phrase":"hey"');
  });

  it('deserializes legacy/partial payloads with defaults', () => {
    const result = deserializeState({ phrase: 'star' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phrase).toBe('star');
      expect(result.data.density).toBe(DEFAULT_STATE.density);
      expect(result.data.layers.length).toBe(DEFAULT_STATE.density);
    }
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
  });

  it('repairs invalid fields', () => {
    const result = deserializeState({
      phrase: 42,
      density: 9999,
      palette: 'bogus',
      rotationMode: 'sideways',
      fontSizeMin: 'x',
      seed: 'nope',
      layers: 'nope',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.density).toBe(MAX_DENSITY);
      expect(result.data.palette).toBe(DEFAULT_STATE.palette);
      expect(result.data.rotationMode).toBe(DEFAULT_STATE.rotationMode);
      expect(result.data.layers.length).toBe(MAX_DENSITY);
      expect(typeof result.data.seed).toBe('number');
    }
  });

  it('clamps canvas size on import', () => {
    const result = deserializeState({ canvasWidth: 99999, canvasHeight: -10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.canvasWidth).toBeLessThanOrEqual(4000);
      expect(result.data.canvasHeight).toBeGreaterThanOrEqual(200);
    }
  });

  it('deserializes valid layer arrays', () => {
    const layers = buildLayers(state({ seed: 77, density: 6 }));
    const result = deserializeState({ ...state({ seed: 77, density: 6 }), layers });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers).toEqual(layers);
    }
  });

  it('regenerates layers when the layer array does not match density', () => {
    const result = deserializeState({ density: 4, layers: [{ bogus: true }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layers.length).toBe(4);
    }
  });

  it('tool exposes id and exporters', async () => {
    expect(textCollageTool.id).toBe('text-collage-generator');
    expect(textCollageTool.exporters?.length).toBe(4);
    const png = await textCollageTool.exporters?.[0]?.loader();
    const resolved = png && 'default' in png ? png.default : undefined;
    expect(resolved?.format ?? 'png').toBe('png');
  });

  it('initialState layers match the default density', () => {
    expect(textCollageTool.initialState.layers.length).toBe(DEFAULT_STATE.density);
  });
});

describe('shuffle/regenerate', () => {
  it('shuffle keeps settings but changes the seed and layout', () => {
    const base = state({ density: 10 });
    const shuffled = shuffleState(base);
    expect(shuffled.density).toBe(base.density);
    expect(shuffled.phrase).toBe(base.phrase);
    expect(shuffled.palette).toBe(base.palette);
    expect(shuffled.seed).not.toBe(base.seed);
    expect(shuffled.layers).not.toEqual(base.layers);
    expect(shuffled.layers.length).toBe(base.density);
  });

  it('shuffle seeds are valid 32-bit unsigned ints', () => {
    for (let i = 0; i < 20; i++) {
      const seed = shuffleState(state()).seed;
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(0x100000000);
      expect(Number.isInteger(seed)).toBe(true);
    }
  });

  it('regenerate rebuilds layers from the existing seed', () => {
    const base = state({ seed: 1234, density: 8 });
    const rebuilt = regenerateLayers({ ...base, layers: [] });
    expect(rebuilt.layers).toEqual(buildLayers(base));
  });

  it('two regenerated layouts from the same seed are identical', () => {
    const a = regenerateLayers(state({ seed: 321, density: 9 }));
    const b = regenerateLayers(state({ seed: 321, density: 9 }));
    expect(a.layers).toEqual(b.layers);
  });

  it('randomSeed generates varied values', () => {
    const seeds = new Set(Array.from({ length: 25 }, () => randomSeed()));
    expect(seeds.size).toBeGreaterThan(1);
  });
});

describe('summaryText', () => {
  it('summarizes density and phrase', () => {
    expect(summaryText(state({ density: 5, phrase: 'hi' }))).toBe('5 layers — "hi"');
    expect(summaryText(state({ density: 1, phrase: 'hi' }))).toBe('1 layer — "hi"');
    expect(summaryText(state({ phrase: '  ' }))).toBe(`${DEFAULT_STATE.density} layers — "hello"`);
  });
});
