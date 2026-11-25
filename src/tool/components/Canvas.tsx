'use client';

import React from 'react';
import {
  paletteBackground,
  paletteColors,
  pickReadableColor,
  type TextLayer,
  type ToolState,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

/**
 * Renders the collage as absolutely positioned, rotated text nodes sized
 * against the state canvas dimensions. Scaling is handled visually via CSS
 * transform while the layout itself uses normalized x/y coordinates.
 */
export const Canvas: React.FC<CanvasProps> = ({ state }) => {
  const colors = paletteColors(state);
  const background = paletteBackground(state);
  const fallbackText = pickReadableColor(background);
  const phrase = state.phrase.trim() || 'hello';

  return (
    <div className="p-4 overflow-auto h-full" data-testid="collage-canvas">
      <div
        data-testid="collage-stage"
        className="relative mx-auto overflow-hidden rounded-lg shadow-lg"
        style={{
          width: '100%',
          maxWidth: `${state.canvasWidth}px`,
          aspectRatio: `${state.canvasWidth} / ${state.canvasHeight}`,
          backgroundColor: background,
        }}
      >
        {state.layers.map((layer: TextLayer, i: number) => (
          <span
            key={layer.id}
            data-testid="collage-layer"
            data-layer-index={i}
            data-layer-color={layer.color}
            data-layer-rotation={layer.rotation}
            className="absolute select-none font-bold whitespace-nowrap"
            style={{
              left: `${layer.x * 70 + 5}%`,
              top: `${layer.y * 80 + 5}%`,
              color: layer.color || fallbackText,
              fontSize: `${layer.fontSize}px`,
              transform: `rotate(${layer.rotation}deg)`,
              transformOrigin: 'center',
            }}
            aria-hidden="true"
          >
            {layer.text || phrase}
          </span>
        ))}
        <span className="sr-only">{phrase}</span>
      </div>
      <p
        className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400"
        data-testid="canvas-dims"
      >
        {state.canvasWidth} × {state.canvasHeight} px — {state.layers.length} layer
        {state.layers.length === 1 ? '' : 's'} — seed {state.seed}
      </p>
      <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
        Colors cycle through {colors.length} palette color{colors.length === 1 ? '' : 's'}.
      </p>
    </div>
  );
};
