import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Command, Zap, Globe, Layers, Terminal, Palette, FileText } from "lucide-react";

const COMMANDS = [
  { id: "hero", label: "Go to Top", desc: "Scroll to hero section", icon: ArrowRight, category: "Navigation", action: "scroll-top" },
  { id: "identity", label: "Identity Layer", desc: "Jump to identity section", icon: Layers, category: "Navigation", action: "scroll-identity" },
  { id: "archive", label: "Neural Archive", desc: "Browse the archive", icon: Globe, category: "Navigation", action: "scroll-archive" },
  { id: "terminal", label: "Open Terminal", desc: "Launch ZOE_OS terminal", icon: Terminal, category: "System", action: "terminal" },
  { id: "zoe-mode", label: "Toggle Zoe Mode", desc: "Enter neural overdrive", icon: Zap, category: "System", action: "zoe-mode" },
  { id: "theme", label: "Theme Settings", desc: "Adjust visual preferences", icon: Palette, category: "System", action: "none" },
  { id: "manifesto", label: "Read Manifesto", desc: "View the ZOE_OS manifesto", icon: FileText, category: "Content", action: "scroll-manifesto" },
];

export default function CommandPalette({ isOpen, onClose, onAction }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIdx]) {
        e.preventDefault();
        onAction(filtered[selectedIdx].action);
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, selectedIdx, onAction, onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-start justify-center pt-[20vh] px-4"
          style={{ background: "rgba(4,2,14,0.75)", backdropFilter: "blur(16px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: -10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -10, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_0_80px_rgba(139,92,246,0.08)] overflow-hidden"
            style={{ borderRadius: "2px" }}
          >
            {/* Search bar */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5">
              <Search size={16} className="text-white/30 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command..."
                className="flex-1 bg-transparent outline-none text-lg text-white font-light placeholder:text-white/15"
              />
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/10 font-mono text-[10px] text-white/30 tracking-wider">
                <Command size={10} />K
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="px-6 py-12 text-center text-white/20 font-light text-sm">
                  No commands found
                </div>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      onAction(cmd.action);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIdx(i)}
                    className={`w-full flex items-center gap-5 px-6 py-4 text-left transition-colors ${
                      i === selectedIdx
                        ? "bg-white/[0.06] border-l-2 border-purple-500/60"
                        : "border-l-2 border-transparent hover:bg-white/[0.03]"
                    }`}
                  >
                    <cmd.icon
                      size={16}
                      className={`shrink-0 ${
                        i === selectedIdx ? "text-purple-400" : "text-white/20"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{cmd.label}</div>
                      <div className="text-xs text-white/25 font-light truncate">{cmd.desc}</div>
                    </div>
                    <span className="text-[9px] font-mono uppercase text-white/10 tracking-wider shrink-0">
                      {cmd.category}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-6 px-6 py-3 border-t border-white/5 font-mono text-[9px] text-white/15 uppercase tracking-wider">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
