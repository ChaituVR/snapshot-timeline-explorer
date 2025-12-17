import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Calendar, Moon, Sun, Sparkles } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { Timeline } from './components/Timeline';
import { ScrambleText } from './components/ScrambleText';
import { fetchMessages } from './api';
import type { SnapshotMessage } from './types';
import 'react-day-picker/dist/style.css';

function App() {
  const [space, setSpace] = useState('thanku.eth');
  const [messages, setMessages] = useState<SnapshotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['proposal', 'settings', 'delete-proposal', 'update-proposal']);
  const [hoverStates, setHoverStates] = useState<Record<string, boolean>>({});
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const lastTimestamp = useRef<number | undefined>(undefined);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Toggle theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendar]);

  const loadMessages = useCallback(async (isInitial = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const timestamp = selectedDate ? Math.floor(selectedDate.getTime() / 1000) : undefined;
      
      // For cursor-based pagination, we use timestamp_lt without skip
      // On initial load: use the selected date timestamp (if any)
      // On subsequent loads: use the timestamp of the last loaded message
      const timestampCursor = isInitial ? timestamp : lastTimestamp.current;
      
      const response = await fetchMessages(
        space,
        10,
        0, // Always use skip=0, pagination is handled by timestamp_lt cursor
        timestampCursor
      );
      
      const newMessages = response.messages;
      
      if (newMessages.length < 10) {
        setHasMore(false);
      }
      
      if (newMessages.length > 0) {
        lastTimestamp.current = newMessages[newMessages.length - 1].timestamp;
      }
      
      setMessages(prev => isInitial ? newMessages : [...prev, ...newMessages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [space, selectedDate]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        // Only load more if we have selected types and other conditions are met
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
  }, [hasMore, loading, loadMessages, selectedTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessages([]);
    setHasMore(true);
    lastTimestamp.current = undefined;
    await loadMessages(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setShowCalendar(false);
    setMessages([]);
    setHasMore(true);
    lastTimestamp.current = undefined;
    loadMessages(true);
  };

  const clearDate = () => {
    setSelectedDate(undefined);
    setMessages([]);
    setHasMore(true);
    lastTimestamp.current = undefined;
    loadMessages(true);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark'
        ? 'bg-black'
        : 'bg-white'
    }`}>
      {/* Brutalist background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
        <div className="absolute bottom-0 right-0 w-1 h-full bg-red-600" />
        <div className={`absolute top-1/3 right-1/4 w-64 h-64 border-2 border-red-600 rotate-12`} />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 relative">
        {/* Theme Toggle Button - Brutalist */}
        <div className="flex justify-end mb-8">
          <button
            onClick={toggleTheme}
            onMouseEnter={() => setHoverStates(prev => ({ ...prev, themeToggle: true }))}
            onMouseLeave={() => setHoverStates(prev => ({ ...prev, themeToggle: false }))}
            className={`relative p-4 border-2 border-black transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] ${
              theme === 'dark'
                ? 'bg-red-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none'
                : 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none'
            } font-mono font-bold uppercase text-xs tracking-wider`}
            aria-label="Toggle theme"
          >
            <ScrambleText externalHover={hoverStates.themeToggle}>{theme === 'dark' ? '[LIGHT]' : '[DARK]'}</ScrambleText>
          </button>
        </div>

        <div className="mb-10">
          <div className="text-left mb-6">
            <div 
              onMouseEnter={() => setHoverStates(prev => ({ ...prev, header: true }))}
              onMouseLeave={() => setHoverStates(prev => ({ ...prev, header: false }))}
              className={`inline-block border-4 border-black p-6 mb-4 ${
              theme === 'dark' ? 'bg-white' : 'bg-black'
            } shadow-[4px_4px_0px_0px_rgba(255,0,0,1)]`}>
              <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none ${
                theme === 'dark' ? 'text-black' : 'text-white'
              }`} style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                <ScrambleText externalHover={hoverStates.header}>SNAPSHOT</ScrambleText><br/>
                <ScrambleText externalHover={hoverStates.header}><span className="text-red-600">TIME</span>LINE</ScrambleText><br/>
                <ScrambleText externalHover={hoverStates.header}>EXPLORER</ScrambleText>
              </h1>
            </div>
            <div className={`font-mono text-sm uppercase tracking-wide inline-block border-2 border-black px-4 py-2 ml-12 ${
              theme === 'dark' ? 'bg-red-600 text-white' : 'bg-white text-black'
            } shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
              /// GOVERNANCE DATA FEED ///<br/>
              &gt;&gt;&gt; PROPOSALS + SETTINGS + MORE
            </div>
          </div>
          
          
          {/* Form Section with Big Border */}
          <div className={`border-[8px] p-8 transition-colors duration-200 ${
            theme === 'dark'
              ? 'bg-black border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]'
              : 'bg-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
          }`}>
          <div className={`border-[6px] border-black p-6 transition-colors duration-200 ${
            theme === 'dark'
              ? 'bg-black shadow-[4px_4px_0px_0px_rgba(255,0,0,1)]'
              : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          }`}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <div className={`font-mono text-xs uppercase mb-2 font-bold tracking-wider ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
                  [{'{'}"SPACE_NAME"{'}'}] + [DATE_FILTER]
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={space}
                    onChange={(e) => setSpace(e.target.value)}
                    placeholder="thanku.eth"
                    className={`flex-1 px-4 py-3 border-4 outline-none font-mono font-bold transition-all duration-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] ${
                      theme === 'dark'
                        ? 'bg-black text-white placeholder-gray-600 border-white focus:bg-red-600 focus:text-white focus:border-red-600 focus:shadow-[4px_4px_0px_0px_rgba(255,0,0,1)]'
                        : 'bg-white text-black placeholder-gray-400 border-black focus:bg-black focus:text-white focus:border-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`px-4 py-3 border-4 transition-all duration-100 font-mono font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none relative ${
                      theme === 'dark'
                        ? 'bg-black text-white border-white'
                        : 'bg-white text-black border-black'
                    }`}
                    title="Select date filter"
                  >
                    <Calendar size={20} />
                    {selectedDate && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-black"></span>
                    )}
                  </button>
                </div>
                {showCalendar && (
                  <div ref={calendarRef} className={`absolute right-0 mt-2 border-4 border-black dark:border-white z-10 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] ${
                    theme === 'dark'
                      ? 'bg-black [&_.rdp-day]:text-white [&_.rdp-caption]:text-white [&_.rdp-head_cell]:text-gray-400'
                      : 'bg-white'
                  }`}>
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      className="p-3 font-mono"
                    />
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={clearDate}
                        className={`w-full px-4 py-2 border-t-4 font-mono font-bold uppercase text-xs transition-all ${
                          theme === 'dark'
                            ? 'bg-red-600 text-white border-white hover:bg-white hover:text-red-600'
                            : 'bg-black text-white border-black hover:bg-red-600'
                        }`}
                      >
                        [CLEAR_DATE]
                      </button>
                    )}
                  </div>
                )}
              </div>
              {/* Event Type Filter Buttons */}
              {messages.length > 0 && (
                <div className="pt-4 border-t-4 border-black dark:border-white">
                  <div className={`font-mono text-xs font-bold uppercase mb-3 tracking-wider ${
                    theme === 'dark' ? 'text-white' : 'text-black'
                  }`}>
                    <ScrambleText>[FILTER_BY_TYPE]</ScrambleText>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { type: 'proposal', label: 'PROPOSALS' },
                      { type: 'settings', label: 'SETTINGS' },
                      { type: 'delete-proposal', label: 'DELETED' },
                      { type: 'update-proposal', label: 'UPDATED' }
                    ].map(({ type, label }) => {
                      const isSelected = selectedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onMouseEnter={() => setHoverStates(prev => ({ ...prev, [`filter-${type}`]: true }))}
                          onMouseLeave={() => setHoverStates(prev => ({ ...prev, [`filter-${type}`]: false }))}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTypes(selectedTypes.filter(t => t !== type));
                            } else {
                              setSelectedTypes([...selectedTypes, type]);
                            }
                          }}
                          className={`px-4 py-2 border-2 font-mono font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
                            isSelected
                              ? theme === 'dark'
                                ? 'bg-red-600 border-red-600 text-white'
                                : 'bg-black border-black text-white'
                              : theme === 'dark'
                                ? 'bg-black border-white text-white'
                                : 'bg-white border-black text-black'
                          }`}
                        >
                          <ScrambleText externalHover={hoverStates[`filter-${type}`]}>{label}</ScrambleText>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onMouseEnter={() => setHoverStates(prev => ({ ...prev, filterToggle: true }))}
                      onMouseLeave={() => setHoverStates(prev => ({ ...prev, filterToggle: false }))}
                      onClick={() => {
                        const allTypes = ['proposal', 'settings', 'delete-proposal', 'update-proposal'];
                        setSelectedTypes(selectedTypes.length === allTypes.length ? [] : allTypes);
                      }}
                      className={`px-4 py-2 border-2 font-mono font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
                        theme === 'dark'
                          ? 'bg-black border-white text-white'
                          : 'bg-white border-black text-black'
                      }`}
                    >
                      <ScrambleText externalHover={hoverStates.filterToggle}>{selectedTypes.length === 4 ? '[CLEAR_ALL]' : '[SELECT_ALL]'}</ScrambleText>
                    </button>
                  </div>
                </div>
              )}
                            <button
                type="submit"
                disabled={loading}
                onMouseEnter={() => setHoverStates(prev => ({ ...prev, submit: true }))}
                onMouseLeave={() => setHoverStates(prev => ({ ...prev, submit: false }))}
                className={`px-8 py-4 border-4 border-black transition-all duration-100 font-black uppercase text-sm tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-[4px] hover:translate-y-[4px] ${
                  theme === 'dark'
                    ? 'bg-red-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none'
                    : 'bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,0,0,1)] hover:shadow-none'
                }`}
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
              >
                <ScrambleText externalHover={hoverStates.submit}>{loading ? '>>> LOADING...' : '>> EXPLORE >>'}</ScrambleText>
              </button>
            </form>
            
            {error && (
              <div className={`mt-4 p-4 border-4 border-black font-mono transition-colors ${
                theme === 'dark'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-black'
              } shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                <strong className="uppercase">[!ERROR!]</strong> {error}
              </div>
            )}
          </div>
          </div>
        </div>

        <Timeline messages={messages.filter(m => selectedTypes.includes(m.type))} loading={loading} space={space} theme={theme} />
        
        <div ref={observerTarget} className="h-4" />
        
        {!hasMore && messages.length > 0 && (
          <div className={`text-center py-6 px-4 border-4 border-black transition-colors ${
            theme === 'dark'
              ? 'bg-red-600 text-white'
              : 'bg-black text-white'
          } shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
            <p className="font-mono font-bold uppercase tracking-wider">/// END OF TIMELINE DATA ///</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;