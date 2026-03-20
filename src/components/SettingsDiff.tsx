import React, { useState, useEffect } from 'react';
import { AlertCircle, GitCompare, Copy, Check } from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { fetchPreviousSettingsUpdate } from '../api';
import { IPFS_GATEWAY, EDITOR_OPTIONS, DIFF_EDITOR_OPTIONS } from '../constants';
import type { SnapshotMessage } from '../types';

interface SettingsDiffProps {
  currentMessage: SnapshotMessage;
  space: string;
}

export const SettingsDiff: React.FC<SettingsDiffProps> = ({ currentMessage, space }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentSettings, setCurrentSettings] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previousSettings, setPreviousSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentResponse = await fetch(`${IPFS_GATEWAY}/${currentMessage.ipfs}`);
        if (!currentResponse.ok) throw new Error('Failed to fetch current settings');
        const currentData = await currentResponse.json();
        const currentSettingsData = JSON.parse(currentData.data.message.settings);
        setCurrentSettings(currentSettingsData);

        const previousResponse = await fetchPreviousSettingsUpdate(space, currentMessage.timestamp);

        if (previousResponse.messages.length === 0) {
          setPreviousSettings(null);
        } else {
          const previousMessage = previousResponse.messages[0];
          const previousIPFSResponse = await fetch(`${IPFS_GATEWAY}/${previousMessage.ipfs}`);
          if (!previousIPFSResponse.ok) throw new Error('Failed to fetch previous settings');
          const previousData = await previousIPFSResponse.json();
          const previousSettingsData = JSON.parse(previousData.data.message.settings);
          setPreviousSettings(previousSettingsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsData();
  }, [currentMessage, space]);

  const handleCopy = async (text: string, type: string) => {
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 border-t-blue-600 mb-4"></div>
        <p className="text-zinc-500 font-mono text-sm uppercase tracking-wider">Loading settings comparison...</p>
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

  const currentJson = JSON.stringify(currentSettings, null, 2);
  const previousJson = previousSettings ? JSON.stringify(previousSettings, null, 2) : '';

  const editorLoading = (
    <div className="flex items-center justify-center h-[60vh] bg-[#1e1e1e]">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-600 border-t-[#75beff]"></div>
    </div>
  );

  // No previous settings - show single editor
  if (!previousSettings) {
    return (
      <div className="max-w-none">
        <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-2 rounded-t-lg border-b border-[#333]">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-[#75beff]" />
            <span className="text-[#cccccc] font-mono text-sm">current-settings.json</span>
            <span className="text-[#858585] font-mono text-xs ml-2">First Settings Update</span>
          </div>
          <button
            onClick={() => handleCopy(currentJson, 'json')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
          >
            {copied === 'json' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied === 'json' ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <div className="rounded-b-lg overflow-hidden border border-[#333] border-t-0">
          <Editor
            height="60vh"
            defaultLanguage="json"
            value={currentJson}
            theme="vs-dark"
            options={EDITOR_OPTIONS}
            loading={editorLoading}
          />
        </div>
      </div>
    );
  }

  // Has previous settings - show diff editor
  return (
    <div className="max-w-none">
      <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-2 rounded-t-lg border-b border-[#333]">
        <div className="flex items-center gap-3">
          <GitCompare className="w-4 h-4 text-[#75beff]" />
          <span className="text-[#cccccc] font-mono text-sm">Settings Comparison</span>
          <span className="text-[#858585] font-mono text-xs">{space}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(previousJson, 'prev')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
          >
            {copied === 'prev' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied === 'prev' ? 'Copied!' : 'Previous'}</span>
          </button>
          <button
            onClick={() => handleCopy(currentJson, 'curr')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
          >
            {copied === 'curr' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied === 'curr' ? 'Copied!' : 'Current'}</span>
          </button>
        </div>
      </div>

      {/* Diff labels */}
      <div className="flex bg-[#252526] border-x border-[#333]">
        <div className="flex-1 px-4 py-1.5 text-[11px] font-mono text-red-400 border-r border-[#333] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span> Previous Settings
        </div>
        <div className="flex-1 px-4 py-1.5 text-[11px] font-mono text-green-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span> Current Settings
        </div>
      </div>

      <div className="rounded-b-lg overflow-hidden border border-[#333] border-t-0">
        <DiffEditor
          height="60vh"
          language="json"
          original={previousJson}
          modified={currentJson}
          theme="vs-dark"
          keepCurrentOriginalModel={true}
          keepCurrentModifiedModel={true}
          options={DIFF_EDITOR_OPTIONS}
          loading={editorLoading}
        />
      </div>
    </div>
  );
};
