'use client';

import React from 'react';
import {
  MAX_CANVAS,
  MAX_DENSITY,
  MAX_FONT_SIZE,
  MAX_ROTATION,
  MIN_CANVAS,
  MIN_DENSITY,
  MIN_FONT_SIZE,
  MIN_ROTATION,
  PALETTES,
  isValidColor,
  type PaletteId,
  type ToolState,
} from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

const fieldClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const update = (patch: Partial<ToolState>) => onChange({ ...state, ...patch });
  const numberInput = (
    label: string,
    testid: string,
    value: number,
    min: number,
    max: number,
    fallback: number,
    onCommit: (v: number) => void
  ) => (
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        data-testid={testid}
        onChange={(e) => {
          const parsed = Number.parseFloat(e.target.value);
          if (Number.isFinite(parsed)) onCommit(clampNumber(parsed, min, max, fallback));
        }}
        className={fieldClass}
      />
    </label>
  );

  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="collage-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Phrase</h3>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Word or phrase
          <input
            type="text"
            value={state.phrase}
            data-testid="input-phrase"
            onChange={(e) => update({ phrase: e.target.value })}
            className={fieldClass}
          />
        </label>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Density</h3>
        {numberInput('Layers', 'input-density', state.density, MIN_DENSITY, MAX_DENSITY, 24, (v) =>
          update({ density: Math.round(v) })
        )}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Rotation</h3>
        <div className="flex gap-2" role="group" aria-label="Rotation mode">
          {(['random', 'range'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={state.rotationMode === mode}
              data-testid={`rotation-${mode}`}
              onClick={() => update({ rotationMode: mode })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                state.rotationMode === mode
                  ? 'border-pink-500 bg-pink-50 text-pink-800 dark:bg-pink-900/40 dark:text-pink-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {mode === 'random' ? 'Random (full)' : 'Fixed range'}
            </button>
          ))}
        </div>
        {state.rotationMode === 'range' ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {numberInput(
              'Min (°)',
              'input-rotation-min',
              state.rotationMin,
              MIN_ROTATION,
              MAX_ROTATION,
              -45,
              (v) => update({ rotationMin: v })
            )}
            {numberInput(
              'Max (°)',
              'input-rotation-max',
              state.rotationMax,
              MIN_ROTATION,
              MAX_ROTATION,
              45,
              (v) => update({ rotationMax: v })
            )}
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Font size range</h3>
        <div className="grid grid-cols-2 gap-2">
          {numberInput(
            'Min (px)',
            'input-font-min',
            state.fontSizeMin,
            MIN_FONT_SIZE,
            MAX_FONT_SIZE,
            24,
            (v) => update({ fontSizeMin: v })
          )}
          {numberInput(
            'Max (px)',
            'input-font-max',
            state.fontSizeMax,
            MIN_FONT_SIZE,
            MAX_FONT_SIZE,
            96,
            (v) => update({ fontSizeMax: v })
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Palette</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Palette">
          {PALETTES.map((palette) => (
            <button
              key={palette.id}
              type="button"
              role="tab"
              aria-selected={state.palette === palette.id}
              data-testid={`palette-${palette.id}`}
              onClick={() => update({ palette: palette.id as PaletteId })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                state.palette === palette.id
                  ? 'border-pink-500 bg-pink-50 text-pink-800 dark:bg-pink-900/40 dark:text-pink-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {palette.label}
            </button>
          ))}
        </div>
        {state.palette === 'custom' ? (
          <div className="mt-2 space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Background color
              <input
                type="color"
                value={isValidColor(state.customBackground) ? state.customBackground : '#101018'}
                data-testid="input-custom-background"
                onChange={(e) => update({ customBackground: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-gray-300 dark:border-gray-700"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Text colors (comma separated hex)
              <input
                type="text"
                value={state.customColors.join(', ')}
                data-testid="input-custom-colors"
                onChange={(e) =>
                  update({
                    customColors: e.target.value
                      .split(',')
                      .map((c) => c.trim())
                      .filter((c) => c.length > 0),
                  })
                }
                className={fieldClass}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Canvas size</h3>
        <div className="grid grid-cols-2 gap-2">
          {numberInput(
            'Width (px)',
            'input-canvas-width',
            state.canvasWidth,
            MIN_CANVAS,
            MAX_CANVAS,
            1080,
            (v) => update({ canvasWidth: Math.round(v) })
          )}
          {numberInput(
            'Height (px)',
            'input-canvas-height',
            state.canvasHeight,
            MIN_CANVAS,
            MAX_CANVAS,
            1080,
            (v) => update({ canvasHeight: Math.round(v) })
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Seed</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-seed-info">
          Seed {state.seed} — the same seed and settings reproduce the exact same layout on reload.
        </p>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Everything is generated locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
