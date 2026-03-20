import React, { useState, useEffect } from 'react';
import { AlertCircle, GitCompare, Copy, Check } from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';
import { fetchProposalById } from '../api';
import { IPFS_GATEWAY, DIFF_EDITOR_OPTIONS } from '../constants';
import type { SnapshotMessage } from '../types';

interface ProposalDiffProps {
  currentMessage: SnapshotMessage;
  space: string;
}

export const ProposalDiff: React.FC<ProposalDiffProps> = ({ currentMessage, space }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentProposal, setCurrentProposal] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [originalProposal, setOriginalProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposalData = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentResponse = await fetch(`${IPFS_GATEWAY}/${currentMessage.ipfs}`);
        if (!currentResponse.ok) throw new Error('Failed to fetch current proposal update');
        const currentData = await currentResponse.json();

        const extractedProposalId = currentData.data.message.proposal;
        if (!extractedProposalId) throw new Error('No proposal ID found in update message');

        setProposalId(extractedProposalId);
        setCurrentProposal(currentData.data.message);

        const proposalResponse = await fetchProposalById(space, extractedProposalId);

        if (proposalResponse.messages.length === 0) throw new Error('Original proposal not found');

        const originalMessage = proposalResponse.messages.find(msg => msg.type === 'proposal');
        if (!originalMessage) throw new Error('Original proposal message not found');

        const originalResponse = await fetch(`${IPFS_GATEWAY}/${originalMessage.ipfs}`);
        if (!originalResponse.ok) throw new Error('Failed to fetch original proposal');

        const originalData = await originalResponse.json();
        setOriginalProposal(originalData.data.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load proposal comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchProposalData();
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 border-t-amber-600 mb-4"></div>
        <p className="text-zinc-500 font-mono text-sm uppercase tracking-wider">Loading proposal comparison...</p>
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

  const originalJson = originalProposal ? JSON.stringify(originalProposal, null, 2) : '';
  const currentJson = JSON.stringify(currentProposal, null, 2);

  const editorLoading = (
    <div className="flex items-center justify-center h-[60vh] bg-[#1e1e1e]">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-600 border-t-[#75beff]"></div>
    </div>
  );

  return (
    <div className="max-w-none">
      <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-2 rounded-t-lg border-b border-[#333]">
        <div className="flex items-center gap-3">
          <GitCompare className="w-4 h-4 text-[#75beff]" />
          <span className="text-[#cccccc] font-mono text-sm">Proposal Comparison</span>
          {proposalId && (
            <span className="text-[#858585] font-mono text-xs">
              {proposalId.slice(0, 8)}...{proposalId.slice(-6)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {proposalId && (
            <button
              onClick={() => handleCopy(proposalId, 'id')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
            >
              {copied === 'id' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              <span>{copied === 'id' ? 'Copied!' : 'ID'}</span>
            </button>
          )}
          <button
            onClick={() => handleCopy(originalJson, 'orig')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
          >
            {copied === 'orig' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied === 'orig' ? 'Copied!' : 'Original'}</span>
          </button>
          <button
            onClick={() => handleCopy(currentJson, 'curr')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
          >
            {copied === 'curr' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied === 'curr' ? 'Copied!' : 'Updated'}</span>
          </button>
        </div>
      </div>

      {/* Diff labels */}
      <div className="flex bg-[#252526] border-x border-[#333]">
        <div className="flex-1 px-4 py-1.5 text-[11px] font-mono text-red-400 border-r border-[#333] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span> Original Proposal
        </div>
        <div className="flex-1 px-4 py-1.5 text-[11px] font-mono text-green-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span> Updated Proposal
        </div>
      </div>

      <div className="rounded-b-lg overflow-hidden border border-[#333] border-t-0">
        <DiffEditor
          height="60vh"
          language="json"
          original={originalJson}
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
