import React from 'react';
import { Theme } from '../types';

interface AutoScrollingTextProps {
  text: string;
  theme: Theme;
}

export const AutoScrollingText: React.FC<AutoScrollingTextProps> = ({ text, theme }) => {
  // Use a slice of the text to prevent DOM overload, but repeat it to allow looping
  const slice = text.slice(0, 20000); 

  // Gradient mask for fading top/bottom edges
  const gradientOverlay = 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)';
    
  // Color to fade into (solid background color)
  const fadeColor = theme === 'dark' ? '#111' : '#fdfbf7';
  
  // Text color with low opacity for the background effect. 
  const baseTextColor = theme === 'dark' ? 'rgba(163, 163, 163, 0.15)' : 'rgba(26, 26, 26, 0.15)';

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ 
        maskImage: gradientOverlay,
        WebkitMaskImage: gradientOverlay
      }}
    >
      {/* Text Container */}
      <div 
        className="animate-scroll-text p-8 text-justify font-serif text-xl leading-relaxed w-full"
        style={{ 
          color: baseTextColor,
          animationDuration: '120s' // Slowed down for readability given the longer text
        }}
      >
        {slice}
        <br/><br/>
        {slice}
      </div>
      
      {/* Top Fade Overlay */}
      <div 
        className="absolute top-0 left-0 w-full h-32"
        style={{ background: `linear-gradient(to bottom, ${fadeColor}, transparent)` }}
      ></div>
      
      {/* Bottom Fade Overlay */}
      <div 
        className="absolute bottom-0 left-0 w-full h-32"
        style={{ background: `linear-gradient(to top, ${fadeColor}, transparent)` }}
      ></div>
    </div>
  );
};