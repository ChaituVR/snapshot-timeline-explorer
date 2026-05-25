import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Moon, Sun, Globe, Zap, Users, Link, Check, ShieldCheck } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { Timeline } from './components/Timeline';
import { ScrambleText } from './components/ScrambleText';
import { fetchMessages, fetchAllMessages, searchSpaces, fetchVotesByAddress, fetchVerifiedSpaceIds } from './api';
import { EVENT_TYPES } from './constants';
import type { SnapshotMessage, SpaceResult } from './types';
import 'react-day-picker/style.css';

type AppMode = 'space' | 'all' | 'address';

const parseHashToState = (): { mode: AppMode; space: string; address: string } | null => {
  const hash = window.location.hash;
  if (hash.startsWith('#/a:')) {
    const rest = hash.slice(4);
    const slashIdx = rest.indexOf('/s:');
    if (slashIdx !== -1) {
      return { mode: 'address', address: rest.slice(0, slashIdx), space: rest.slice(slashIdx + 3).replace(/\/$/, '') };
    }
    return { mode: 'address', address: rest.replace(/\/$/, ''), space: '' };
  }
  if (hash.startsWith('#/s:')) {
    return { mode: 'space', space: hash.slice(4).replace(/\/$/, ''), address: '' };
  }
  if (hash === '#/explore') {
    return { mode: 'all', space: '', address: '' };
  }
  return null;
};

