import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { Timeline } from './components/Timeline';
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
        0,
        isInitial ? timestamp : lastTimestamp.current
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
    setHasMore(true);
    lastTimestamp.current = undefined;
    await loadMessages(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setShowCalendar(false);
    if (date) {
      setMessages([]);
      setHasMore(true);
      lastTimestamp.current = undefined;
      loadMessages(true);
    }
  };

  const clearDate = () => {
    setSelectedDate(undefined);
    setMessages([]);
    setHasMore(true);
    lastTimestamp.current = undefined;
    loadMessages(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Snapshot Timeline Explorer
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore governance activities and proposals across Snapshot spaces with an interactive timeline view
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={space}
                  onChange={(e) => setSpace(e.target.value)}
                  placeholder="Enter space name (e.g., thanku.eth)"
                  className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2 min-w-[160px] justify-center"
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
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                )}
                {showCalendar && (
                  <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl z-10 border border-gray-200">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      className="p-3"
                    />
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Explore Timeline'}
              </button>
            </form>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </div>

        <Timeline messages={messages} loading={loading} space={space} />
        
        <div ref={observerTarget} className="h-4" />
        
        {!hasMore && messages.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">🎉 You've reached the beginning of time!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;