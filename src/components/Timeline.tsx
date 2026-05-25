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
  Search,
  UserPlus,
  UserMinus,
  Bell,
  BellOff,
  Link2,
  Link2Off,
  User,
  MessageSquare,
  Flag,
  XCircle,
} from 'lucide-react';
import type { SnapshotMessage, SnapshotMessageType } from '../types';
import { IPFS_GATEWAY } from '../constants';
import { Modal } from './Modal';
import { IPFSContent } from './IPFSContent';
import { SettingsDiff } from './SettingsDiff';
import { ProposalDiff } from './ProposalDiff';
import { ProposalDetailView } from './ProposalDetailView';
import { CopyButton } from './CopyButton';
import { ScrambleText } from './ScrambleText';

type TypeConfig = {
  icon: typeof Vote;
  label: string;
  dotClass: string;
  borderClass: string;
  bgDark: string;
  bgLight: string;
  textDark: string;
  textLight: string;
};

const TYPE_CONFIG: Record<SnapshotMessageType, TypeConfig> = {
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
  vote: {
    icon: Vote,
    label: 'Vote Cast',
    dotClass: 'bg-violet-500',
    borderClass: 'border-l-violet-500',
    bgDark: 'bg-violet-500/10',
    bgLight: 'bg-violet-50',
    textDark: 'text-violet-400',
    textLight: 'text-violet-700',
  },
  follow: {
    icon: UserPlus,
    label: 'Space Followed',
    dotClass: 'bg-sky-500',
    borderClass: 'border-l-sky-500',
    bgDark: 'bg-sky-500/10',
    bgLight: 'bg-sky-50',
    textDark: 'text-sky-400',
    textLight: 'text-sky-700',
  },
  unfollow: {
    icon: UserMinus,
    label: 'Space Unfollowed',
    dotClass: 'bg-zinc-500',
    borderClass: 'border-l-zinc-500',
    bgDark: 'bg-zinc-500/10',
    bgLight: 'bg-zinc-100',
    textDark: 'text-zinc-400',
    textLight: 'text-zinc-700',
  },
  subscribe: {
    icon: Bell,
    label: 'Subscribed',
    dotClass: 'bg-indigo-500',
    borderClass: 'border-l-indigo-500',
    bgDark: 'bg-indigo-500/10',
    bgLight: 'bg-indigo-50',
    textDark: 'text-indigo-400',
    textLight: 'text-indigo-700',
  },
  unsubscribe: {
    icon: BellOff,
    label: 'Unsubscribed',
    dotClass: 'bg-stone-500',
    borderClass: 'border-l-stone-500',
    bgDark: 'bg-stone-500/10',
    bgLight: 'bg-stone-100',
    textDark: 'text-stone-400',
    textLight: 'text-stone-700',
  },
  alias: {
    icon: Link2,
    label: 'Alias Added',
    dotClass: 'bg-fuchsia-500',
    borderClass: 'border-l-fuchsia-500',
    bgDark: 'bg-fuchsia-500/10',
    bgLight: 'bg-fuchsia-50',
    textDark: 'text-fuchsia-400',
    textLight: 'text-fuchsia-700',
  },
  'revoke-alias': {
    icon: Link2Off,
    label: 'Alias Revoked',
    dotClass: 'bg-pink-500',
    borderClass: 'border-l-pink-500',
    bgDark: 'bg-pink-500/10',
    bgLight: 'bg-pink-50',
    textDark: 'text-pink-400',
    textLight: 'text-pink-700',
  },
  profile: {
    icon: User,
    label: 'Profile Updated',
    dotClass: 'bg-teal-500',
    borderClass: 'border-l-teal-500',
    bgDark: 'bg-teal-500/10',
    bgLight: 'bg-teal-50',
    textDark: 'text-teal-400',
    textLight: 'text-teal-700',
  },
  statement: {
    icon: MessageSquare,
    label: 'Statement Posted',
    dotClass: 'bg-cyan-500',
    borderClass: 'border-l-cyan-500',
    bgDark: 'bg-cyan-500/10',
    bgLight: 'bg-cyan-50',
    textDark: 'text-cyan-400',
    textLight: 'text-cyan-700',
  },
  'flag-proposal': {
    icon: Flag,
    label: 'Proposal Flagged',
    dotClass: 'bg-orange-500',
    borderClass: 'border-l-orange-500',
    bgDark: 'bg-orange-500/10',
    bgLight: 'bg-orange-50',
    textDark: 'text-orange-400',
    textLight: 'text-orange-700',
  },
  'delete-space': {
    icon: XCircle,
    label: 'Space Deleted',
    dotClass: 'bg-rose-600',
    borderClass: 'border-l-rose-600',
    bgDark: 'bg-rose-600/10',
    bgLight: 'bg-rose-50',
    textDark: 'text-rose-400',
    textLight: 'text-rose-700',
  },
};

