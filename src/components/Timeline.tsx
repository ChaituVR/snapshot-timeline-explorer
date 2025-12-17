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
import { ScrambleText } from './ScrambleText';

const TYPE_COLORS = {
  light: {
    proposal: 'bg-white border-black text-black',
    settings: 'bg-black border-black text-white',
    'delete-proposal': 'bg-red-600 border-red-600 text-white',
    'update-proposal': 'bg-white border-black text-black',
  },
  dark: {
    proposal: 'bg-black border-white text-white',
    settings: 'bg-white border-black text-black',
    'delete-proposal': 'bg-red-600 border-white text-white',
    'update-proposal': 'bg-black border-white text-white',
  },
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
  theme: 'light' | 'dark';
}

export const Timeline: React.FC<TimelineProps> = ({ messages, loading, space, theme }) => {
  const [selectedIPFS, setSelectedIPFS] = useState<string | null>(null);
  const [selectedSettingsDiff, setSelectedSettingsDiff] = useState<SnapshotMessage | null>(null);
  const [selectedProposalDiff, setSelectedProposalDiff] = useState<SnapshotMessage | null>(null);
  const [hoverStates, setHoverStates] = useState<Record<string, boolean>>({});

  const getProposalUrl = (message: SnapshotMessage) => {
    if (message.type === 'proposal') {
      return `https://snapshot.box/#/s:${space.toLowerCase()}/proposal/${message.id}`;
    }
    return null;
  };

  if (messages.length === 0 && !loading) {
    return (
      <div 
        onMouseEnter={() => setHoverStates(prev => ({ ...prev, emptyState: true }))}
        onMouseLeave={() => setHoverStates(prev => ({ ...prev, emptyState: false }))}
        className={`text-center py-16 px-4 border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] ${
        theme === 'dark'
          ? 'bg-black border-white'
          : 'bg-white border-black'
      }`}>
        <div className={`w-24 h-24 mx-auto mb-6 border-4 flex items-center justify-center ${
          theme === 'dark' ? 'bg-black border-white' : 'bg-white border-black'
        }`}>
          <Calendar className={`w-12 h-12 ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`} />
        </div>
        <h3 className={`font-mono text-2xl font-bold mb-2 uppercase tracking-wider ${
          theme === 'dark' ? 'text-white' : 'text-black'
        }`}><ScrambleText externalHover={hoverStates.emptyState}>[!NO_TIMELINE_DATA!]</ScrambleText></h3>
        <p className={`font-mono uppercase text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          <ScrambleText externalHover={hoverStates.emptyState}>ENTER_SPACE_NAME &gt;&gt; EXPLORE</ScrambleText>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative">
        <div className={`absolute left-6 top-0 h-full w-1 ${
          theme === 'dark'
            ? 'bg-red-600'
            : 'bg-black'
        }`}></div>

        {messages.map((message, index) => {
          const Icon = TYPE_ICONS[message.type];
          const colorClasses = TYPE_COLORS[theme][message.type];
          const proposalUrl = getProposalUrl(message);
          const isLast = index === messages.length - 1;

          return (
            <div
              key={message.id}
              className={`relative pl-16 ${isLast ? 'pb-4' : 'pb-12'} group`}
            >
              <div
                className={`absolute left-3 w-6 h-6 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center transition-all duration-100 ${
                  message.type === 'delete-proposal' 
                    ? 'bg-red-600 border-red-600' 
                    : theme === 'dark' 
                      ? 'border-white bg-black' 
                      : 'border-black bg-white'
                }`}
              >
                <Icon size={12} className={message.type === 'delete-proposal' ? 'text-white' : theme === 'dark' ? 'text-white' : 'text-black'} />
              </div>

              <div
                className={`p-6 border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all duration-100 ${colorClasses} hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span 
                      onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`label-${message.id}`]: true }))}
                      onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`label-${message.id}`]: false }))}
                      className="font-bold text-lg uppercase tracking-wide" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                      <ScrambleText externalHover={hoverStates[`label-${message.id}`]}>{TYPE_LABELS[message.type]}</ScrambleText>
                    </span>
                    {proposalUrl && (
                      <a
                        href={proposalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`snapshot-${message.id}`]: true }))}
                        onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`snapshot-${message.id}`]: false }))}
                        className="inline-flex items-center gap-1 px-3 py-1 border-2 text-xs font-mono font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-red-600 border-red-600 text-white"
                      >
                        <ScrambleText externalHover={hoverStates[`snapshot-${message.id}`]}>SNAPSHOT</ScrambleText> <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <div className="text-right font-mono">
                    <div className={`text-sm font-bold uppercase ${
                      theme === 'dark' ? 'text-current' : 'text-current'
                    }`}>
                      {format(message.timestamp * 1000, 'MMM d, yyyy')}
                    </div>
                    <div className={`text-xs font-bold ${
                      theme === 'dark' ? 'text-current' : 'text-current'
                    }`}>
                      {format(message.timestamp * 1000, 'HH:mm:ss')}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <a
                    href={`https://4everland.io/ipfs/${message.ipfs}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`ipfs-${message.id}`]: true }))}
                    onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`ipfs-${message.id}`]: false }))}
                    className={`inline-flex items-center gap-2 px-3 py-2 border-2 font-mono font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-red-600 border-red-600 text-white`}
                  >
                    <ExternalLink size={12} />
                    <ScrambleText externalHover={hoverStates[`ipfs-${message.id}`]}>IPFS</ScrambleText>
                  </a>
                  <button
                    onClick={() => setSelectedIPFS(message.ipfs)}
                    onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`view-${message.id}`]: true }))}
                    onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`view-${message.id}`]: false }))}
                    className="inline-flex items-center gap-2 px-3 py-2 border-2 font-mono font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                  >
                    <Eye size={12} />
                    <ScrambleText externalHover={hoverStates[`view-${message.id}`]}>VIEW</ScrambleText>
                  </button>
                  {message.type === 'settings' && (
                    <button
                      onClick={() => setSelectedSettingsDiff(message)}
                      onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`diff-${message.id}`]: true }))}
                      onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`diff-${message.id}`]: false }))}
                      className="inline-flex items-center gap-2 px-3 py-2 border-2 font-mono font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                    >
                      <FileEdit size={12} />
                      <ScrambleText externalHover={hoverStates[`diff-${message.id}`]}>DIFF</ScrambleText>
                    </button>
                  )}
                  {message.type === 'update-proposal' && (
                    <button
                      onClick={() => setSelectedProposalDiff(message)}
                      onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`diff-${message.id}`]: true }))}
                      onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`diff-${message.id}`]: false }))}
                      className="inline-flex items-center gap-2 px-3 py-2 border-2 font-mono font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                    >
                      <FileEdit size={12} />
                      <ScrambleText externalHover={hoverStates[`diff-${message.id}`]}>DIFF</ScrambleText>
                    </button>
                  )}
                  <div className="inline-flex items-center gap-2 px-3 py-2 border-2 font-mono font-bold uppercase bg-black border-black text-white dark:bg-white dark:border-white dark:text-black">
                    <Hash size={12} />
                    MCI:{message.mci}
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton 
                      text={message.ipfs} 
                      variant="minimal" 
                      className={`font-mono text-xs font-bold uppercase transition-colors ${
                        theme === 'dark'
                          ? 'text-red-600 hover:text-white'
                          : 'text-red-600 hover:text-black'
                      }`}>
                      [IPFS]
                    </CopyButton>
                    <CopyButton 
                      text={message.id} 
                      variant="minimal" 
                      className={`font-mono text-xs font-bold uppercase transition-colors ${
                        theme === 'dark'
                          ? 'text-red-600 hover:text-white'
                          : 'text-red-600 hover:text-black'
                      }`}>
                      [ID]
                    </CopyButton>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-center py-12">
            <div 
              onMouseEnter={() => setHoverStates(prev => ({ ...prev, loading: true }))}
              onMouseLeave={() => setHoverStates(prev => ({ ...prev, loading: false }))}
              className={`flex items-center gap-3 border-4 px-6 py-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${
              theme === 'dark'
                ? 'bg-black border-white'
                : 'bg-white border-black'
            }`}>
              <div className={`animate-spin h-6 w-6 border-4 ${
                theme === 'dark'
                  ? 'border-white border-t-red-600'
                  : 'border-black border-t-red-600'
              }`}></div>
              <span className={`font-mono font-bold uppercase tracking-wider ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}><ScrambleText externalHover={hoverStates.loading}>[[[LOADING_MORE]]]</ScrambleText></span>
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
