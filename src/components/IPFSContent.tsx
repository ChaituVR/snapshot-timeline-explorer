import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, Copy, Check } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { IPFS_GATEWAY, EDITOR_OPTIONS } from '../constants';

interface IPFSContentProps {
  ipfsHash: string;
}

export const IPFSContent: React.FC<IPFSContentProps> = ({ ipfsHash }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'hash' | 'json' | null>(null);

  useEffect(() => {
    const fetchIPFSContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${IPFS_GATEWAY}/${ipfsHash}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`);
        }

        const data = await response.json();
        setContent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load IPFS content');
      } finally {
        setLoading(false);
      }
    };

    fetchIPFSContent();
  }, [ipfsHash]);

  const handleCopy = async (text: string, type: 'hash' | 'json') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 border-t-red-600 mb-4"></div>
        <p className="text-zinc-500 font-mono text-sm uppercase tracking-wider">Loading IPFS content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <h3 className="text-base font-bold text-red-700 mb-1 font-mono uppercase">Failed to Load</h3>
        <p className="text-red-600 text-sm font-mono">{error}</p>
      </div>
    );
  }

  const jsonString = JSON.stringify(content, null, 2);

  return (
    <div className="max-w-none">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-2 rounded-t-lg border-b border-[#333]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#75beff]" />
          <span className="text-[#cccccc] font-mono text-sm">
            {ipfsHash.slice(0, 12)}...{ipfsHash.slice(-8)}.json
          </span>
          <span className="text-[#858585] font-mono text-xs ml-2">
            IPFS Content
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(ipfsHash, 'hash')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
            title="Copy IPFS hash"
          >
            {copied === 'hash' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied === 'hash' ? 'Copied!' : 'Hash'}</span>
          </button>
          <button
            onClick={() => handleCopy(jsonString, 'json')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
            title="Copy JSON content"
          >
            {copied === 'json' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied === 'json' ? 'Copied!' : 'JSON'}</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="rounded-b-lg overflow-hidden border border-[#333] border-t-0">
        <Editor
          height="60vh"
          defaultLanguage="json"
          value={jsonString}
          theme="vs-dark"
          options={{
            ...EDITOR_OPTIONS,
            minimap: { enabled: true },
            lineNumbers: 'on',
            wrappingIndent: 'indent',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            foldingHighlight: true,
          }}
          loading={
            <div className="flex items-center justify-center h-[60vh] bg-[#1e1e1e]">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-600 border-t-[#75beff]"></div>
            </div>
          }
        />
      </div>
    </div>
  );
};
