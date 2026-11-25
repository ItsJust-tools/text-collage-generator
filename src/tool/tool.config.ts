import type { ToolConfig } from '@itsjust/core';

const toolConfig: ToolConfig = {
  id: 'text-collage-generator',
  name: 'Text Collage Generator',
  description:
    'Generate a random aesthetic text collage poster from a word or phrase with layered, rotated, colored repeated text for social media and wallpapers.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf', 'json'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#f472b6',
    accentHover: '#ec4899',
    accentSubtle: 'rgba(244, 114, 182, 0.15)',
    brand: 'Text Collage Generator',
    icon: '🎨',
  },
};

export default toolConfig;
