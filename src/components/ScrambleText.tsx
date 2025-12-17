import React, { useState } from 'react';
import { useScrambleText } from '../hooks/useScrambleText';

interface ScrambleTextProps {
  children: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  externalHover?: boolean;
}

export const ScrambleText: React.FC<ScrambleTextProps> = ({ 
  children, 
  className = '',
  as: Component = 'span',
  externalHover
}) => {
  const [internalHover, setInternalHover] = useState(false);
  const isHovered = externalHover !== undefined ? externalHover : internalHover;
  const displayText = useScrambleText(children, isHovered);

  const props = externalHover !== undefined 
    ? { className }
    : {
        className,
        onMouseEnter: () => setInternalHover(true),
        onMouseLeave: () => setInternalHover(false),
      };

  return React.createElement(Component, props, displayText);
};
