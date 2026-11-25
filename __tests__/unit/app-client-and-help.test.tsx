import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { compressToEncodedURIComponent } from 'lz-string';
import ToolClient from '@/app/tool-client';
import ToolClientWrapper from '@/app/tool-client-wrapper';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="dynamic-tool-client">dynamic-tool-client</div>,
}));

const mockSetData = vi.fn();
const mockToast = vi.fn();
const mockHandleExport = vi.fn();
const mockImport = vi.fn();

vi.mock('@itsjust/core', () => ({
  ToolShell: ({ toolbar, sidebar, canvas, statusBar }: Record<string, unknown>) => (
    <div>
      <div>{toolbar as ReactNode}</div>
      <div>{sidebar as ReactNode}</div>
      <div>{canvas as ReactNode}</div>
      <div>{statusBar as ReactNode}</div>
    </div>
  ),
  ImportExport: ({ onShare }: { onShare?: () => void }) => (
    <button type="button" onClick={onShare}>
      trigger-share
    </button>
  ),
  useTool: () => ({
    state: {
      data: {
        phrase: 'hello',
        density: 10,
        rotationMode: 'random',
        rotationMin: -45,
        rotationMax: 45,
        fontSizeMin: 24,
        fontSizeMax: 96,
        palette: 'candy',
        customBackground: '#101018',
        customColors: ['#ff6ec7', '#ffd93d', '#6ef2c4'],
        canvasWidth: 800,
        canvasHeight: 600,
        seed: 42,
        layers: [],
      },
      setData: mockSetData,
      isDirty: false,
      lastSaved: 'just now',
    },
    toast: mockToast,
    supportedFormats: ['json'],
    handleExport: mockHandleExport,
    importFromFile: mockImport,
    isImporting: false,
    toolbarActions: { canUndo: true, canRedo: true, onUndo: vi.fn(), onRedo: vi.fn() },
  }),
}));

vi.mock('@/tool', () => ({
  toolConfig: {
    id: 'text-collage-generator',
    name: 'Text Collage Generator',
    version: '1.0.0',
    features: { sidebar: true },
    theme: { brand: 'Text Collage Generator' },
  },
  templateBaseVersion: '1.4.0',
  Canvas: ({ state }: { state: Record<string, unknown> }) => <div>canvas:{String(state.seed)}</div>,
  Toolbar: () => <div>toolbar</div>,
  Sidebar: () => <div>sidebar</div>,
  summaryText: () => 'summary',
}));

vi.mock('@/tool/tool-definition', () => ({
  textCollageTool: {
    serialize: (state: unknown) => JSON.stringify(state),
    deserialize: (data: unknown) => ({ success: true, data }),
  },
}));

describe('app client and help page', () => {
  beforeEach(() => {
    mockSetData.mockReset();
    mockToast.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: undefined,
    });
    window.history.replaceState(null, '', 'http://localhost:3000/');
  });

  it('renders wrapper and dynamic client skeleton', () => {
    render(<ToolClientWrapper />);
    expect(screen.getByTestId('dynamic-tool-client')).toBeInTheDocument();
  });

  it('renders shell sections and status bar content', () => {
    render(<ToolClient />);
    expect(screen.getByText('toolbar')).toBeInTheDocument();
    expect(screen.getByText('sidebar')).toBeInTheDocument();
    expect(screen.getByText('canvas:42')).toBeInTheDocument();
    expect(screen.getByText('Seed 42')).toBeInTheDocument();
    expect(screen.getAllByText('summary').length).toBeGreaterThan(0);
  });

  it('shares the current state via URL', async () => {
    render(<ToolClient />);
    fireEvent.click(screen.getByText('trigger-share'));
    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Share URL copied to clipboard', 'success');
    });
  });

  it('shows an error toast when clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<ToolClient />);
    fireEvent.click(screen.getByText('trigger-share'));
    await vi.waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('denied', 'error');
    });
  });

  it('loads state from a shared URL query param', () => {
    const encoded = compressToEncodedURIComponent(JSON.stringify({ phrase: 'shared' }));
    window.history.replaceState(
      null,
      '',
      `http://localhost:3000/?state=${encodeURIComponent(encoded)}`
    );
    render(<ToolClient />);
    expect(mockToast).toHaveBeenCalledWith('Loaded state from shared URL', 'success');
    expect(mockSetData).toHaveBeenCalled();
  });

  it('shows an error toast for invalid shared state', () => {
    window.history.replaceState(null, '', 'http://localhost:3000/?state=%%%invalid');
    render(<ToolClient />);
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('not valid JSON'), 'error');
  });
});