const UNKNOWN_TYPE_CONFIG: TypeConfig = {
  icon: Vote,
  label: 'Event',
  dotClass: 'bg-zinc-500',
  borderClass: 'border-l-zinc-500',
  bgDark: 'bg-zinc-500/10',
  bgLight: 'bg-zinc-100',
  textDark: 'text-zinc-400',
  textLight: 'text-zinc-700',
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
  onSpaceClick?: (spaceId: string) => void;
  onAddressClick?: (address: string) => void;
  hasData?: boolean; // true when raw (unfiltered) messages exist
}

export const Timeline: React.FC<TimelineProps> = ({
  messages, loading, space, theme, showSpaceBadge = false, onSpaceClick, onAddressClick, hasData = false,
}) => {
  const [selectedIPFS, setSelectedIPFS] = useState<string | null>(null);
  const [selectedSettingsDiff, setSelectedSettingsDiff] = useState<SnapshotMessage | null>(null);
  const [selectedProposalDiff, setSelectedProposalDiff] = useState<SnapshotMessage | null>(null);
  const [selectedProposalDetail, setSelectedProposalDetail] = useState<{ id: string; space: string } | null>(null);
  const [hoverStates, setHoverStates] = useState<Record<string, boolean>>({});

  const isDark = theme === 'dark';

  const hover = (key: string, value: boolean) =>
    setHoverStates(prev => ({ ...prev, [key]: value }));

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
    if (message.type === 'vote' && s && message.proposalId) {
      return `https://snapshot.box/#/s:${s.toLowerCase()}/proposal/${message.proposalId}`;
    }
    return null;
  };

  const hasDiff = (type: string) => type === 'settings' || type === 'update-proposal';

  const handleDiffClick = (message: SnapshotMessage) => {
    if (message.type === 'settings') {
      setSelectedSettingsDiff(message);
    } else if (message.type === 'update-proposal') {
      setSelectedProposalDiff(message);
    }
  };

  const canOpenDetail = (type: string) => type === 'proposal' || type === 'update-proposal' || type === 'vote';

  const truncateAddress = (address: string) =>
    address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;

  const handleProposalClick = (message: SnapshotMessage) => {
    const s = message.space || space;
    if (s) {
      const proposalId = message.type === 'vote' ? message.proposalId : message.id;
      if (!proposalId) {
        return;
      }

      setSelectedProposalDetail({ id: proposalId, space: s });
    }
  };

  // Empty state: no messages and not loading
  if (messages.length === 0 && !loading) {
    // If raw data exists but filters excluded everything
    if (hasData) {
      return (
        <div className={`text-center py-16 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          <div className={`w-16 h-16 mx-auto mb-4 border-2 border-dashed flex items-center justify-center ${
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          }`}>
            <Search className="w-6 h-6 opacity-30" />
          </div>
          <p className="font-mono text-sm uppercase tracking-widest">
            No events match selected filters
          </p>
          <p className="font-mono text-xs mt-1 opacity-60">
            Try selecting different event types above
          </p>
        </div>
      );
    }
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
        <div className={`hidden md:block absolute right-5.5 top-4 bottom-0 w-px ${
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
                const config = TYPE_CONFIG[message.type] ?? UNKNOWN_TYPE_CONFIG;
                const Icon = config.icon;
                const proposalUrl = getProposalUrl(message);
                const clickable = canOpenDetail(message.type);

                return (
                  <div
                    key={`${message.id}-${message.timestamp}`}
                    className={`group border-2 border-l-[6px] ${config.borderClass} transition-all duration-100 hover:-translate-y-0.5 hover:shadow-md ${
                      clickable ? 'cursor-pointer' : ''
                    } ${
                      isDark
                        ? `${config.bgDark} border-zinc-800 hover:border-zinc-700`
                        : `${config.bgLight} border-zinc-200 hover:border-zinc-300`
                    }`}
                    onClick={clickable ? () => handleProposalClick(message) : undefined}
                  >
                    <div className="p-5">
                      {/* Top row: type + date */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className={`w-7 h-7 flex items-center justify-center ${config.dotClass}`}>
                            <Icon size={14} className="text-white" />
                          </div>
                          <span
                            onMouseEnter={() => hover(`label-${message.id}`, true)}
                            onMouseLeave={() => hover(`label-${message.id}`, false)}
                            className={`font-bold text-sm uppercase tracking-wide ${
                              isDark ? config.textDark : config.textLight
                            }`}
                            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                          >
                            <ScrambleText externalHover={hoverStates[`label-${message.id}`]}>{config.label}</ScrambleText>
                          </span>
                          {message.address && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                onAddressClick?.(message.address!);
                              }}
                              className={`font-mono text-[11px] px-2 py-0.5 border cursor-pointer transition-all duration-100 hover:-translate-y-0.5 ${
                                isDark ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white' : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-black'
                              }`}
                            >
                              By {truncateAddress(message.address)}
                            </button>
                          )}
                          {showSpaceBadge && message.space && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSpaceClick?.(message.space!);
                              }}
                              className={`font-mono text-[11px] px-2 py-0.5 border cursor-pointer transition-all duration-100 hover:-translate-y-0.5 ${
                                isDark ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white' : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-black'
                              }`}
                            >
                              {message.space}
                            </button>
                          )}
                          {message.type === 'vote' && message.proposalTitle && (
                            <span className={`font-mono text-[11px] truncate max-w-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                              {message.proposalTitle}
                            </span>
                          )}
                          {proposalUrl && (
                            <a
                              href={proposalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              onMouseEnter={() => hover(`snap-${message.id}`, true)}
                              onMouseLeave={() => hover(`snap-${message.id}`, false)}
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
                      <div className="flex flex-wrap items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                        {message.ipfs && (
                          <>
                            <a
                              href={`${IPFS_GATEWAY}/${message.ipfs}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onMouseEnter={() => hover(`ipfs-${message.id}`, true)}
                              onMouseLeave={() => hover(`ipfs-${message.id}`, false)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono font-bold uppercase bg-red-600 text-white transition-all duration-100 hover:-translate-y-0.5"
                            >
                              <ExternalLink size={11} />
                              <ScrambleText externalHover={hoverStates[`ipfs-${message.id}`]}>IPFS</ScrambleText>
                            </a>
                            <button
                              onClick={() => setSelectedIPFS(message.ipfs)}
                              onMouseEnter={() => hover(`view-${message.id}`, true)}
                              onMouseLeave={() => hover(`view-${message.id}`, false)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono font-bold uppercase border-2 transition-all duration-100 hover:-translate-y-0.5 ${
                                isDark
                                  ? 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                                  : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-black'
                              }`}
                            >
                              <Eye size={11} />
                              <ScrambleText externalHover={hoverStates[`view-${message.id}`]}>View</ScrambleText>
                            </button>
                          </>
                        )}
                        {hasDiff(message.type) && (
                          <button
                            onClick={() => handleDiffClick(message)}
                            onMouseEnter={() => hover(`diff-${message.id}`, true)}
                            onMouseLeave={() => hover(`diff-${message.id}`, false)}
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

                        {message.type === 'vote' && (
                          <span className={`font-mono text-[10px] uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            VP:{(message.voteVp || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        )}

                        {/* Metadata */}
                        {message.type !== 'vote' && (
                          <span className={`font-mono text-[10px] uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            MCI:{message.mci}
                          </span>
                        )}
                        {message.ipfs && (
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
                        )}
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

      <Modal isOpen={!!selectedProposalDetail} onClose={() => setSelectedProposalDetail(null)}>
        {selectedProposalDetail && (
          <ProposalDetailView proposalId={selectedProposalDetail.id} space={selectedProposalDetail.space} />
        )}
      </Modal>
    </div>
  );
};
