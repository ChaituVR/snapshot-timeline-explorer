import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  ExternalLink,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  GitCompare,
  FileEdit,
  Vote,
  Loader2,
  Copy,
  Check,
  BarChart3,
  History,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';
import { fetchProposalDetail, fetchProposalVotes, fetchProposalHistory } from '../api';
import { IPFS_GATEWAY, DIFF_EDITOR_OPTIONS } from '../constants';
import type { ProposalDetail, VoteDetail, SnapshotMessage } from '../types';

interface ProposalDetailViewProps {
  proposalId: string;
  space: string;
}

const STATE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  closed: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
};

const truncateAddress = (addr: string) =>
  addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatChoice = (choice: any, choices: string[]): string => {
  if (typeof choice === 'number') {
    return choices[choice - 1] || `Choice ${choice}`;
  }
  if (Array.isArray(choice)) {
    return choice.map(c => choices[c - 1] || `Choice ${c}`).join(', ');
  }
  if (typeof choice === 'object' && choice !== null) {
    return Object.entries(choice)
      .map(([k, v]) => `${choices[parseInt(k) - 1] || `Choice ${k}`}: ${v}%`)
      .join(', ');
  }
  return String(choice);
};

export const ProposalDetailView: React.FC<ProposalDetailViewProps> = ({ proposalId, space }) => {
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [votes, setVotes] = useState<VoteDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [votesLoading, setVotesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreVotes, setHasMoreVotes] = useState(true);
  const [showBody, setShowBody] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'votes' | 'history'>('votes');
  const [voteSortBy, setVoteSortBy] = useState<'vp' | 'created'>('vp');
  const [voteSortDir, setVoteSortDir] = useState<'desc' | 'asc'>('desc');

  // Diff history state
  const [historyMessages, setHistoryMessages] = useState<SnapshotMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [historyContents, setHistoryContents] = useState<Record<string, any>>({});
  const [selectedDiffPair, setSelectedDiffPair] = useState<[number, number] | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const detailRes = await fetchProposalDetail(proposalId);

        if (!detailRes?.proposal) {
          throw new Error('Proposal not found');
        }

        setProposal(detailRes.proposal);

        try {
          const votesRes = await fetchProposalVotes(proposalId, 20, 0);
          setVotes(votesRes.votes);
          if (votesRes.votes.length < 20) {
            setHasMoreVotes(false);
          }
        } catch {
          setVotes([]);
          setHasMoreVotes(false);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [proposalId]);

  // Re-fetch votes when sort changes
  useEffect(() => {
    if (!proposal) return;
    const refetch = async () => {
      setVotesLoading(true);
      try {
        const res = await fetchProposalVotes(proposalId, 20, 0, voteSortBy, voteSortDir);
        setVotes(res.votes);
        setHasMoreVotes(res.votes.length >= 20);
      } catch { /* ignore */ } finally {
        setVotesLoading(false);
      }
    };
    refetch();
  }, [voteSortBy, voteSortDir, proposalId, proposal]);

  // Load diff history when tab switches
  useEffect(() => {
    if (activeTab !== 'history' || historyMessages.length > 0 || historyLoading) return;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await fetchProposalHistory(space, proposalId);
        setHistoryMessages(res.messages);
        // Pre-fetch IPFS content for all revisions
        const contents: Record<string, unknown> = {};
        await Promise.all(
          res.messages.map(async (msg) => {
            try {
              const resp = await fetch(`${IPFS_GATEWAY}/${msg.ipfs}`);
              if (resp.ok) {
                const data = await resp.json();
                contents[msg.ipfs] = data.data?.message || data;
              }
            } catch { /* skip failed fetches */ }
          })
        );
        setHistoryContents(contents);
        // Auto-select first diff pair if there are updates
        if (res.messages.length >= 2) {
          setSelectedDiffPair([0, 1]);
        }
      } catch { /* ignore */ } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [activeTab, historyMessages.length, historyLoading, space, proposalId]);

  const loadMoreVotes = useCallback(async () => {
    if (votesLoading || !hasMoreVotes) return;
    setVotesLoading(true);
    try {
      const res = await fetchProposalVotes(proposalId, 20, votes.length, voteSortBy, voteSortDir);
      setVotes(prev => [...prev, ...res.votes]);
      if (res.votes.length < 20) setHasMoreVotes(false);
    } catch { /* ignore */ } finally {
      setVotesLoading(false);
    }
  }, [proposalId, votes.length, votesLoading, hasMoreVotes, voteSortBy, voteSortDir]);

  const toggleSort = (col: 'vp' | 'created') => {
    if (voteSortBy === col) {
      setVoteSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setVoteSortBy(col);
      setVoteSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: 'vp' | 'created' }) => {
    if (voteSortBy !== col) return <ArrowUpDown size={10} className="opacity-40" />;
    return voteSortDir === 'desc'
      ? <ArrowDown size={10} className="text-red-500" />
      : <ArrowUp size={10} className="text-red-500" />;
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-4" />
        <p className="text-zinc-500 font-mono text-sm uppercase tracking-wider">Loading proposal...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <h3 className="text-base font-bold text-red-400 mb-1 font-mono uppercase">Failed to Load</h3>
        <p className="text-red-500 text-sm font-mono">{error}</p>
      </div>
    );
  }

  const stateStyle = STATE_COLORS[proposal.state] || STATE_COLORS.closed;
  const totalScores = proposal.scores_total || proposal.scores?.reduce((a, b) => a + b, 0) || 0;
  const now = Math.floor(Date.now() / 1000);
  const isActive = proposal.state === 'active';
  const timeLeft = isActive ? proposal.end - now : 0;
  const timeLeftStr = timeLeft > 86400
    ? `${Math.floor(timeLeft / 86400)}d left`
    : timeLeft > 3600
      ? `${Math.floor(timeLeft / 3600)}h left`
      : timeLeft > 0
        ? `${Math.floor(timeLeft / 60)}m left`
        : '';

  return (
    <div className="max-w-none space-y-0">
      {/* Header */}
      <div className="pb-5 border-b border-zinc-700/50">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase border ${stateStyle.bg} ${stateStyle.text} ${stateStyle.border}`}>
                {proposal.state}
              </span>
              {proposal.type && (
                <span className="px-2 py-0.5 text-[11px] font-mono text-zinc-500 border border-zinc-700">
                  {proposal.type}
                </span>
              )}
              {timeLeftStr && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                  <Clock size={10} />
                  {timeLeftStr}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight leading-tight mb-2"
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              {proposal.title}
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 flex-wrap">
              <button
                onClick={() => handleCopy(proposal.author, 'author')}
                className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
              >
                by {truncateAddress(proposal.author)}
                {copied === 'author' ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
              </button>
              <span className="text-zinc-700">|</span>
              <span>{format(proposal.created * 1000, 'MMM d, yyyy HH:mm')}</span>
              {proposal.space && (
                <>
                  <span className="text-zinc-700">|</span>
                  <span className="text-zinc-400">{proposal.space.name || proposal.space.id}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-xs font-mono">
            <Users size={12} className="text-zinc-400" />
            <span className="text-white font-bold">{proposal.votes?.toLocaleString() || 0}</span>
            <span className="text-zinc-500">votes</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-xs font-mono">
            <BarChart3 size={12} className="text-zinc-400" />
            <span className="text-white font-bold">{totalScores.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className="text-zinc-500">{proposal.symbol || 'VP'}</span>
          </div>
          {proposal.quorum > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-xs font-mono">
              <span className="text-zinc-500">Quorum</span>
              <span className={`font-bold ${totalScores >= proposal.quorum ? 'text-emerald-400' : 'text-amber-400'}`}>
                {Math.round((totalScores / proposal.quorum) * 100)}%
              </span>
            </div>
          )}
          <a
            href={`https://snapshot.box/#/s:${(proposal.space?.id || space).toLowerCase()}/proposal/${proposal.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-mono font-bold uppercase transition-all hover:-translate-y-0.5"
          >
            Snapshot <ExternalLink size={10} />
          </a>
        </div>
      </div>

      {/* Choices & Scores */}
      {proposal.choices && proposal.choices.length > 0 && (
        <div className="py-5 border-b border-zinc-700/50">
          <div className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-3">Results</div>
          <div className="space-y-2">
            {proposal.choices.map((choice, idx) => {
              const score = proposal.scores?.[idx] || 0;
              const pct = totalScores > 0 ? (score / totalScores) * 100 : 0;
              const isWinning = proposal.scores && score === Math.max(...proposal.scores);
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono text-sm ${isWinning ? 'text-white font-bold' : 'text-zinc-400'}`}>
                      {choice}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-zinc-500">
                        {score.toLocaleString(undefined, { maximumFractionDigits: 0 })} {proposal.symbol || 'VP'}
                      </span>
                      <span className={`font-mono text-xs font-bold min-w-12 text-right ${isWinning ? 'text-white' : 'text-zinc-400'}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${isWinning ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Body toggle */}
      {proposal.body && (
        <div className="py-5 border-b border-zinc-700/50">
          <button
            onClick={() => setShowBody(!showBody)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <MessageSquare size={12} />
            {showBody ? 'Hide' : 'Show'} Description
            {showBody ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showBody && (
            <div className="mt-3 p-4 bg-zinc-800/50 border border-zinc-700/50 font-mono text-sm text-zinc-300 leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap wrap-break-word">
              {proposal.body}
            </div>
          )}
        </div>
      )}

      {/* Tabs: Votes | Diff History */}
      <div className="pt-5">
        <div className="flex gap-0 mb-4">
          <button
            onClick={() => setActiveTab('votes')}
            className={`px-4 py-2 font-mono font-bold text-xs uppercase border-2 transition-all duration-100 ${
              activeTab === 'votes'
                ? 'bg-red-600 border-red-600 text-white'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
            }`}
          >
            <Vote size={12} className="inline mr-1.5 -mt-0.5" />
            Votes ({proposal.votes || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-mono font-bold text-xs uppercase border-2 border-l-0 transition-all duration-100 ${
              activeTab === 'history'
                ? 'bg-red-600 border-red-600 text-white'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
            }`}
          >
            <History size={12} className="inline mr-1.5 -mt-0.5" />
            Diff History
          </button>
        </div>

        {/* Votes Tab */}
        {activeTab === 'votes' && (
          <div>
            {votes.length === 0 ? (
              <div className="text-center py-10 text-zinc-600 font-mono text-sm uppercase">
                No votes recorded yet
              </div>
            ) : (
              <div className="space-y-1">
                {/* Votes header */}
                <div className="flex items-center px-3 py-2 text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wider">
                  <div className="flex-1">Voter</div>
                  <div className="w-36 text-right hidden sm:block">Choice</div>
                  <button
                    onClick={() => toggleSort('created')}
                    className="w-28 text-right flex items-center justify-end gap-1 hover:text-zinc-400 transition-colors cursor-pointer"
                  >
                    Time <SortIcon col="created" />
                  </button>
                  <button
                    onClick={() => toggleSort('vp')}
                    className="w-24 text-right flex items-center justify-end gap-1 hover:text-zinc-400 transition-colors cursor-pointer"
                  >
                    VP <SortIcon col="vp" />
                  </button>
                </div>
                {votes.map((vote) => (
                  <div
                    key={vote.id}
                    className="flex items-center px-3 py-2.5 bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleCopy(vote.voter, `voter-${vote.id}`)}
                        className="font-mono text-sm text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
                      >
                        {truncateAddress(vote.voter)}
                        {copied === `voter-${vote.id}`
                          ? <Check size={10} className="text-green-400" />
                          : <Copy size={10} className="opacity-0 group-hover:opacity-50" />
                        }
                      </button>
                      {vote.reason && (
                        <div className="text-xs text-zinc-600 mt-0.5 truncate max-w-xs" title={vote.reason}>
                          "{vote.reason}"
                        </div>
                      )}
                    </div>
                    <div className="w-36 text-right hidden sm:block">
                      <span className="font-mono text-xs text-zinc-400 truncate inline-block max-w-full">
                        {formatChoice(vote.choice, proposal.choices)}
                      </span>
                    </div>
                    <div className="w-28 text-right">
                      <span className="font-mono text-[10px] text-zinc-500" title={format(vote.created * 1000, 'MMM d, yyyy HH:mm:ss')}>
                        {format(vote.created * 1000, 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div className="w-24 text-right">
                      <span className="font-mono text-xs text-white font-bold">
                        {vote.vp?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-600 ml-1">
                        {proposal.symbol || 'VP'}
                      </span>
                    </div>
                  </div>
                ))}
                {hasMoreVotes && (
                  <button
                    onClick={loadMoreVotes}
                    disabled={votesLoading}
                    className="w-full py-3 font-mono text-xs font-bold uppercase text-zinc-400 border border-zinc-700 border-dashed hover:text-white hover:border-zinc-500 transition-colors mt-2"
                  >
                    {votesLoading ? (
                      <Loader2 size={14} className="animate-spin inline mr-1" />
                    ) : null}
                    {votesLoading ? 'Loading...' : 'Load more votes'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Diff History Tab */}
        {activeTab === 'history' && (
          <div>
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-red-600 animate-spin mb-3" />
                <p className="text-zinc-500 font-mono text-xs uppercase">Loading revision history...</p>
              </div>
            ) : historyMessages.length < 2 ? (
              <div className="text-center py-10 text-zinc-600 font-mono text-sm uppercase">
                {historyMessages.length === 0
                  ? 'No revision history found'
                  : 'Only one version exists — no diffs to show'
                }
              </div>
            ) : (
              <div className="space-y-4">
                {/* Revision timeline */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {historyMessages.map((msg, idx) => {
                    const isOriginal = msg.type === 'proposal';
                    const isPartOfSelection = selectedDiffPair &&
                      (idx === selectedDiffPair[0] || idx === selectedDiffPair[1]);
                    return (
                      <React.Fragment key={msg.ipfs}>
                        <button
                          onClick={() => {
                            if (!selectedDiffPair) {
                              if (idx > 0) setSelectedDiffPair([idx - 1, idx]);
                            } else if (idx === selectedDiffPair[0]) {
                              // Clicked left side, keep right, shift left
                              if (idx > 0) setSelectedDiffPair([idx - 1, selectedDiffPair[1]]);
                            } else if (idx === selectedDiffPair[1]) {
                              // Clicked right side, keep left, shift right
                              if (idx < historyMessages.length - 1) setSelectedDiffPair([selectedDiffPair[0], idx + 1]);
                            } else {
                              // Click a new node - compare with previous
                              const left = Math.max(0, idx - 1);
                              setSelectedDiffPair([left, idx]);
                            }
                          }}
                          className={`shrink-0 px-3 py-2 border-2 font-mono text-[11px] uppercase transition-all duration-100 hover:-translate-y-0.5 ${
                            isPartOfSelection
                              ? isOriginal
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-amber-600 border-amber-600 text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                          }`}
                        >
                          <div className="font-bold">
                            {isOriginal ? 'Original' : `v${idx + 1}`}
                          </div>
                          <div className="text-[9px] opacity-70 mt-0.5">
                            {format(msg.timestamp * 1000, 'MMM d, HH:mm')}
                          </div>
                        </button>
                        {idx < historyMessages.length - 1 && (
                          <ArrowRight size={12} className="shrink-0 text-zinc-700" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Diff viewer */}
                {selectedDiffPair && (
                  <div>
                    <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-2 border-b border-[#333]">
                      <div className="flex items-center gap-3">
                        <GitCompare className="w-4 h-4 text-[#75beff]" />
                        <span className="text-[#cccccc] font-mono text-sm">
                          {historyMessages[selectedDiffPair[0]].type === 'proposal' ? 'Original' : `v${selectedDiffPair[0] + 1}`}
                          {' → '}
                          v{selectedDiffPair[1] + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (selectedDiffPair[0] > 0) {
                              setSelectedDiffPair([selectedDiffPair[0] - 1, selectedDiffPair[1]]);
                            }
                          }}
                          disabled={selectedDiffPair[0] === 0}
                          className="px-2 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors disabled:opacity-30"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => {
                            if (selectedDiffPair[1] < historyMessages.length - 1) {
                              setSelectedDiffPair([selectedDiffPair[0] + 1, selectedDiffPair[1] + 1]);
                            }
                          }}
                          disabled={selectedDiffPair[1] >= historyMessages.length - 1}
                          className="px-2 py-1 text-xs font-mono text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors disabled:opacity-30"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                    <div className="flex bg-[#252526] border-x border-[#333]">
                      <div className="flex-1 px-4 py-1.5 text-[11px] font-mono text-red-400 border-r border-[#333] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                        {historyMessages[selectedDiffPair[0]].type === 'proposal' ? 'Original' : `Version ${selectedDiffPair[0] + 1}`}
                        <span className="text-zinc-600 ml-1">
                          ({format(historyMessages[selectedDiffPair[0]].timestamp * 1000, 'MMM d, HH:mm')})
                        </span>
                      </div>
                      <div className="flex-1 px-4 py-1.5 text-[11px] font-mono text-green-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                        Version {selectedDiffPair[1] + 1}
                        <span className="text-zinc-600 ml-1">
                          ({format(historyMessages[selectedDiffPair[1]].timestamp * 1000, 'MMM d, HH:mm')})
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden border border-[#333] border-t-0">
                      <DiffEditor
                        height="50vh"
                        language="json"
                        original={JSON.stringify(
                          historyContents[historyMessages[selectedDiffPair[0]].ipfs] || {},
                          null, 2
                        )}
                        modified={JSON.stringify(
                          historyContents[historyMessages[selectedDiffPair[1]].ipfs] || {},
                          null, 2
                        )}
                        theme="vs-dark"
                        keepCurrentOriginalModel={false}
                        keepCurrentModifiedModel={false}
                        options={DIFF_EDITOR_OPTIONS}
                        loading={
                          <div className="flex items-center justify-center h-[50vh] bg-[#1e1e1e]">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-600 border-t-[#75beff]"></div>
                          </div>
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline bar at bottom */}
      <div className="pt-5 mt-5 border-t border-zinc-700/50">
        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-600 uppercase tracking-wider flex-wrap">
          <span className="flex items-center gap-1">
            <FileEdit size={10} />
            Created {format(proposal.created * 1000, 'MMM d, yyyy')}
          </span>
          <span>
            Voting: {format(proposal.start * 1000, 'MMM d')} → {format(proposal.end * 1000, 'MMM d, yyyy')}
          </span>
          {proposal.discussion && (
            <a
              href={proposal.discussion}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Discussion <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
