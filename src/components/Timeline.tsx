import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  ExternalLink,
  Settings,
  FileEdit,
  Trash2,
  Vote,
  Eye,
  Loader2,
} from 'lucide-react';
import type { SnapshotMessage } from '../types';
import { Modal } from './Modal';
import { IPFSContent } from './IPFSContent';
import { SettingsDiff } from './SettingsDiff';
import { ProposalDiff } from './ProposalDiff';
import { CopyButton } from './CopyButton';
import { ScrambleText } from './ScrambleText';

const TYPE_CONFIG = {
  proposal: {
    icon: Vote,
    label: 'New Proposal',
    dotClass: 'bg-emerald-500',
    borderClass: 'border-l-emerald-500',
    bgDark: 'bg-emerald-500/10',
    bgLight: 'bg-emerald-50',
    textDark: 'text-emerald-400',
    textLight: 'text-emerald-700',
  },
  settings: {
    icon: Settings,
    label: 'Settings Update',
    dotClass: 'bg-blue-500',
    borderClass: 'border-l-blue-500',
    bgDark: 'bg-blue-500/10',
    bgLight: 'bg-blue-50',
    textDark: 'text-blue-400',
    textLight: 'text-blue-700',
  },
  'delete-proposal': {
    icon: Trash2,
    label: 'Proposal Deleted',
    dotClass: 'bg-red-500',
    borderClass: 'border-l-red-500',
    bgDark: 'bg-red-500/10',
    bgLight: 'bg-red-50',
    textDark: 'text-red-400',
    textLight: 'text-red-700',
  },
  'update-proposal': {
    icon: FileEdit,
    label: 'Proposal Updated',
    dotClass: 'bg-amber-500',
    borderClass: 'border-l-amber-500',
    bgDark: 'bg-amber-500/10',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-400',
    textLight: 'text-amber-700',
  },
};

interface MonthGroup {
  key: string;
  month: string;
  year: string;
  label: string;
  messages: SnapshotMessage[];
}

