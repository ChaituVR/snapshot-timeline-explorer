import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Calendar, Filter } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { Timeline } from './components/Timeline';
import { fetchMessages } from './api';
import type { SnapshotMessage } from './types';
import 'react-day-picker/dist/style.css';

const EVENT_TYPES = [
  { value: 'proposal', label: 'New Proposal', color: 'from-cyan-400 to-blue-500' },
  { value: 'settings', label: 'Settings Update', color: 'from-amber-400 to-orange-500' },
  { value: 'delete-proposal', label: 'Proposal Deleted', color: 'from-red-400 to-pink-500' },
  { value: 'update-proposal', label: 'Proposal Updated', color: 'from-emerald-400 to-green-500' },
];

function App() {
  const [space, setSpace] = useState('thanku.eth');
  const [messages, setMessages] = useState<SnapshotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showEventFilter, setShowEventFilter] = useState(false);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(['proposal', 'settings', 'delete-proposal', 'update-proposal']);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const lastTimestamp = useRef<number | undefined>(undefined);

  const loadMessages = useCallback(async (isInitial = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const timestamp = selectedDate ? Math.floor(selectedDate.getTime() / 1000) : undefined;
      
      const response = await fetchMessages(
        space,
        10,
        isInitial ? 0 : messages.length,
        isInitial && timestamp ? timestamp : lastTimestamp.current
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
  }, [space, selectedDate, messages.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMessages();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessages([]);
    setMessages(prev => prev.filter(msg => selectedEventTypes.includes(msg.type)));
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

  const toggleEventType = (eventType: string) => {
    setSelectedEventTypes(prev => {
      const newTypes = prev.includes(eventType)
        ? prev.filter(type => type !== eventType)
        : [...prev, eventType];
      return newTypes;
    });
  };

  const applyEventFilter = () => {
    setShowEventFilter(false);
    setMessages([]);
    setHasMore(true);
    lastTimestamp.current = undefined;
    loadMessages(true);
  };

  // Filter messages by selected event types
  const filteredMessages = messages.filter(msg => selectedEventTypes.includes(msg.type));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl p-2">
              <img 
                src="https://raw.githubusercontent.com/snapshot-labs/brand/refs/heads/master/icon/icon.png" 
                alt="Snapshot Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Snapshot Timeline Explorer
              </span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              <span className="text-gray-300">
                Explore governance activities and proposals across Snapshot spaces with an interactive timeline view
              </span>
            </p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-gray-700/50">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={space}
                  onChange={(e) => setSpace(e.target.value)}
                  placeholder="Enter space name (e.g., thanku.eth)"
                  className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-600 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all duration-200 bg-gray-700/50 text-white placeholder-gray-400 focus:bg-gray-700"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              </div>
              
              <div className="relative z-50">
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="px-4 py-3 bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600 rounded-xl hover:bg-gray-600/50 transition-all duration-200 flex items-center gap-2 min-w-[160px] justify-center text-white"
                >
                  <Calendar size={20} />
                  {selectedDate ? (
                    format(selectedDate, 'MMM d, yyyy')
                  ) : (
                    'Filter by Date'
                  )}
                </button>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={clearDate}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-all duration-200"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="relative z-40">
                <button
                  type="button"
                  onClick={() => setShowEventFilter(!showEventFilter)}
                  className="px-4 py-3 bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600 rounded-xl hover:bg-gray-600/50 transition-all duration-200 flex items-center gap-2 min-w-[160px] justify-center text-white"
                >
                  <Filter size={20} />
                  Filter by Event
                  {selectedEventTypes.length < EVENT_TYPES.length && (
                    <span className="ml-1 px-2 py-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-xs rounded-full">
                      {selectedEventTypes.length}
                    </span>
                  )}
                </button>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-xl hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Explore Timeline'}
              </button>
            </form>
            
            {error && (
              <div className="mt-4 p-4 bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-xl text-red-400 rounded-xl border border-red-700/50">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-slate-600/40">
          <Timeline messages={filteredMessages} />
        </div>
        
        <div ref={observerTarget} className="h-4" />
        
        {!hasMore && filteredMessages.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">🎉 You've reached the beginning of time!</p>
          </div>
        )}
      </div>

      {/* Calendar Dropdown Portal */}
      {showCalendar && (
        <div className="fixed inset-0 z-50" onClick={() => setShowCalendar(false)}>
          <div 
            className="absolute top-32 right-4 max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="p-3 bg-gray-800 rounded-xl shadow-xl border border-gray-700 text-white [&_.rdp-day]:text-white [&_.rdp-day_button:hover]:bg-gray-700 [&_.rdp-day_button.rdp-day_selected]:bg-gradient-to-r [&_.rdp-day_button.rdp-day_selected]:from-cyan-400 [&_.rdp-day_button.rdp-day_selected]:to-blue-500"
            />
          </div>
        </div>
      )}

      {/* Event Filter Dropdown Portal */}
      {showEventFilter && (
        <div className="fixed inset-0 z-40" onClick={() => setShowEventFilter(false)}>
          <div 
            className="absolute top-32 right-4 bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-4 min-w-[280px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-white font-semibold mb-3">Event Types</h4>
            <div className="space-y-2">
              {EVENT_TYPES.map((eventType) => (
                <label
                  key={eventType.value}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-all duration-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedEventTypes.includes(eventType.value)}
                    onChange={() => toggleEventType(eventType.value)}
                    className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-cyan-400 focus:ring-cyan-400 focus:ring-2"
                  />
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${eventType.color}`}></div>
                  <span className="text-white text-sm">{eventType.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-600">
              <button
                type="button"
                onClick={applyEventFilter}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg hover:from-cyan-500 hover:to-blue-600 transition-all duration-200 text-sm font-medium"
              >
                Apply Filter
              </button>
              <button
                type="button"
                onClick={() => setShowEventFilter(false)}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all duration-200 text-sm border border-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;