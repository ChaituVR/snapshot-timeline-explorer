import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  ExternalLink,
  Settings,
  FileEdit,
  Trash2,
  Vote,
  Eye,
  Calendar,
  Hash,
} from 'lucide-react';
import type { SnapshotMessage } from '../types';
import { Modal } from './Modal';
import { IPFSContent } from './IPFSContent';
import { SettingsDiff } from './SettingsDiff';
import { ProposalDiff } from './ProposalDiff';
import { CopyButton } from './CopyButton';

const TYPE_COLORS = {
  proposal: 'bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/30 text-cyan-300',
  settings: 'bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-amber-500/30 text-amber-300',
  'delete-proposal': 'bg-gradient-to-r from-red-900/20 to-pink-900/20 border-red-500/30 text-red-300',
  'update-proposal': 'bg-gradient-to-r from-emerald-900/20 to-green-900/20 border-emerald-500/30 text-emerald-300',
};

const TYPE_ICONS = {
  proposal: Vote,
  settings: Settings,
  'delete-proposal': Trash2,
  'update-proposal': FileEdit,
};

const TYPE_LABELS = {
  proposal: 'New Proposal',
  settings: 'Settings Update',
  'delete-proposal': 'Proposal Deleted',
  'update-proposal': 'Proposal Updated',
};

interface TimelineProps {
  messages: SnapshotMessage[];
  loading: boolean;
  space: string;
}

export const Timeline: React.FC<TimelineProps> = ({ messages, loading, space }) => {
  const [selectedIPFS, setSelectedIPFS] = useState<string | null>(null);
  const [selectedSettingsDiff, setSelectedSettingsDiff] = useState<SnapshotMessage | null>(null);
  const [selectedProposalDiff, setSelectedProposalDiff] = useState<SnapshotMessage | null>(null);

  const getProposalUrl = (message: SnapshotMessage) => {
    if (message.type === 'proposal') {
      return `https://snapshot.box/#/s:${space}/proposal/${message.id}`;
    }
    return null;
  };

  if (messages.length === 0 && !loading) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-gray-800 to-gray-700 rounded-full flex items-center justify-center shadow-2xl">
          <Calendar className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Timeline Data</h3>
        <p className="text-gray-400">Enter a space name and click "Explore Timeline" to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <div className="absolute left-6 top-0 h-full w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600 rounded-full shadow-lg"></div>

        {messages.map((message, index) => {
          const Icon = TYPE_ICONS[message.type];
          const colorClasses = TYPE_COLORS[message.type];
          const proposalUrl = getProposalUrl(message);
          const isLast = index === messages.length - 1;

          return (
            <div
              key={message.id}
              className={`relative pl-16 ${isLast ? 'pb-4' : 'pb-12'}`}
            >
              <div
                className={`absolute left-3 w-6 h-6 rounded-full border-3 border-white shadow-lg flex items-center justify-center bg-gradient-to-br ${
                  message.type === 'proposal' ? 'from-cyan-400 to-blue-500' :
                  message.type === 'settings' ? 'from-amber-400 to-orange-500' :
                  message.type === 'delete-proposal' ? 'from-red-400 to-pink-500' :
                  'from-emerald-400 to-green-500'
                }`}
              >
                <Icon size={12} className="text-white" />
              </div>

              <div
                className={`p-6 rounded-2xl border-2 ${colorClasses} shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-800/50 backdrop-blur-sm`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">
                      {TYPE_LABELS[message.type]}
                    </span>
                    {proposalUrl && (
                      <a
                        href={proposalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-cyan-300 rounded-full text-sm font-medium hover:from-cyan-400/30 hover:to-blue-500/30 transition-all duration-200 border border-cyan-500/30"
                      >
                        View on Snapshot <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-300">
                      {format(message.timestamp * 1000, 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(message.timestamp * 1000, 'HH:mm:ss')}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <a
                    href={`https://4everland.io/ipfs/${message.ipfs}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors font-medium text-gray-300"
                  >
                    <ExternalLink size={14} />
                    View on IPFS
                  </a>
                  <button
                    onClick={() => setSelectedIPFS(message.ipfs)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 hover:from-indigo-500/30 hover:to-purple-500/30 rounded-lg transition-all duration-200 font-medium border border-indigo-500/30"
                  >
                    <Eye size={14} />
                    View Content
                  </button>
                  {message.type === 'settings' && (
                    <button
                      onClick={() => setSelectedSettingsDiff(message)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 rounded-lg transition-all duration-200 font-medium border border-amber-500/30"
                    >
                      <FileEdit size={14} />
                      View Difference
                    </button>
                  )}
                  {message.type === 'update-proposal' && (
                    <button
                      onClick={() => setSelectedProposalDiff(message)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 hover:from-emerald-500/30 hover:to-green-500/30 rounded-lg transition-all duration-200 font-medium border border-emerald-500/30"
                    >
                      <FileEdit size={14} />
                      View Difference
                    </button>
                  )}
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700/30 rounded-lg text-gray-400">
                    <Hash size={14} />
                    MCI: {message.mci}
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton 
                      text={message.ipfs} 
                      variant="minimal" 
                      className="text-gray-400 hover:text-gray-200">
                      Copy IPFS
                    </CopyButton>
                    <CopyButton 
                      text={message.id} 
                      variant="minimal" 
                      className="text-gray-400 hover:text-gray-200">
                      Copy ID
                    </CopyButton>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-gray-600 border-t-cyan-400"></div>
              <span className="text-gray-300 font-medium">Loading more events...</span>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedIPFS} onClose={() => setSelectedIPFS(null)}>
        {selectedIPFS && <IPFSContent ipfsHash={selectedIPFS} />}
      </Modal>
      
      <Modal isOpen={!!selectedSettingsDiff} onClose={() => setSelectedSettingsDiff(null)}>
        {selectedSettingsDiff && (
          <SettingsDiff currentMessage={selectedSettingsDiff} space={space} />
        )}
      </Modal>
      
      <Modal isOpen={!!selectedProposalDiff} onClose={() => setSelectedProposalDiff(null)}>
        {selectedProposalDiff && (
          <ProposalDiff currentMessage={selectedProposalDiff} space={space} />
        )}
      </Modal>
    </div>
  );
};