interface TimelineProps {
  messages: SnapshotMessage[];
  loading: boolean;
  space: string;
  theme: 'light' | 'dark';
  showSpaceBadge?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({ messages, loading, space, theme, showSpaceBadge = false }) => {
  const [selectedIPFS, setSelectedIPFS] = useState<string | null>(null);
  const [selectedSettingsDiff, setSelectedSettingsDiff] = useState<SnapshotMessage | null>(null);
  const [selectedProposalDiff, setSelectedProposalDiff] = useState<SnapshotMessage | null>(null);
  const [hoverStates, setHoverStates] = useState<Record<string, boolean>>({});

  const isDark = theme === 'dark';

  // Group messages by month/year
  const monthGroups = useMemo(() => {
    const groups: MonthGroup[] = [];
    let currentKey = '';

    messages.forEach(msg => {
      const date = new Date(msg.timestamp * 1000);
      const key = format(date, 'MMM yyyy');

      if (key !== currentKey) {
        currentKey = key;
        groups.push({
          key,
          month: format(date, 'MMM'),
          year: format(date, 'yyyy'),
          label: key,
          messages: [msg],
        });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [messages]);

  const getProposalUrl = (message: SnapshotMessage) => {
    const s = message.space || space;
    if (message.type === 'proposal' && s) {
      return `https://snapshot.box/#/s:${s.toLowerCase()}/proposal/${message.id}`;
    }
    return null;
  };

  if (messages.length === 0 && !loading) {
    return (
      <div className={`text-center py-20 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className={`w-16 h-16 mx-auto mb-4 border-2 flex items-center justify-center ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <Loader2 className="w-6 h-6 opacity-30" />
        </div>
        <p className="font-mono text-sm uppercase tracking-widest">
          No timeline data yet
        </p>
        <p className="font-mono text-xs mt-1 opacity-60">
          Enter a space name or browse all events
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      {/* Right timeline rail - continuous vertical line */}
      {monthGroups.length > 0 && (
        <div className={`hidden md:block absolute right-[22px] top-4 bottom-0 w-px ${
          isDark ? 'bg-zinc-800' : 'bg-zinc-200'
        }`} />
      )}

      {monthGroups.map((group, groupIdx) => {
        const isNewYear = groupIdx === 0 || group.year !== monthGroups[groupIdx - 1].year;

        return (
          <div key={group.key} className="relative md:pr-16">
            {/* Right rail marker */}
            <div className={`hidden md:flex absolute right-0 flex-col items-center w-11 ${
              groupIdx === 0 ? 'top-0' : 'top-5'
            }`}>
              <div className={`w-3 h-3 rounded-full shrink-0 z-10 border-2 ${
                isNewYear
                  ? 'bg-red-600 border-red-500'
                  : isDark ? 'bg-zinc-900 border-zinc-500' : 'bg-white border-zinc-400'
              }`} />
              {isNewYear ? (
                <span className={`font-mono text-[11px] font-bold mt-1 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-600'
                }`}>{group.year}</span>
              ) : (
                <span className={`font-mono text-[10px] mt-0.5 ${
                  isDark ? 'text-zinc-600' : 'text-zinc-400'
                }`}>{group.month}</span>
              )}
            </div>

            {/* Month/year section header */}
            <div className={`flex items-baseline gap-3 mb-3 ${groupIdx > 0 ? 'pt-5' : ''}`}>
              <h3
                className={`text-base font-black uppercase tracking-tight whitespace-nowrap ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
              >
                {group.label}
              </h3>
              <div className={`flex-1 h-px ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
            </div>

            {/* Events */}
            <div className="space-y-3 pb-2">
              {group.messages.map((message) => {
                const config = TYPE_CONFIG[message.type];
                const Icon = config.icon;
                const proposalUrl = getProposalUrl(message);

                return (
                  <div
                    key={`${message.id}-${message.timestamp}`}
                    className={`group border-2 border-l-[6px] ${config.borderClass} transition-all duration-100 hover:-translate-y-0.5 hover:shadow-md ${
                      isDark
                        ? `${config.bgDark} border-zinc-800 hover:border-zinc-700`
                        : `${config.bgLight} border-zinc-200 hover:border-zinc-300`
                    }`}
                  >
                    <div className="p-5">
                      {/* Top row: type + date */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className={`w-7 h-7 flex items-center justify-center ${config.dotClass}`}>
                            <Icon size={14} className="text-white" />
                          </div>
                          <span
                            onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`label-${message.id}`]: true }))}
                            onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`label-${message.id}`]: false }))}
                            className={`font-bold text-sm uppercase tracking-wide ${
                              isDark ? config.textDark : config.textLight
                            }`}
                            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                          >
                            <ScrambleText externalHover={hoverStates[`label-${message.id}`]}>{config.label}</ScrambleText>
                          </span>
                          {showSpaceBadge && message.space && (
                            <span className={`font-mono text-[11px] px-2 py-0.5 border ${
                              isDark ? 'border-zinc-700 text-zinc-400' : 'border-zinc-300 text-zinc-500'
                            }`}>
                              {message.space}
                            </span>
                          )}
                          {proposalUrl && (
                            <a
                              href={proposalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`snap-${message.id}`]: true }))}
                              onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`snap-${message.id}`]: false }))}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold uppercase bg-red-600 text-white transition-all duration-100 hover:-translate-y-0.5"
                            >
                              <ScrambleText externalHover={hoverStates[`snap-${message.id}`]}>Snapshot</ScrambleText>
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                        <div className={`text-right font-mono text-xs shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          <div className="font-bold">{format(message.timestamp * 1000, 'MMM d, yyyy')}</div>
                          <div>{format(message.timestamp * 1000, 'HH:mm:ss')}</div>
                        </div>
                      </div>

                      {/* Actions row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <a
                          href={`https://4everland.io/ipfs/${message.ipfs}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`ipfs-${message.id}`]: true }))}
                          onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`ipfs-${message.id}`]: false }))}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono font-bold uppercase bg-red-600 text-white transition-all duration-100 hover:-translate-y-0.5"
                        >
                          <ExternalLink size={11} />
                          <ScrambleText externalHover={hoverStates[`ipfs-${message.id}`]}>IPFS</ScrambleText>
                        </a>
                        <button
                          onClick={() => setSelectedIPFS(message.ipfs)}
                          onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`view-${message.id}`]: true }))}
                          onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`view-${message.id}`]: false }))}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono font-bold uppercase border-2 transition-all duration-100 hover:-translate-y-0.5 ${
                            isDark
                              ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                              : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-black'
                          }`}
                        >
                          <Eye size={11} />
                          <ScrambleText externalHover={hoverStates[`view-${message.id}`]}>View</ScrambleText>
                        </button>
                        {message.type === 'settings' && (
                          <button
                            onClick={() => setSelectedSettingsDiff(message)}
                            onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`diff-${message.id}`]: true }))}
                            onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`diff-${message.id}`]: false }))}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono font-bold uppercase border-2 transition-all duration-100 hover:-translate-y-0.5 ${
                              isDark
                                ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                                : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-black'
                            }`}
                          >
                            <FileEdit size={11} />
                            <ScrambleText externalHover={hoverStates[`diff-${message.id}`]}>Diff</ScrambleText>
                          </button>
                        )}
                        {message.type === 'update-proposal' && (
                          <button
                            onClick={() => setSelectedProposalDiff(message)}
                            onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`diff-${message.id}`]: true }))}
                            onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`diff-${message.id}`]: false }))}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono font-bold uppercase border-2 transition-all duration-100 hover:-translate-y-0.5 ${
                              isDark
                                ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                                : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-black'
                            }`}
                          >
                            <FileEdit size={11} />
                            <ScrambleText externalHover={hoverStates[`diff-${message.id}`]}>Diff</ScrambleText>
                          </button>
                        )}

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Metadata */}
                        <span className={`font-mono text-[10px] uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          MCI:{message.mci}
                        </span>
                        <CopyButton
                          text={message.ipfs}
                          variant="minimal"
                          className={`font-mono text-[10px] font-bold uppercase transition-colors ${
                            isDark ? 'text-zinc-600 hover:text-red-500' : 'text-zinc-400 hover:text-red-600'
                          }`}
                          size={10}
                        >
                          IPFS
                        </CopyButton>
                        <CopyButton
                          text={message.id}
                          variant="minimal"
                          className={`font-mono text-[10px] font-bold uppercase transition-colors ${
                            isDark ? 'text-zinc-600 hover:text-red-500' : 'text-zinc-400 hover:text-red-600'
                          }`}
                          size={10}
                        >
                          ID
                        </CopyButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {loading && (
        <div className="flex justify-center py-8">
          <div className={`flex items-center gap-3 px-5 py-3 border-2 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            <Loader2 className="animate-spin h-4 w-4 text-red-600" />
            <span className={`font-mono text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Loading...
            </span>
          </div>
        </div>
      )}

      <Modal isOpen={!!selectedIPFS} onClose={() => setSelectedIPFS(null)}>
        {selectedIPFS && <IPFSContent ipfsHash={selectedIPFS} />}
      </Modal>

      <Modal isOpen={!!selectedSettingsDiff} onClose={() => setSelectedSettingsDiff(null)}>
        {selectedSettingsDiff && (
          <SettingsDiff currentMessage={selectedSettingsDiff} space={selectedSettingsDiff.space || space} />
        )}
      </Modal>

      <Modal isOpen={!!selectedProposalDiff} onClose={() => setSelectedProposalDiff(null)}>
        {selectedProposalDiff && (
          <ProposalDiff currentMessage={selectedProposalDiff} space={selectedProposalDiff.space || space} />
        )}
      </Modal>
    </div>
  );
};
