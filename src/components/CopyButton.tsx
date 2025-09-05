import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
  size?: number;
  variant?: 'default' | 'minimal' | 'outline';
}

export const CopyButton: React.FC<CopyButtonProps> = ({ 
  text, 
  children,
  className = '', 
  size = 16,
  variant = 'default'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const baseClasses = "inline-flex items-center gap-1 transition-all duration-200";
  
  const variantClasses = {
    default: "px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm font-medium",
    minimal: "p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200",
    outline: "px-2 py-1 border border-gray-600 hover:border-gray-500 rounded text-gray-300 hover:text-gray-100 text-sm bg-gray-700/50 hover:bg-gray-600/50"
  };

  return (
    <button
      onClick={handleCopy}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <>
          <Check size={size} className="text-green-600" />
          {(variant !== 'minimal' || children) && (
            <span className="text-green-600">{children || 'Copied!'}</span>
          )}
        </>
      ) : (
        <>
          <Copy size={size} />
          {(variant !== 'minimal' || children) && (
            <span>{children || 'Copy'}</span>
          )}
        </>
      )}
    </button>
  );
};