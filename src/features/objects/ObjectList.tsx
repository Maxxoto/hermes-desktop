/**
 * ObjectList.tsx — Filterable list of all typed objects with type tabs.
 *
 * Tabs: All, Decisions, Actions, Snippets, Bookmarks, Contacts
 * Shows object count per type. Search bar at top.
 */
import { useState, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import { useObjectStore, OBJECT_TYPE_LABELS, OBJECT_TYPE_COLORS } from "./use-objects";
import { ObjectCard } from "./ObjectCard";
import { ObjectDetail } from "./ObjectDetail";
import type { TypedObject } from "./use-objects";

type FilterType = "all" | TypedObject["type"];

const TAB_LIST: Array<{ key: FilterType; label: string }> = [
  { key: "all", label: "All" },
  { key: "decision", label: "Decisions" },
  { key: "action", label: "Actions" },
  { key: "snippet", label: "Snippets" },
  { key: "bookmark", label: "Bookmarks" },
  { key: "contact", label: "Contacts" },
];

const TAB_ACTIVE_COLORS: Record<FilterType, string> = {
  all: "bg-white/10 text-mac-label",
  decision: "bg-orange-500/15 text-orange-400",
  action: "bg-blue-500/15 text-blue-400",
  snippet: "bg-green-500/15 text-green-400",
  bookmark: "bg-red-500/15 text-red-400",
  contact: "bg-purple-500/15 text-purple-400",
};

interface ObjectListProps {
  /** Optional: override the view toggle for external control */
  onOpen?: () => void;
}

export function ObjectList({ onOpen: _onOpen }: ObjectListProps) {
  const [activeTab, setActiveTab] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedObject, setSelectedObject] = useState<TypedObject | null>(null);

  const allObjects = useObjectStore((s) => s.objects);
  const removeObject = useObjectStore((s) => s.removeObject);
  const updateObject = useObjectStore((s) => s.updateObject);

  // Counts per type
  const typeCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: allObjects.length,
      decision: 0,
      action: 0,
      snippet: 0,
      bookmark: 0,
      contact: 0,
    };
    for (const obj of allObjects) {
      counts[obj.type]++;
    }
    return counts;
  }, [allObjects]);

  // Filtered objects
  const filteredObjects = useMemo(() => {
    let result = allObjects;
    if (activeTab !== "all") {
      result = result.filter((o) => o.type === activeTab);
    }
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(lower) ||
          o.content.toLowerCase().includes(lower) ||
          o.tags.some((t) => t.toLowerCase().includes(lower))
      );
    }
    return result;
  }, [allObjects, activeTab, searchQuery]);

  const handleDelete = useCallback(
    (id: string) => {
      removeObject(id);
      if (selectedObject?.id === id) {
        setSelectedObject(null);
      }
    },
    [removeObject, selectedObject]
  );

  const handleSelect = useCallback((obj: TypedObject) => {
    setSelectedObject(obj);
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--glass-gradient-dark)",
        backdropFilter: "blur(24px) saturate(200%)",
        WebkitBackdropFilter: "blur(24px) saturate(200%)",
      }}
      data-testid="object-list"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[18px] font-bold text-mac-label">Objects</h1>
          <span className="text-[12px] text-mac-tertiary-label">
            {allObjects.length} total
          </span>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mac-tertiary-label" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search objects..."
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-white/5 border border-white/10
                       text-[13px] text-mac-label outline-none
                       placeholder:text-mac-tertiary-label
                       focus:border-white/20 transition-colors"
            data-testid="object-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded
                         hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-mac-tertiary-label" />
            </button>
          )}
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {TAB_LIST.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium
                  transition-all duration-150
                  ${
                    isActive
                      ? TAB_ACTIVE_COLORS[tab.key]
                      : "text-mac-tertiary-label hover:text-mac-label hover:bg-white/5"
                  }
                `}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
                {typeCounts[tab.key] > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    {typeCounts[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredObjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-[40px] mb-3 opacity-30">📦</div>
            <p className="text-[13px] text-mac-tertiary-label">
              {searchQuery
                ? "No objects match your search"
                : "No objects extracted yet"}
            </p>
            <p className="text-[11px] text-mac-tertiary-label mt-1 opacity-60">
              Objects are auto-extracted from your conversations
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredObjects.map((obj) => (
              <ObjectCard
                key={obj.id}
                obj={obj}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail overlay */}
      {selectedObject && (
        <ObjectDetail
          obj={selectedObject}
          onClose={() => setSelectedObject(null)}
          onUpdate={(id, updates) => {
            updateObject(id, updates);
            setSelectedObject((prev) =>
              prev && prev.id === id ? { ...prev, ...updates } : prev
            );
          }}
        />
      )}
    </div>
  );
}