const extractSpaceFromInput = (input: string): string => {
  const match = input.match(/snapshot\.(?:box|org)\/#\/s:([^/?\s]+)/);
  if (match) return match[1];
  const orgMatch = input.match(/snapshot\.org\/#\/([^/?\s]+)/);
  if (orgMatch) return orgMatch[1];
  return input;
};

function App() {
  const [space, setSpace] = useState('');
  const [messages, setMessages] = useState<SnapshotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...EVENT_TYPES]);
  const [hoverStates, setHoverStates] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<AppMode>('space');
  const [hasSearched, setHasSearched] = useState(false);
  const [spaceSuggestions, setSpaceSuggestions] = useState<SpaceResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [pendingAutoLoad, setPendingAutoLoad] = useState(false);
  const [addressFilter, setAddressFilter] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [verifiedSpaceIds, setVerifiedSpaceIds] = useState<Set<string> | null>(null);
  const [verifiedLoading, setVerifiedLoading] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);
  const lastTimestamp = useRef<number | undefined>(undefined);
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);
  const requestIdRef = useRef(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInternalHashUpdateRef = useRef(false);

  const resetTimeline = useCallback((opts?: { keepSearch?: boolean; clearDate?: boolean }) => {
    setMessages([]);
    setHasMore(true);
    lastTimestamp.current = undefined;
    setError(null);
    if (!opts?.keepSearch) setHasSearched(false);
    if (opts?.clearDate) setSelectedDate(undefined);
  }, []);

  const setHash = useCallback((hash: string) => {
    isInternalHashUpdateRef.current = true;
    window.location.hash = hash;
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Init from URL hash on mount + listen to back/forward navigation
  useEffect(() => {
    const parsed = parseHashToState();
    if (parsed) {
      setMode(parsed.mode);
      setSpace(parsed.space);
      setAddressFilter(parsed.address);
      setHasSearched(true);
      setHasMore(true);
      setPendingAutoLoad(true);
    }
    const handleHashChange = () => {
      if (isInternalHashUpdateRef.current) {
        isInternalHashUpdateRef.current = false;
        return;
      }
      const p = parseHashToState();
      if (p) {
        setMode(p.mode);
        setSpace(p.space);
        setAddressFilter(p.address);
        resetTimeline({ keepSearch: true });
        setHasSearched(true);
        setPendingAutoLoad(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [resetTimeline]);

  // Close calendar on outside click
  useEffect(() => {
    if (!showCalendar) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current && !calendarRef.current.contains(event.target as Node) &&
        calendarBtnRef.current && !calendarBtnRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  // Close suggestions on outside click
  useEffect(() => {
    if (!showSuggestions) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  // Debounced space search
  const handleSpaceInputChange = useCallback((value: string) => {
    const extracted = value.includes('snapshot.') ? extractSpaceFromInput(value) : value;
    setSpace(extracted);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (extracted.trim().length < 2) {
      setSpaceSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await searchSpaces(extracted.trim());
        setSpaceSuggestions(result.ranking.items);
        setShowSuggestions(result.ranking.items.length > 0);
      } catch {
        setSpaceSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
  }, []);

  const handleSpaceSelect = useCallback((selected: SpaceResult) => {
    setSpace(selected.id);
    setShowSuggestions(false);
    setSpaceSuggestions([]);
  }, []);

  const formatAvatar = (avatar: string) => {
    if (avatar?.startsWith('ipfs://')) {
      return avatar.replace('ipfs://', 'https://4everland.io/ipfs/');
    }
    return avatar;
  };

  const loadMessages = useCallback(async (isInitial = false, addressOverride?: string) => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);

      const timestamp = selectedDate ? Math.floor(selectedDate.getTime() / 1000) : undefined;
      const timestampCursor = isInitial ? timestamp : lastTimestamp.current;
      const activeAddress = (addressOverride ?? addressFilter).trim() || undefined;
      const pageSize = 10;

      // Server-side type filter: includes "vote" only when explicitly selected.
      // Votes still arrive enriched via the votes query for address mode; the messages
      // query supplements them when the user has the Votes pill active.
      const messageTypes = selectedTypes.length > 0 ? selectedTypes : undefined;

      let newEvents: SnapshotMessage[] = [];

      if (mode === 'address') {
        // Address mode: fetch votes (always) + messages for this address
        const spaceFilter = space.trim() || undefined;
        const wantVotes = selectedTypes.includes('vote');

        const [votesResponse, messagesResponse] = await Promise.all([
          wantVotes
            ? fetchVotesByAddress(activeAddress!, 25, 0, timestampCursor, spaceFilter)
            : Promise.resolve({ votes: [] }),
          spaceFilter
            ? fetchMessages(spaceFilter, 25, 0, timestampCursor, activeAddress, messageTypes)
            : fetchAllMessages(25, 0, timestampCursor, activeAddress, messageTypes),
        ]);

        if (requestId !== requestIdRef.current) return;

        const voteEvents: SnapshotMessage[] = votesResponse.votes.map(vote => ({
          id: vote.id,
          mci: 0,
          type: 'vote' as const,
          ipfs: vote.ipfs,
          timestamp: vote.created,
          space: vote.proposal?.space?.id,
          address: vote.voter,
          proposalId: vote.proposal?.id,
          proposalTitle: vote.proposal?.title,
          voteChoice: vote.choice,
          voteVp: vote.vp,
        }));

        // voteEvents first so enriched data (proposal title, choice) wins dedup
        // over the same vote returned by the messages query
        newEvents = [...voteEvents, ...messagesResponse.messages];
      } else {
        // Space or All mode
        const response = mode === 'all'
          ? await fetchAllMessages(25, 0, timestampCursor, activeAddress, messageTypes)
          : await fetchMessages(space, 25, 0, timestampCursor, activeAddress, messageTypes);

        if (requestId !== requestIdRef.current) return;

        newEvents = response.messages;

        if (activeAddress && selectedTypes.includes('vote')) {
          const spaceFilter = mode === 'space' ? space : undefined;
          const votesResponse = await fetchVotesByAddress(activeAddress, 25, 0, timestampCursor, spaceFilter);

          if (requestId !== requestIdRef.current) return;

          const voteEvents: SnapshotMessage[] = votesResponse.votes.map(vote => ({
            id: vote.id,
            mci: 0,
            type: 'vote' as const,
            ipfs: vote.ipfs,
            timestamp: vote.created,
            space: vote.proposal?.space?.id,
            address: vote.voter,
            proposalId: vote.proposal?.id,
            proposalTitle: vote.proposal?.title,
            voteChoice: vote.choice,
            voteVp: vote.vp,
          }));

          newEvents = [...voteEvents, ...newEvents];
        }
      }

      newEvents = newEvents
        .sort((a, b) => b.timestamp - a.timestamp)
        .filter((event, index, allEvents) =>
          allEvents.findIndex((item) => item.type === event.type && item.id === event.id && item.timestamp === event.timestamp) === index
        );

      const pagedEvents = newEvents.slice(0, pageSize);

      if (pagedEvents.length < pageSize) {
        setHasMore(false);
      }

      if (pagedEvents.length > 0) {
        lastTimestamp.current = pagedEvents[pagedEvents.length - 1].timestamp;
      }

      setMessages(prev => isInitial ? pagedEvents : [...prev, ...pagedEvents]);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [space, selectedDate, mode, addressFilter, selectedTypes]);

  // Auto-load after URL-driven state init
  useEffect(() => {
    if (!pendingAutoLoad) return;
    setPendingAutoLoad(false);
    loadMessages(true);
  }, [pendingAutoLoad, loadMessages]);

  const resetAndReload = useCallback(() => {
    if (!hasSearched) return;
    setMessages([]);
    setHasMore(true);
    lastTimestamp.current = undefined;
    setPendingAutoLoad(true);
  }, [hasSearched]);

  // Fetch the verified-space ID set once when the toggle is first turned on.
  useEffect(() => {
    if (!verifiedOnly || verifiedSpaceIds || verifiedLoading) return;
    setVerifiedLoading(true);
    fetchVerifiedSpaceIds()
      .then(ids => setVerifiedSpaceIds(new Set(ids)))
      .catch(() => setVerifiedSpaceIds(new Set()))
      .finally(() => setVerifiedLoading(false));
  }, [verifiedOnly, verifiedSpaceIds, verifiedLoading]);

  useEffect(() => {
    if (!hasSearched) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && selectedTypes.length > 0) {
          loadMessages();
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loading, loadMessages, selectedTypes, hasSearched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'space' && !space.trim()) return;
    if (mode === 'address' && !addressFilter.trim()) return;
    if (mode === 'space') {
      setHash(`/s:${space.trim()}`);
    } else if (mode === 'address') {
      const addr = addressFilter.trim();
      setHash(space.trim() ? `/a:${addr}/s:${space.trim()}` : `/a:${addr}`);
    }
    resetTimeline({ keepSearch: true });
    setHasSearched(true);
    await loadMessages(true);
  };

  const handleAllEvents = async () => {
    setHash('/explore');
    setMode('all');
    setSpace('');
    resetTimeline({ keepSearch: true });
    setHasSearched(true);
    setPendingAutoLoad(true);
  };

  const applyAddressFilter = useCallback(async (address: string) => {
    setAddressFilter(address);
    setMode('address');
    const currentSpace = space.trim();
    setHash(currentSpace ? `/a:${address}/s:${currentSpace}` : `/a:${address}`);
    resetTimeline({ keepSearch: true });
    setHasSearched(true);
    await loadMessages(true, address);
  }, [loadMessages, resetTimeline, space, setHash]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setShowCalendar(false);
    if (hasSearched) {
      setMessages([]);
      setHasMore(true);
      lastTimestamp.current = undefined;
      loadMessages(true);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // fallback for browsers without clipboard API
    }
  };

  const handleReset = () => {
    setHash('');
    setMode('space');
    setSpace('');
    setAddressFilter('');
    resetTimeline({ clearDate: true });
  };

  const hover = (key: string, value: boolean) =>
    setHoverStates(prev => ({ ...prev, [key]: value }));

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
      {/* Top bar */}
      <div className={`border-b-2 ${isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-zinc-200 bg-white/80'} backdrop-blur-sm sticky top-0 z-30`}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-3 cursor-pointer"
            onMouseEnter={() => hover('logo', true)}
            onMouseLeave={() => hover('logo', false)}
            onClick={handleReset}
          >
            <div className="w-8 h-8 bg-red-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className={`font-mono font-bold text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-black'}`}>
              <ScrambleText externalHover={hoverStates.logo}>SNAPSHOT EXPLORER</ScrambleText>
            </span>
          </button>
          <div className="flex items-center gap-2">
            {hasSearched && ((mode === 'space' && space) || mode === 'address') && (
              <button
                onClick={handleShare}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border-2 font-mono text-xs transition-all duration-100 hover:-translate-y-0.5 ${
                  shareCopied
                    ? 'bg-green-600 border-green-600 text-white'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-500 hover:text-black hover:border-zinc-400'
                }`}
                title="Copy link to this space"
              >
                <span className="hidden sm:inline max-w-35 truncate">{mode === 'address' ? `${addressFilter.slice(0, 6)}...${addressFilter.slice(-4)}` : space}</span>
                {shareCopied ? <Check size={12} /> : <Link size={12} />}
              </button>
            )}
            <button
              onClick={toggleTheme}
              className={`p-2 border-2 transition-all duration-100 hover:-translate-y-0.5 ${
                isDark
                  ? 'border-zinc-700 text-zinc-400 hover:text-white hover:border-white bg-zinc-900'
                  : 'border-zinc-300 text-zinc-600 hover:text-black hover:border-black bg-white'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 relative">
        {/* Hero */}
        <div className="mb-10">
          <h1
            onMouseEnter={() => hover('header', true)}
            onMouseLeave={() => hover('header', false)}
            className={`text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85] mb-4 ${isDark ? 'text-white' : 'text-black'}`}
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            <ScrambleText externalHover={hoverStates.header}>SNAPSHOT</ScrambleText><br/>
            <span className="text-red-600"><ScrambleText externalHover={hoverStates.header}>TIMELINE</ScrambleText></span>
          </h1>
          <p className={`font-mono text-sm uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Governance events explorer &mdash; proposals, settings, updates
          </p>
        </div>

        {/* Search Form */}
        <div className={`border-2 p-6 mb-8 transition-colors ${
          isDark
            ? 'bg-zinc-900 border-zinc-800'
            : 'bg-white border-zinc-200'
        }`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mode tabs */}
            <div className="flex gap-0">
              <button
                type="button"
                onClick={() => {
                  if (mode !== 'space') {
                    setMode('space');
                    setAddressFilter('');
                    resetTimeline();
                  }
                }}
                onMouseEnter={() => hover('tabSpace', true)}
                onMouseLeave={() => hover('tabSpace', false)}
                className={`px-4 py-2 font-mono font-bold text-xs uppercase border-2 transition-all duration-100 ${
                  mode === 'space'
                    ? 'bg-red-600 border-red-600 text-white'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-500 hover:text-black hover:border-zinc-400'
                }`}
              >
                <ScrambleText externalHover={hoverStates.tabSpace}>BY SPACE</ScrambleText>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mode !== 'all') {
                    setMode('all');
                    setAddressFilter('');
                    resetTimeline();
                  }
                }}
                onMouseEnter={() => hover('tabAll', true)}
                onMouseLeave={() => hover('tabAll', false)}
                className={`px-4 py-2 font-mono font-bold text-xs uppercase border-2 border-l-0 transition-all duration-100 ${
                  mode === 'all'
                    ? 'bg-red-600 border-red-600 text-white'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-500 hover:text-black hover:border-zinc-400'
                }`}
              >
                <ScrambleText externalHover={hoverStates.tabAll}>ALL EVENTS</ScrambleText>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mode !== 'address') {
                    setMode('address');
                    resetTimeline();
                  }
                }}
                onMouseEnter={() => hover('tabAddress', true)}
                onMouseLeave={() => hover('tabAddress', false)}
                className={`px-4 py-2 font-mono font-bold text-xs uppercase border-2 border-l-0 transition-all duration-100 ${
                  mode === 'address'
                    ? 'bg-red-600 border-red-600 text-white'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-500 hover:text-black hover:border-zinc-400'
                }`}
              >
                <ScrambleText externalHover={hoverStates.tabAddress}>BY ADDRESS</ScrambleText>
              </button>
            </div>

            {/* Input row */}
            <div className="flex gap-2">
              {mode === 'space' && (
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={space}
                    onChange={(e) => handleSpaceInputChange(e.target.value)}
                    onFocus={() => {
                      if (spaceSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    placeholder="e.g. ens.eth, aave.eth, kleros.eth"
                    className={`w-full px-4 py-3 border-2 outline-none font-mono text-sm transition-all duration-100 ${
                      isDark
                        ? 'bg-zinc-950 text-white placeholder-zinc-600 border-zinc-700 focus:border-red-600'
                        : 'bg-zinc-50 text-black placeholder-zinc-400 border-zinc-300 focus:border-red-600'
                    }`}
                  />
                  {loadingSuggestions && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                        isDark ? 'border-zinc-500' : 'border-zinc-400'
                      }`} />
                    </div>
                  )}
                  {showSuggestions && spaceSuggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className={`absolute left-0 right-0 top-full mt-1 border-2 z-50 max-h-80 overflow-y-auto shadow-lg ${
                        isDark
                          ? 'bg-zinc-900 border-zinc-700'
                          : 'bg-white border-zinc-300'
                      }`}
                    >
                      {spaceSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSpaceSelect(s)}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 text-left font-mono text-sm transition-colors ${
                            isDark
                              ? 'hover:bg-zinc-800 text-white'
                              : 'hover:bg-zinc-100 text-black'
                          }`}
                        >
                          {s.avatar ? (
                            <img
                              src={formatAvatar(s.avatar)}
                              alt=""
                              className="w-7 h-7 rounded-full border border-zinc-600 shrink-0 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                              isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
                            }`}>
                              {s.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{s.name}</div>
                            <div className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                              {s.id}
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 text-xs shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            <Users size={11} />
                            {s.followersCount?.toLocaleString() || 0}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {mode === 'all' && (
                <div className={`flex-1 px-4 py-3 border-2 border-dashed font-mono text-sm flex items-center gap-2 ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-700 text-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-400'
                }`}>
                  <Globe size={14} />
                  Showing events from all spaces
                </div>
              )}
              {mode === 'address' && (
                <input
                  type="text"
                  value={addressFilter}
                  onChange={(e) => setAddressFilter(e.target.value)}
                  placeholder="User address — 0x..."
                  className={`flex-1 px-4 py-3 border-2 outline-none font-mono text-sm transition-all duration-100 ${
                    isDark
                      ? 'bg-zinc-950 text-white placeholder-zinc-600 border-zinc-700 focus:border-red-600'
                      : 'bg-zinc-50 text-black placeholder-zinc-400 border-zinc-300 focus:border-red-600'
                  }`}
                />
              )}
              <div className="relative">
                <button
                  ref={calendarBtnRef}
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`h-full px-3 border-2 transition-all duration-100 hover:-translate-y-0.5 relative ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-500 hover:text-black hover:border-zinc-400'
                  }`}
                  title="Date filter"
                >
                  <Calendar size={16} />
                  {selectedDate && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                  )}
                </button>
                {showCalendar && (
                  <div ref={calendarRef} className={`absolute right-0 mt-2 border-2 z-40 shadow-lg ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700'
                      : 'bg-white border-zinc-200'
                  }`}>
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      className={`p-3 font-mono ${isDark ? '[&_.rdp-day]:text-white [&_.rdp-caption]:text-white [&_.rdp-head_cell]:text-zinc-500' : ''}`}
                    />
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => handleDateSelect(undefined)}
                        className="w-full px-4 py-2 border-t-2 font-mono font-bold uppercase text-xs bg-red-600 text-white border-red-600 hover:bg-red-700 transition-colors"
                      >
                        Clear date
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {mode === 'address' && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={space}
                    onChange={(e) => handleSpaceInputChange(e.target.value)}
                    onFocus={() => {
                      if (spaceSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    placeholder="Filter by space (optional) — e.g. ens.eth"
                    className={`w-full px-4 py-2.5 border-2 outline-none font-mono text-sm transition-all duration-100 ${
                      isDark
                        ? 'bg-zinc-950 text-white placeholder-zinc-600 border-zinc-700 focus:border-red-600'
                        : 'bg-zinc-50 text-black placeholder-zinc-400 border-zinc-300 focus:border-red-600'
                    }`}
                  />
                  {loadingSuggestions && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                        isDark ? 'border-zinc-500' : 'border-zinc-400'
                      }`} />
                    </div>
                  )}
                  {showSuggestions && spaceSuggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className={`absolute left-0 right-0 top-full mt-1 border-2 z-50 max-h-80 overflow-y-auto shadow-lg ${
                        isDark
                          ? 'bg-zinc-900 border-zinc-700'
                          : 'bg-white border-zinc-300'
                      }`}
                    >
                      {spaceSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSpaceSelect(s)}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 text-left font-mono text-sm transition-colors ${
                            isDark
                              ? 'hover:bg-zinc-800 text-white'
                              : 'hover:bg-zinc-100 text-black'
                          }`}
                        >
                          {s.avatar ? (
                            <img
                              src={formatAvatar(s.avatar)}
                              alt=""
                              className="w-7 h-7 rounded-full border border-zinc-600 shrink-0 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                              isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
                            }`}>
                              {s.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{s.name}</div>
                            <div className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                              {s.id}
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 text-xs shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            <Users size={11} />
                            {s.followersCount?.toLocaleString() || 0}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode !== 'address' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={addressFilter}
                  onChange={(event) => setAddressFilter(event.target.value)}
                  placeholder="Filter by user address (optional) — 0x..."
                  className={`w-full px-4 py-2.5 border-2 outline-none font-mono text-sm transition-all duration-100 ${
                    isDark
                      ? 'bg-zinc-950 text-white placeholder-zinc-600 border-zinc-700 focus:border-red-600'
                      : 'bg-zinc-50 text-black placeholder-zinc-400 border-zinc-300 focus:border-red-600'
                  }`}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {mode === 'space' ? (
                <button
                  type="submit"
                  disabled={loading || !space.trim()}
                  onMouseEnter={() => hover('submit', true)}
                  onMouseLeave={() => hover('submit', false)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white border-2 border-red-600 font-mono font-bold uppercase text-sm tracking-wider transition-all duration-100 hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_rgba(185,28,28,1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  <ScrambleText externalHover={hoverStates.submit}>{loading ? 'LOADING...' : 'EXPLORE'}</ScrambleText>
                </button>
              ) : mode === 'address' ? (
                <button
                  type="submit"
                  disabled={loading || !addressFilter.trim()}
                  onMouseEnter={() => hover('submit', true)}
                  onMouseLeave={() => hover('submit', false)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white border-2 border-red-600 font-mono font-bold uppercase text-sm tracking-wider transition-all duration-100 hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_rgba(185,28,28,1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  <ScrambleText externalHover={hoverStates.submit}>{loading ? 'LOADING...' : 'EXPLORE ADDRESS'}</ScrambleText>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAllEvents}
                  disabled={loading}
                  onMouseEnter={() => hover('submit', true)}
                  onMouseLeave={() => hover('submit', false)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white border-2 border-red-600 font-mono font-bold uppercase text-sm tracking-wider transition-all duration-100 hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_rgba(185,28,28,1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  <ScrambleText externalHover={hoverStates.submit}>{loading ? 'LOADING...' : 'SHOW ALL EVENTS'}</ScrambleText>
                </button>
              )}
            </div>
          </form>

          {/* Filter pills */}
          {messages.length > 0 && (
            <div className={`mt-4 pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className={`font-mono text-[10px] font-bold uppercase mb-2 tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Filter by type
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onMouseEnter={() => hover('filter-verified', true)}
                  onMouseLeave={() => hover('filter-verified', false)}
                  onClick={() => {
                    setVerifiedOnly(prev => !prev);
                    resetAndReload();
                  }}
                  disabled={verifiedLoading}
                  title={verifiedLoading ? 'Loading verified spaces…' : 'Show only events from verified spaces'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono font-bold uppercase text-[11px] border-2 transition-all duration-100 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait disabled:hover:translate-y-0 ${
                    verifiedOnly
                      ? 'bg-red-600 border-transparent text-white'
                      : isDark
                        ? 'bg-transparent border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                        : 'bg-transparent border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  <ShieldCheck size={11} />
                  <ScrambleText externalHover={hoverStates['filter-verified']}>
                    {verifiedLoading ? 'Loading…' : 'Verified only'}
                  </ScrambleText>
                </button>
                {([
                  { type: 'proposal', label: 'Proposals', color: 'bg-emerald-600' },
                  { type: 'settings', label: 'Settings', color: 'bg-blue-600' },
                  { type: 'delete-proposal', label: 'Deleted', color: 'bg-red-600' },
                  { type: 'update-proposal', label: 'Updated', color: 'bg-amber-600' },
                  { type: 'vote', label: 'Votes', color: 'bg-violet-600' },
                  { type: 'follow', label: 'Follows', color: 'bg-sky-600' },
                  { type: 'unfollow', label: 'Unfollows', color: 'bg-zinc-600' },
                  { type: 'subscribe', label: 'Subscribes', color: 'bg-indigo-600' },
                  { type: 'unsubscribe', label: 'Unsubscribes', color: 'bg-stone-600' },
                  { type: 'alias', label: 'Alias', color: 'bg-fuchsia-600' },
                  { type: 'revoke-alias', label: 'Revoke Alias', color: 'bg-pink-600' },
                  { type: 'profile', label: 'Profile', color: 'bg-teal-600' },
                  { type: 'statement', label: 'Statement', color: 'bg-cyan-600' },
                  { type: 'flag-proposal', label: 'Flagged', color: 'bg-orange-600' },
                  { type: 'delete-space', label: 'Space Deleted', color: 'bg-rose-700' },
                ] as const).map(({ type, label, color }) => {
                  const isSelected = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onMouseEnter={() => hover(`filter-${type}`, true)}
                      onMouseLeave={() => hover(`filter-${type}`, false)}
                      onClick={() => {
                        setSelectedTypes(prev =>
                          isSelected ? prev.filter(t => t !== type) : [...prev, type]
                        );
                        resetAndReload();
                      }}
                      className={`px-3 py-1.5 font-mono font-bold uppercase text-[11px] border-2 transition-all duration-100 hover:-translate-y-0.5 ${
                        isSelected
                          ? `${color} border-transparent text-white`
                          : isDark
                            ? 'bg-transparent border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                            : 'bg-transparent border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <ScrambleText externalHover={hoverStates[`filter-${type}`]}>{label}</ScrambleText>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onMouseEnter={() => hover('filterToggle', true)}
                  onMouseLeave={() => hover('filterToggle', false)}
                  onClick={() => {
                    setSelectedTypes(prev =>
                      prev.length === EVENT_TYPES.length ? [] : [...EVENT_TYPES]
                    );
                    resetAndReload();
                  }}
                  className={`px-3 py-1.5 font-mono text-[11px] uppercase border-2 border-dashed transition-all duration-100 hover:-translate-y-0.5 ${
                    isDark
                      ? 'border-zinc-700 text-zinc-500 hover:border-zinc-400 hover:text-zinc-300'
                      : 'border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  <ScrambleText externalHover={hoverStates.filterToggle}>
                    {selectedTypes.length === EVENT_TYPES.length ? 'Clear all' : 'Select all'}
                  </ScrambleText>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-600/10 border-2 border-red-600 text-red-600 font-mono text-sm">
              <strong className="uppercase">Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Timeline */}
        <Timeline
          messages={messages.filter(m => {
            if (!selectedTypes.includes(m.type)) return false;
            // Verified-only filter: only excludes events that have a space and
            // whose space is not verified. User-only events (alias, profile,
            // revoke-alias) have no space and pass through.
            if (verifiedOnly && verifiedSpaceIds && m.space && !verifiedSpaceIds.has(m.space)) return false;
            return true;
          })}
          loading={loading}
          space={mode === 'all' || (mode === 'address' && !space) ? '' : space}
          theme={theme}
          showSpaceBadge={mode === 'all' || (mode === 'address' && !space)}
          hasData={messages.length > 0}
          onAddressClick={(address) => {
            applyAddressFilter(address);
          }}
          onSpaceClick={(spaceId) => {
            setHash(`/s:${spaceId}`);
            setMode('space');
            setSpace(spaceId);
            resetTimeline({ keepSearch: true });
            setHasSearched(true);
            setPendingAutoLoad(true);
          }}
        />

        <div ref={observerTarget} className="h-4" />

        {!hasMore && messages.length > 0 && (
          <div className={`text-center py-4 font-mono text-xs uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            &mdash; End of timeline &mdash;
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
