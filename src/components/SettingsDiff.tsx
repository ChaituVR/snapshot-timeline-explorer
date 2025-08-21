import React, { useState, useEffect } from 'react';
import { AlertCircle, GitCompare, ArrowRight, Columns, List } from 'lucide-react';
import * as jsondiffpatch from 'jsondiffpatch';
import { fetchPreviousSettingsUpdate } from '../api';
import type { SnapshotMessage } from '../types';
import { CopyButton } from './CopyButton';

interface SettingsDiffProps {
  currentMessage: SnapshotMessage;
  space: string;
}

export const SettingsDiff: React.FC<SettingsDiffProps> = ({ currentMessage, space }) => {
  const [currentSettings, setCurrentSettings] = useState<any>(null);
  const [previousSettings, setPreviousSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diff, setDiff] = useState<any>(null);

  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch current settings
        const currentResponse = await fetch(`https://4everland.io/ipfs/${currentMessage.ipfs}`);
        if (!currentResponse.ok) {
          throw new Error('Failed to fetch current settings');
        }
        const currentData = await currentResponse.json();
        const currentSettingsData = JSON.parse(currentData.data.message.settings);
        setCurrentSettings(currentSettingsData);

        // Fetch previous settings update
        const previousResponse = await fetchPreviousSettingsUpdate(space, currentMessage.timestamp);
        
        if (previousResponse.messages.length === 0) {
          // No previous settings found
          setPreviousSettings(null);
          setDiff(null);
        } else {
          const previousMessage = previousResponse.messages[0];
          const previousIPFSResponse = await fetch(`https://4everland.io/ipfs/${previousMessage.ipfs}`);
          
          if (!previousIPFSResponse.ok) {
            throw new Error('Failed to fetch previous settings');
          }
          
          const previousData = await previousIPFSResponse.json();
          const previousSettingsData = JSON.parse(previousData.data.message.settings);
          setPreviousSettings(previousSettingsData);

          // Generate diff
          const delta = jsondiffpatch.diff(previousSettingsData, currentSettingsData);
          setDiff(delta);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsData();
  }, [currentMessage, space]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading settings comparison...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load Comparison</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!previousSettings) {
    return (
      <div className="text-center py-8">
        <GitCompare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Previous Settings Found</h3>
        <p className="text-gray-500">This appears to be the first settings update for this space.</p>
        
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-700 mb-3">Current Settings:</h4>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <pre className="text-sm overflow-auto max-h-[40vh] whitespace-pre-wrap break-words">
              {JSON.stringify(currentSettings, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  const renderDiffValue = (key: string, value: any) => {
    console.log(`Diff for ${key}:`, value);
    
    if (Array.isArray(value)) {
      if (value.length === 1) {
        // Single element array means addition
        return (
          <div className="mb-4">
            <div className="font-medium text-green-700 mb-2">➕ {key} (Added)</div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <pre className="text-sm text-green-800 whitespace-pre-wrap break-words">
                {JSON.stringify(value[0], null, 2)}
              </pre>
            </div>
          </div>
        );
      } else if (value.length === 2 && value[0] === undefined) {
        // Added
        return (
          <div className="mb-4">
            <div className="font-medium text-green-700 mb-2">➕ {key} (Added)</div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <pre className="text-sm text-green-800 whitespace-pre-wrap break-words">
                {JSON.stringify(value[1], null, 2)}
              </pre>
            </div>
          </div>
        );
      } else if (value.length === 2 && value[1] === undefined) {
        // Removed
        return (
          <div className="mb-4">
            <div className="font-medium text-red-700 mb-2">🗑️ {key} (Removed)</div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <pre className="text-sm text-red-800 whitespace-pre-wrap break-words">
                {JSON.stringify(value[0], null, 2)}
              </pre>
            </div>
          </div>
        );
      } else if (value.length === 2 && value[0] !== undefined && value[1] !== undefined) {
        // Modified
        return (
          <div className="mb-4">
            <div className="font-medium text-blue-700 mb-2">✏️ {key} (Modified)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-red-600 mb-1">Before:</div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <pre className="text-sm text-red-800 whitespace-pre-wrap break-words">
                    {JSON.stringify(value[0], null, 2)}
                  </pre>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-green-600 mb-1">After:</div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <pre className="text-sm text-green-800 whitespace-pre-wrap break-words">
                    {JSON.stringify(value[1], null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        );
      } else if (value.length === 3 && value[2] === 0) {
        // Array item deletion (jsondiffpatch format: [oldValue, 0, 0])
        return (
          <div className="mb-4">
            <div className="font-medium text-red-700 mb-2">🗑️ {key} (Removed)</div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <pre className="text-sm text-red-800 whitespace-pre-wrap break-words">
                {JSON.stringify(value[0], null, 2)}
              </pre>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  const renderNestedDiff = (obj: any, path: string = '') => {
    return Object.keys(obj).map(key => {
      const fullPath = path ? `${path}.${key}` : key;
      const value = obj[key];
      
      if (Array.isArray(value)) {
        return renderDiffValue(fullPath, value);
      } else if (typeof value === 'object' && value !== null) {
        return (
          <div key={fullPath} className="mb-4">
            <div className="font-medium text-gray-700 mb-2">📁 {fullPath}</div>
            <div className="ml-4 border-l-2 border-gray-200 pl-4">
              {renderNestedDiff(value, fullPath)}
            </div>
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="max-w-none">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <GitCompare className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-800">Settings Comparison</h3>
        <div className="ml-auto">
          <CopyButton 
            text={diff ? JSON.stringify(diff, null, 2) : 'No changes detected'} 
            variant="outline"
          />
        </div>
      </div>

      {diff && Object.keys(diff).length > 0 ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Changes Detected</h4>
            <p className="text-blue-700 text-sm">
              The following settings were modified between the previous and current update:
            </p>
            <div className="mt-3">
              <CopyButton 
                text={JSON.stringify(diff, null, 2)} 
                variant="outline"
              />
            </div>
          </div>
          
          {renderNestedDiff(diff)}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">No Changes Detected</h4>
            <p className="text-gray-500">The settings appear to be identical to the previous update.</p>
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-700 mb-4">Raw Settings Data</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="font-medium text-gray-700">Previous Settings</span>
              <CopyButton 
                text={JSON.stringify(previousSettings, null, 2)} 
                variant="minimal" 
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex justify-end mb-2">
                <CopyButton 
                  text={JSON.stringify(previousSettings, null, 2)} 
                  variant="minimal" 
                />
              </div>
              <pre className="text-sm overflow-auto max-h-[40vh] whitespace-pre-wrap break-words">
                {JSON.stringify(previousSettings, null, 2)}
              </pre>
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="font-medium text-gray-700">Current Settings</span>
              <CopyButton 
                text={JSON.stringify(currentSettings, null, 2)} 
                variant="minimal" 
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex justify-end mb-2">
                <CopyButton 
                  text={JSON.stringify(currentSettings, null, 2)} 
                  variant="minimal" 
                />
              </div>
              <pre className="text-sm overflow-auto max-h-[40vh] whitespace-pre-wrap break-words">
                {JSON.stringify(currentSettings, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};