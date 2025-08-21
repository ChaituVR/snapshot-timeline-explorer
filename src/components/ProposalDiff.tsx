import React, { useState, useEffect } from 'react';
import { AlertCircle, GitCompare, FileText } from 'lucide-react';
import * as jsondiffpatch from 'jsondiffpatch';
import { fetchProposalById } from '../api';
import type { SnapshotMessage } from '../types';
import { CopyButton } from './CopyButton';

interface ProposalDiffProps {
  currentMessage: SnapshotMessage;
  space: string;
}

export const ProposalDiff: React.FC<ProposalDiffProps> = ({ currentMessage, space }) => {
  const [currentProposal, setCurrentProposal] = useState<any>(null);
  const [originalProposal, setOriginalProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diff, setDiff] = useState<any>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposalData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch current proposal update data
        const currentResponse = await fetch(`https://4everland.io/ipfs/${currentMessage.ipfs}`);
        if (!currentResponse.ok) {
          throw new Error('Failed to fetch current proposal update');
        }
        const currentData = await currentResponse.json();
        
        // Extract proposal ID from the update message
        const extractedProposalId = currentData.data.message.proposal;
        if (!extractedProposalId) {
          throw new Error('No proposal ID found in update message');
        }
        
        setProposalId(extractedProposalId);
        setCurrentProposal(currentData.data.message);

        // Fetch all messages for this proposal to find the original
        const proposalResponse = await fetchProposalById(space, extractedProposalId);
        
        if (proposalResponse.messages.length === 0) {
          throw new Error('Original proposal not found');
        }

        // Find the original proposal (type: "proposal")
        const originalMessage = proposalResponse.messages.find(msg => msg.type === 'proposal');
        if (!originalMessage) {
          throw new Error('Original proposal message not found');
        }

        // Fetch original proposal data
        const originalResponse = await fetch(`https://4everland.io/ipfs/${originalMessage.ipfs}`);
        if (!originalResponse.ok) {
          throw new Error('Failed to fetch original proposal');
        }
        
        const originalData = await originalResponse.json();
        setOriginalProposal(originalData.data.message);

        // Generate diff between original and updated proposal
        const delta = jsondiffpatch.diff(originalData.data.message, currentData.data.message);
        setDiff(delta);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load proposal comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchProposalData();
  }, [currentMessage, space]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading proposal comparison...</p>
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

  const renderDiffValue = (key: string, value: any) => {
    if (Array.isArray(value)) {
      if (value.length === 1) {
        // Addition
        return (
          <div className="mb-4">
            <div className="font-medium text-green-700 mb-2">➕ {key} (Added)</div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <pre className="text-sm text-green-800 whitespace-pre-wrap break-words">
                {typeof value[0] === 'string' ? value[0] : JSON.stringify(value[0], null, 2)}
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
                {typeof value[1] === 'string' ? value[1] : JSON.stringify(value[1], null, 2)}
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
                {typeof value[0] === 'string' ? value[0] : JSON.stringify(value[0], null, 2)}
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
                    {typeof value[0] === 'string' ? value[0] : JSON.stringify(value[0], null, 2)}
                  </pre>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-green-600 mb-1">After:</div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <pre className="text-sm text-green-800 whitespace-pre-wrap break-words">
                    {typeof value[1] === 'string' ? value[1] : JSON.stringify(value[1], null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        );
      } else if (value.length === 3 && value[2] === 0) {
        // Array item deletion
        return (
          <div className="mb-4">
            <div className="font-medium text-red-700 mb-2">🗑️ {key} (Removed)</div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <pre className="text-sm text-red-800 whitespace-pre-wrap break-words">
                {typeof value[0] === 'string' ? value[0] : JSON.stringify(value[0], null, 2)}
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
        <h3 className="text-lg font-semibold text-gray-800">Proposal Update Comparison</h3>
        {proposalId && (
          <div className="flex items-center gap-2">
            <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
              {proposalId.slice(0, 8)}...{proposalId.slice(-8)}
            </code>
            <CopyButton text={proposalId} variant="minimal">
              Copy ID
            </CopyButton>
          </div>
        )}
        <div className="ml-auto">
          <CopyButton 
            text={diff ? JSON.stringify(diff, null, 2) : 'No changes detected'} 
            variant="outline">
            Copy Diff
          </CopyButton>
        </div>
      </div>

      {diff && Object.keys(diff).length > 0 ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Changes Detected</h4>
            <p className="text-blue-700 text-sm">
              The following changes were made to the proposal:
            </p>
            <div className="mt-3">
              <CopyButton 
                text={JSON.stringify(diff, null, 2)} 
                variant="outline">
                Copy Changes
              </CopyButton>
            </div>
          </div>
          
          {renderNestedDiff(diff)}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-2">No Changes Detected</h4>
            <p className="text-gray-500">The proposal appears to be identical to the original.</p>
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-700 mb-4">Raw Proposal Data</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="font-medium text-gray-700">Original Proposal</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex justify-end mb-2">
                <CopyButton 
                  text={JSON.stringify(originalProposal, null, 2)} 
                  variant="outline">
                  Copy Original
                </CopyButton>
              </div>
              <pre className="text-sm overflow-auto max-h-[40vh] whitespace-pre-wrap break-words">
                {JSON.stringify(originalProposal, null, 2)}
              </pre>
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="font-medium text-gray-700">Updated Proposal</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex justify-end mb-2">
                <CopyButton 
                  text={JSON.stringify(currentProposal, null, 2)} 
                  variant="outline">
                  Copy Updated
                </CopyButton>
              </div>
              <pre className="text-sm overflow-auto max-h-[40vh] whitespace-pre-wrap break-words">
                {JSON.stringify(currentProposal, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};