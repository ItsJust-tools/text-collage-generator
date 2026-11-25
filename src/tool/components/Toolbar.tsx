'use client';

import React from 'react';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Collage tool controls"
      >
        <button
          type="button"
          onClick={() => onChange({ ...state, seed: state.seed })}
          data-testid="btn-shuffle"
          className="rounded-md bg-pink-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-pink-600"
        >
          Shuffle
        </button>
        <input
          type="number"
          value={state.seed}
          min={0}
          max={4294967295}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10);
            onChange({ ...state, seed: Number.isFinite(parsed) ? parsed >>> 0 : state.seed });
          }}
          data-testid="input-seed"
          aria-label="Layout seed"
          className="w-32 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-reset"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-summary"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Copy summary
          </button>
        ) : null}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400" data-testid="toolbar-seed-display">
        Seed: {state.seed}
      </span>
    </div>
  );
};
