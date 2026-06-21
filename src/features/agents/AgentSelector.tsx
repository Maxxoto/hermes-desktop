import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, ChevronDown, Check } from "lucide-react";
import { useAgents, type AgentInfo } from "./use-agents";
import { cn } from "../../lib/utils";

interface AgentSelectorProps {
  value: string | null;
  onChange: (agentId: string) => void;
}

export default function AgentSelector({ value, onChange }: AgentSelectorProps) {
  const { data: agents = [], isLoading } = useAgents();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = agents.find((a) => a.id === value) ?? agents[0];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % agents.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + agents.length) % agents.length);
          break;
        case "Enter":
          e.preventDefault();
          if (agents[activeIndex]) {
            onChange(agents[activeIndex].id);
            setOpen(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, agents, activeIndex, onChange],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] animate-pulse dark:text-mac-tertiary-label light:text-gray-500 select-none">
        <Bot className="w-3 h-3" />
        <span>Loading…</span>
      </div>
    );
  }

  // If only one agent, show compact label (no dropdown)
  if (agents.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] dark:text-mac-tertiary-label light:text-gray-500 select-none">
        <Bot className="w-3 h-3" />
        <span>{selected?.name ?? "Agent"}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => { setOpen(!open); setActiveIndex(0); }}
        className="mac-icon-btn flex items-center gap-1.5 !w-auto !px-2 !h-8 text-[11px] dark:text-mac-secondary-label light:text-gray-600"
        aria-label="Select agent"
        aria-expanded={open}
      >
        <Bot className="w-3.5 h-3.5" />
        <span className="truncate max-w-[80px]">{selected?.name ?? "Agent"}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-xl glass-surface py-1 shadow-xl">
          {agents.map((agent, index) => (
            <button
              key={agent.id}
              onClick={() => { onChange(agent.id); setOpen(false); }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors text-left",
                index === activeIndex && "dark:bg-white/[0.06] light:bg-black/[0.04]",
                agent.id === value
                  ? "dark:text-mac-accent light:text-blue-600"
                  : "dark:text-mac-label light:text-black",
              )}
            >
              <Bot className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{agent.name}</div>
                {agent.description && (
                  <div className="text-[10px] dark:text-mac-tertiary-label light:text-gray-400 truncate">{agent.description}</div>
                )}
              </div>
              {agent.id === value && <Check className="w-3 h-3 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
