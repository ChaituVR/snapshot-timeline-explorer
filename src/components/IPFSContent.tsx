import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';

interface IPFSContentProps {
  ipfsHash: string;
}

export const IPFSContent: React.FC<IPFSContentProps> = ({ ipfsHash }) => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIPFSContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`https://4everland.io/ipfs/${ipfsHash}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`);
        }
        
        const data = await response.json();
        setContent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load IPFS content');
      } finally {
        setLoading(false);
      }
    };

    fetchIPFSContent();
  }, [ipfsHash]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading IPFS content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load Content</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-none">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
        <FileText className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-800">IPFS Content</h3>
        <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
          {ipfsHash.slice(0, 8)}...{ipfsHash.slice(-8)}
        </code>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <pre className="text-sm overflow-auto max-h-[60vh] whitespace-pre-wrap break-words">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    </div>
  );
};