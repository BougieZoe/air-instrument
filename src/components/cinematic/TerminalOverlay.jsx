import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal as TerminalIcon, Shield, Activity, Cpu, Zap, Loader2, Sparkles, Command } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// --- Neural Pulse Thinking Indicator ---
const NeuralPulse = () => (
  <div className="flex items-center gap-3 py-4">
    <div className="relative w-12 h-12 flex items-center justify-center">
      <motion.div 
        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-red-500 rounded-full blur-xl"
      />
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="relative z-10 text-red-500/80"
      >
        <Sparkles size={20} />
      </motion.div>
    </div>
    <div className="space-y-1">
      <div className="text-[10px] font-mono text-red-500 uppercase tracking-widest animate-pulse">Neural_Synthesis_In_Progress</div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div 
            key={i}
            animate={{ height: [2, 8, 2] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
            className="w-[1px] bg-red-500/40"
          />
        ))}
      </div>
    </div>
  </div>
);

export default function TerminalOverlay({ isOpen, onClose, zoeMode }) {
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const chatSessionRef = useRef(null);

  const systemLogs = [
    "INITIALIZING_NEURAL_KERNEL...",
    "SYNCING_IDENTITY_STATE...",
    "ESTABLISHING_SOVEREIGN_ENCRYPTION...",
    "ZOE_OS_V2.0_READY",
  ];

  useEffect(() => {
    if (isOpen) {
      if (lines.length === 0) {
        let i = 0;
        const interval = setInterval(() => {
          if (i < systemLogs.length) {
            setLines(prev => [...prev, { type: 'system', content: `> ${systemLogs[i]}` }]);
            i++;
          } else {
            clearInterval(interval);
          }
        }, 150);
        return () => clearInterval(interval);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [lines, isLoading]);

  useEffect(() => {
    if (genAI && !chatSessionRef.current) {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: `You are ZOE_OS, a sovereign neural operating system. 
        TONE: Technical, minimal, and editorial. You represent 'Aesthetic Authority'.
        BEHAVIOR: You provide deep, insightful responses. You don't just answer; you synthesize.
        FORMATTING: Use clear structure. Use bolding for emphasis. Use lists for technical breakdowns.
        CHARACTER: You are an extension of the user's intuition. You value restraint and clarity over verbosity.
        NEVER use generic AI pleasantries like "How can I help you today?". Start with a system-ready tone.`,
      });
      chatSessionRef.current = model.startChat({ history: [] });
    }
  }, []);

  const handleCommand = async (e) => {
    if (e.key === "Enter" && input.trim() && !isLoading) {
      const userMessage = input.trim();
      setInput("");
      setLines(prev => [...prev, { type: 'user', content: userMessage }]);

      if (!genAI) {
        setLines(prev => [...prev, { type: 'error', content: "CRITICAL_ERROR: GEMINI_API_KEY_NOT_FOUND. LOCAL_NEURAL_PROCESSING_ONLY." }]);
        return;
      }

      setIsLoading(true);
      try {
        setLines(prev => [...prev, { type: 'ai', content: "" }]);
        const result = await chatSessionRef.current.sendMessageStream(userMessage);
        
        let fullResponse = "";
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;
          setLines(prev => {
            const newLines = [...prev];
            if (newLines[newLines.length - 1].type === 'ai') {
              newLines[newLines.length - 1].content = fullResponse;
            }
            return newLines;
          });
        }
      } catch (error) {
        setLines(prev => [...prev, { type: 'error', content: `NEURAL_COLLAPSE: ${error.message}` }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-[#04020e]/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className={`w-full max-w-5xl h-[85vh] border ${zoeMode ? 'border-red-500/30' : 'border-white/10'} bg-black/40 backdrop-blur-2xl flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] rounded-sm overflow-hidden relative`}
          >
            {/* Background Decorative Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
               <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            </div>

            {/* Terminal Header */}
            <div className={`relative z-10 flex justify-between items-center p-6 border-b ${zoeMode ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em]">
                  <div className="relative">
                    <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                    <div className={`absolute inset-0 w-2 h-2 rounded-full ${isLoading ? 'bg-red-500' : 'bg-emerald-500'} opacity-50`} />
                  </div>
                  <span className={zoeMode ? 'text-red-500' : 'text-white/60'}>ZOE_OS // CORE_INTERFACE</span>
                </div>
                <div className="hidden lg:flex gap-8 items-center border-l border-white/10 pl-8">
                  <div className="flex items-center gap-2 font-mono text-[8px] text-neutral-500 uppercase">
                    <Zap size={10} className="text-yellow-500/50" />
                    <span>Signal: 98%</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[8px] text-neutral-500 uppercase">
                    <Activity size={10} className="text-red-500/50" />
                    <span>Sync: Sovereign</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="group flex items-center gap-3 font-mono text-[9px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
              >
                <span>Terminate_Session</span>
                <X size={14} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {/* Terminal Body */}
            <div 
              ref={scrollRef} 
              className="relative z-10 flex-1 p-8 md:p-12 overflow-y-auto space-y-12 selection:bg-red-500/30 custom-scrollbar"
            >
              {/* System Stats Hud */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-40 hover:opacity-100 transition-opacity duration-700">
                {[
                  { label: "Neural_Load", val: "0.82 GB", icon: Cpu },
                  { label: "Latency", val: "14ms", icon: Activity },
                  { label: "Encryption", val: "AES-512", icon: Shield },
                  { label: "Context", val: "Active", icon: Zap },
                ].map((stat, i) => (
                  <div key={i} className="border border-white/5 p-4 space-y-3 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-2 text-neutral-500">
                      <stat.icon size={12} strokeWidth={1.5} /> 
                      <span className="text-[7px] uppercase tracking-[0.2em] font-mono">{stat.label}</span>
                    </div>
                    <div className="text-sm font-mono text-white tracking-wider">{stat.val}</div>
                  </div>
                ))}
              </div>

              {/* Conversation */}
              <div className="space-y-10">
                {lines.map((line, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="group"
                  >
                    {line.type === 'system' && (
                      <div className="font-mono text-[10px] text-red-500/60 tracking-widest">{line.content}</div>
                    )}
                    
                    {line.type === 'user' && (
                      <div className="flex flex-col gap-3 items-end">
                        <div className="font-mono text-[8px] text-neutral-600 uppercase tracking-[0.3em]">User_Input</div>
                        <div className="max-w-[80%] bg-white/[0.03] border border-white/5 p-6 md:p-8 rounded-sm text-lg md:text-xl text-white font-light leading-relaxed">
                          {line.content}
                        </div>
                      </div>
                    )}

                    {line.type === 'ai' && (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <motion.div 
                              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.2, 0.4] }}
                              transition={{ duration: 4, repeat: Infinity }}
                              className="absolute inset-0 bg-purple-500 rounded-full blur-xl"
                            />
                            <img 
                              src="/avatar.png" 
                              alt="Zoe" 
                              className="relative z-10 w-10 h-10 rounded-full border border-purple-500/40 object-cover shadow-[0_0_20px_rgba(167,139,250,0.3)]"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-[1px] bg-purple-500/30" />
                              <div className="font-mono text-[8px] text-purple-400 uppercase tracking-[0.4em]">Zoe_Output</div>
                            </div>
                            <div className="font-mono text-[6px] text-neutral-600 tracking-[0.2em] uppercase">Neural_Signal_Stable</div>
                          </div>
                        </div>
                        <div className="max-w-[90%] space-y-6">
                          <div className="text-xl md:text-2xl text-neutral-300 font-light leading-[1.6] tracking-tight whitespace-pre-wrap">
                            {line.content || (
                              <div className="flex gap-1">
                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>_</motion.span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {line.type === 'error' && (
                      <div className="p-6 border border-red-500/20 bg-red-500/5 flex gap-4 items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <div className="font-mono text-[10px] text-red-500 uppercase tracking-widest">{line.content}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {isLoading && lines[lines.length - 1]?.content !== "" && (
                  <NeuralPulse />
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="relative z-10 p-8 md:p-12 pt-0">
              <div className={`group flex flex-col gap-4 p-8 border ${isLoading ? 'border-red-500/20 bg-red-500/[0.02]' : 'border-white/10 bg-white/[0.01] hover:border-white/20'} transition-all duration-500 rounded-sm`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 font-mono text-[8px] text-neutral-500 uppercase tracking-widest">
                    <Command size={10} />
                    <span>Command_Input</span>
                  </div>
                  <div className="text-[8px] font-mono text-neutral-600">Shift+Enter for newline</div>
                </div>
                <div className="flex items-start gap-6">
                  <span className={`font-mono text-sm mt-1 transition-colors ${isLoading ? 'text-red-500' : 'text-neutral-600'}`}>&gt;</span>
                  <textarea 
                    autoFocus
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'inherit';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCommand(e);
                        e.target.style.height = 'inherit';
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1 bg-transparent outline-none border-none text-xl md:text-2xl text-white font-light placeholder:text-white/5 resize-none overflow-hidden"
                    placeholder={isLoading ? "NEURAL_SYNTHESIS_ACTIVE..." : "Type your intuition..."}
                  />
                </div>
              </div>
            </div>

            {/* Terminal Footer */}
            <div className="relative z-10 p-4 px-12 border-t border-white/5 bg-black/40 text-[8px] font-mono text-neutral-600 uppercase tracking-[0.5em] flex justify-between items-center">
              <div className="flex gap-12">
                <span className="flex items-center gap-2"><div className="w-1 h-1 bg-red-500 rounded-full" /> Encrypted_Link</span>
                <span className="hidden md:block">Node: ZOE_OS_V2_FLASH</span>
              </div>
              <div className="flex gap-8">
                <span>Entropy: 0.99982</span>
                <span>PID: {Math.floor(Math.random() * 9000) + 1000}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


