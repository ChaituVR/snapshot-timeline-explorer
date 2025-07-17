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

const TYPE_COLORS = {
  proposal: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 text-blue-800',
  settings: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 text-amber-800',
  'delete-proposal': 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300 text-red-800',
  'update-proposal': 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-800',
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

  const getProposalUrl = (message: SnapshotMessage) => {
    if (message.type === 'proposal') {
      return `https://snapshot.box/#/s:${space.toLowerCase()}/proposal/${message.id}`;
    }
    return null;
  };

  if (messages.length === 0 && !loading) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <Calendar className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Timeline Data</h3>
        <p className="text-gray-500">Enter a space name and click "Explore Timeline" to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <div className="absolute left-6 top-0 h-full w-1 bg-gradient-to-b from-blue-200 via-purple-200 to-pink-200 rounded-full"></div>

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
                  message.type === 'proposal' ? 'from-blue-400 to-blue-600' :
                  message.type === 'settings' ? 'from-amber-400 to-amber-600' :
                  message.type === 'delete-proposal' ? 'from-red-400 to-red-600' :
                  'from-emerald-400 to-emerald-600'
                }`}
              >
                <Icon size={12} className="text-white" />
              </div>

              <div
                className={`p-6 rounded-2xl border-2 ${colorClasses} shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm`}
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
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                      >
                        View on Snapshot <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {format(message.timestamp * 1000, 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(message.timestamp * 1000, 'HH:mm:ss')}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <a
                    href={`https://4everland.io/ipfs/${message.ipfs}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    <ExternalLink size={14} />
                    View on IPFS
                  </a>
                  <button
                    onClick={() => setSelectedIPFS(message.ipfs)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors font-medium"
                  >
                    <Eye size={14} />
                    View Content
                  </button>
                  {message.type === 'settings' && (
                    <button
                      onClick={() => setSelectedSettingsDiff(message)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors font-medium"
                    >
                      <FileEdit size={14} />
                      View Difference
                    </button>
                  )}
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-gray-600">
                    <Hash size={14} />
                    MCI: {message.mci}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-600"></div>
              <span className="text-gray-600 font-medium">Loading more events...</span>
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
    </div>
  );
};
