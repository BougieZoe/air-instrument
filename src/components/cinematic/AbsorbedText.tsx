import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FRAGMENTS } from '../../lib/fragments';

interface AbsorbedTextProps {
  text: string;
  isTyping: boolean;
  idleStrength: number;
}

const AbsorbedText: React.FC<AbsorbedTextProps> = ({ text, isTyping, idleStrength }) => {
  const [activeThought, setActiveThought] = useState<string | null>(null);

  // Cycle through subconscious thoughts during idle
  useEffect(() => {
    if (idleStrength > 0.6 && !text && !isTyping) {
      const interval = setInterval(() => {
        const randomThought = FRAGMENTS.thoughts[Math.floor(Math.random() * FRAGMENTS.thoughts.length)];
        setActiveThought(randomThought);
        
        // Clear thought after a few seconds
        setTimeout(() => setActiveThought(null), 6000);
      }, 12000);
      
      return () => clearInterval(interval);
    } else {
      setActiveThought(null);
    }
  }, [idleStrength, text, isTyping]);

  // Pick a random set of Kanji for the periphery
  const displayKanji = useMemo(() => {
    return [...FRAGMENTS.kanji]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-20 px-12 md:px-32">
      {/* Ghostly periphery fragments */}
      <AnimatePresence>
        {(text || idleStrength > 0.1) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: text ? 0.02 : 0.01 + idleStrength * 0.04 }}
            exit={{ opacity: 0 }}
            className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-12 font-serif-jp text-4xl text-white select-none writing-vertical-rl"
            style={{ writingMode: 'vertical-rl' } as any}
          >
            {displayKanji.map((f, i) => (
              <motion.span 
                key={f.text} 
                animate={{ 
                  y: [0, idleStrength * 30, 0],
                  filter: [`blur(${2 + idleStrength * 3}px)`, `blur(${4 + idleStrength * 5}px)`, `blur(${2 + idleStrength * 4}px)`]
                }}
                transition={{ duration: 15 + i * 3, repeat: Infinity, ease: "easeInOut" }}
                className="tracking-[2em] opacity-40"
              >
                {f.text}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-6xl text-center relative">
        <AnimatePresence mode="wait">
          {/* 1. Active User/AI Response */}
          {text ? (
            <motion.p
              key="zoe-voice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: 'blur(30px)', scale: 1.02 }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
              className="font-instrument italic text-4xl md:text-6xl lg:text-8xl text-white/50 leading-[1.1] tracking-[-0.02em] select-none"
            >
              <span 
                className="relative inline-block"
                style={{ 
                  textShadow: '0 0 50px rgba(255,255,255,0.1), 0 0 100px rgba(255,255,255,0.05)',
                  filter: isTyping ? 'brightness(1.2)' : 'brightness(1)'
                }}
              >
                {text}
              </span>
              
              {isTyping && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block ml-2 w-4 h-[2px] bg-white/30 align-middle"
                />
              )}
            </motion.p>
          ) : (
            /* 2. Subconscious Idle Thoughts */
            activeThought && (
              <motion.p
                key="subconscious"
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 0.2, filter: 'blur(2px)' }}
                exit={{ opacity: 0, filter: 'blur(15px)' }}
                transition={{ duration: 4 }}
                className="font-instrument italic text-3xl md:text-5xl text-white/30 tracking-wider select-none"
              >
                {activeThought}
              </motion.p>
            )
          )}
        </AnimatePresence>

        {/* Emergence Glow */}
        <AnimatePresence>
          {text && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.3, scale: 1.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 -z-10 bg-white/[0.03] blur-[150px] rounded-full"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Internal Processing Indicator (Thinking) */}
      <AnimatePresence>
        {isTyping && !text && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative w-16 h-16">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 border border-white/5 rounded-full"
                  animate={{ 
                    scale: [1, 2, 1],
                    opacity: [0.05, 0.2, 0.05],
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    delay: i * 1,
                    ease: "easeInOut" 
                  }}
                />
              ))}
            </div>
            <span className="font-mono text-[7px] uppercase tracking-[1em] text-white/20">processing_silence</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AbsorbedText;
