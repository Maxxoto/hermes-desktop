import { useState, useRef, useEffect, useCallback } from "react";
import { Cpu, ChevronDown, Check } from "lucide-react";
import { useModels, type ModelInfo } from "./use-models";
import { cn } from "../../lib/utils";

interface ModelPickerProps {
  value: string | null;
  onChange: (modelId: string) => void;
}

export default function ModelPicker({ value, onChange }: ModelPickerProps) {
  const { data: models = [], isLoading } = useModels();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = models.find((m) => m.id === value) ?? models[0];

  // Flatten models for keyboard nav
  const flatModels = models;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % flatModels.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flatModels.length) % flatModels.length);
          break;
        case "Enter":
          e.preventDefault();
          if (flatModels[activeIndex]) {
            onChange(flatModels[activeIndex].id);
            setOpen(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, flatModels, activeIndex, onChange],
  );

  // Group by provider
  const grouped = models.reduce(
    (acc, model) => {
      const provider = model.provider || "other";
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    },
    {} as Record<string, ModelInfo[]>,
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] animate-pulse dark:text-mac-tertiary-label light:text-gray-500 select-none">
        <Cpu className="w-3 h-3" />
        <span>Loading…</span>
      </div>
    );
  }

  if (models.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] dark:text-mac-tertiary-label light:text-gray-500 select-none">
        <Cpu className="w-3 h-3" />
        <span>{selected?.name ?? "Model"}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => { setOpen(!open); setActiveIndex(0); }}
        className="mac-icon-btn flex items-center gap-1.5 !w-auto !px-2 !h-8 text-[11px] dark:text-mac-secondary-label light:text-gray-600"
        aria-label="Select model"
        aria-expanded={open}
      >
        <Cpu className="w-3.5 h-3.5" />
        <span className="truncate max-w-[100px]">{selected?.name ?? "Model"}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 w-64 rounded-xl glass-surface py-1 shadow-xl max-h-[300px] overflow-y-auto">
          {Object.entries(grouped).map(([provider, providerModels]) => (
            <div key={provider}>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide uppercase dark:text-mac-tertiary-label light:text-gray-400">
                {provider}
              </div>
              {providerModels.map((model) => {
                const flatIndex = flatModels.indexOf(model);
                return (
                  <button
                    key={model.id}
                    onClick={() => { onChange(model.id); setOpen(false); }}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors text-left",
                      flatIndex === activeIndex && "dark:bg-white/[0.06] light:bg-black/[0.04]",
                      model.id === value
                        ? "dark:text-mac-accent light:text-blue-600"
                        : "dark:text-mac-label light:text-black",
                    )}
                  >
                    <Cpu className="w-3 h-3 flex-shrink-0 opacity-60" />
                    <span className="flex-1 truncate font-medium">{model.name}</span>
                    {model.id === value && <Check className="w-3 h-3 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
