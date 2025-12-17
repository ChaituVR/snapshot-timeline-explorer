import { useState, useEffect, useRef } from 'react';

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

export const useScrambleText = (text: string, isHovered: boolean) => {
  const [displayText, setDisplayText] = useState(text);
  const frameRef = useRef<number>();
  const iterationRef = useRef(0);

  useEffect(() => {
    if (!isHovered) {
      setDisplayText(text);
      iterationRef.current = 0;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      return;
    }

    let frame = 0;
    const totalFrames = text.length * 3;

    const animate = () => {
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            
            if (frame > index * 3) {
              return text[index];
            }
            
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('')
      );

      frame++;

      if (frame < totalFrames) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [text, isHovered]);

  return displayText;
};
