export const IPFS_GATEWAY = 'https://4everland.io/ipfs';

export const EDITOR_OPTIONS = {
  readOnly: true,
  minimap: { enabled: false },
  fontSize: 13,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
  fontLigatures: true,
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },
  smoothScrolling: true,
  folding: true,
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
} as const;

export const DIFF_EDITOR_OPTIONS = {
  ...EDITOR_OPTIONS,
  renderSideBySide: true,
} as const;

export const EVENT_TYPES = ['proposal', 'settings', 'delete-proposal', 'update-proposal', 'vote'] as const;
