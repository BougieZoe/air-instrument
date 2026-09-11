import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpeakInputProps {
  onSend: (message: string) => void;
  isTyping: boolean;
  onInteraction: () => void;
}

const SpeakInput: React.FC<SpeakInputProps> = ({ onSend, isTyping, onInteraction }) => {
  const [value, setValue] = useState('');
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalInteraction = (e: any) => {
      onInteraction();
      inputRef.current?.focus();
    };
    window.addEventListener('mousedown', handleGlobalInteraction);
    window.addEventListener('keydown', handleGlobalInteraction);
    return () => {
      window.removeEventListener('mousedown', handleGlobalInteraction);
      window.removeEventListener('keydown', handleGlobalInteraction);
    };
  }, [onInteraction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isTyping) {
      const msg = value.trim();
      setSentMessage(msg);
      onSend(msg);
      setValue('');
      
      // Clear sent message after dissolve animation
      setTimeout(() => setSentMessage(null), 3000);
    }
  };

  return (
    <>
      {/* Sent Message - Dissolving into the void */}
      <AnimatePresence>
        {sentMessage && (
          <motion.div
            initial={{ opacity: 0.8, y: 0, filter: 'blur(0px)' }}
            animate={{ 
              opacity: 0, 
              y: -100, 
              filter: 'blur(20px)',
              scale: 1.1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="fixed bottom-32 inset-x-0 flex justify-center pointer-events-none z-40"
          >
            <p className="font-instrument italic text-2xl md:text-3xl text-white/40 tracking-wider">
              {sentMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stealth Input */}
      <div className="fixed bottom-12 inset-x-0 flex flex-col items-center z-30 pointer-events-none">
        <form onSubmit={handleSubmit} className="w-full max-w-md px-8 pointer-events-auto">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isTyping}
              autoComplete="off"
              className="w-full bg-transparent border-none outline-none text-white/40 font-mono text-[9px] uppercase tracking-[0.6em] text-center placeholder-white/5 transition-all duration-1000 focus:opacity-100"
              placeholder={isTyping ? "" : "TRANSMIT_"}
            />
            
            {/* Minimalist focus line */}
            <div className={`mt-2 h-[0.5px] bg-white transition-all duration-1000 mx-auto ${value ? 'w-24 opacity-20' : 'w-0 opacity-0'}`} />
          </div>
        </form>
      </div>
    </>
  );
};

export default SpeakInput;
