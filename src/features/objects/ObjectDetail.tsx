/**
 * ObjectDetail.tsx — Expanded object view with all metadata, edit capability,
 * full content display.
 */
import { useState, useCallback } from "react";
import {
  X,
  Lightbulb,
  CheckSquare,
  Code2,
  Link,
  User,
  Pencil,
  Save,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import type { TypedObject } from "./use-objects";
import { OBJECT_TYPE_LABELS } from "./use-objects";

const TYPE_ICONS: Record<TypedObject["type"], React.ElementType> = {
  decision: Lightbulb,
  action: CheckSquare,
  snippet: Code2,
  bookmark: Link,
  contact: User,
};

const TYPE_ACCENT: Record<TypedObject["type"], string> = {
  decision: "text-orange-400",
  action: "text-blue-400",
  snippet: "text-green-400",
  bookmark: "text-red-400",
  contact: "text-purple-400",
};

interface ObjectDetailProps {
  obj: TypedObject;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<TypedObject>) => void;
}

export function ObjectDetail({ obj, onClose, onUpdate }: ObjectDetailProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(obj.title);
  const [content, setContent] = useState(obj.content);
  const [tagsInput, setTagsInput] = useState(obj.tags.join(", "));

  const Icon = TYPE_ICONS[obj.type];

  const handleSave = useCallback(() => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    onUpdate(obj.id, { title, content, tags });
    setEditing(false);
  }, [obj.id, title, content, tagsInput, onUpdate]);

  const handleCancel = useCallback(() => {
    setTitle(obj.title);
    setContent(obj.content);
    setTagsInput(obj.tags.join(", "));
    setEditing(false);
  }, [obj]);

  const formattedTime = new Date(obj.timestamp).toLocaleString();

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      data-testid="object-detail-overlay"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: "rgba(0, 0, 0, 0.5)" }}
        onClick={onClose}
      />

      {/* Detail card */}
      <div
        className="relative w-[90vw] max-w-[600px] max-h-[80vh] flex flex-col
                   rounded-2xl overflow-hidden"
        style={{
          background: "var(--glass-gradient-dark)",
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          border: "1px solid var(--glass-border-color)",
          boxShadow: `
            0 24px 80px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.06)
          `,
        }}
      >
        {/* Reflection */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: "var(--glass-reflection)", opacity: 0.2 }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4 glass-border-b">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${TYPE_ACCENT[obj.type]}`} />
            <div>
              <h2 className="text-[15px] font-semibold text-mac-label">
                {editing ? (
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-transparent border-b border-mac-tertiary-label
                               text-mac-label outline-none w-full"
                    data-testid="detail-title-input"
                  />
                ) : (
                  obj.title
                )}
              </h2>
              <span className="text-[11px] text-mac-tertiary-label">
                {OBJECT_TYPE_LABELS[obj.type]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-green-400"
                  title="Save"
                  data-testid="detail-save-btn"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-mac-tertiary-label"
                  title="Cancel"
                  data-testid="detail-cancel-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-mac-tertiary-label"
                  title="Edit object"
                  data-testid="detail-edit-btn"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-mac-tertiary-label"
                  title="Close"
                  data-testid="detail-close-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto px-5 py-4">
          {editing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-48 bg-white/5 border border-white/10 rounded-lg
                         text-[13px] text-mac-label p-3 outline-none resize-y
                         font-mono"
              data-testid="detail-content-input"
            />
          ) : obj.type === "snippet" ? (
            <pre
              className="bg-black/30 rounded-lg p-4 text-[13px] text-green-300
                         font-mono overflow-x-auto whitespace-pre-wrap"
            >
              {obj.content}
            </pre>
          ) : obj.type === "bookmark" && obj.metadata.url ? (
            <div className="space-y-3">
              <p className="text-[13px] text-mac-label break-all">
                {obj.content}
              </p>
              <a
                href={obj.metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-blue-400
                           hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open link
              </a>
            </div>
          ) : (
            <p className="text-[13px] text-mac-label leading-relaxed whitespace-pre-wrap">
              {obj.content}
            </p>
          )}

          {/* Metadata section */}
          {Object.keys(obj.metadata).filter((k) => !k.startsWith("_")).length >
            0 && (
            <div className="mt-5 pt-4 glass-border-t">
              <h4 className="text-[11px] font-semibold text-mac-tertiary-label uppercase tracking-wide mb-2">
                Metadata
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(obj.metadata)
                  .filter(([k]) => !k.startsWith("_"))
                  .map(([key, value]) => (
                    <div key={key} className="text-[12px]">
                      <span className="text-mac-tertiary-label">{key}: </span>
                      <span className="text-mac-label">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="mt-4 pt-3 glass-border-t">
            <h4 className="text-[11px] font-semibold text-mac-tertiary-label uppercase tracking-wide mb-2">
              Tags
            </h4>
            {editing ? (
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Comma-separated tags"
                className="w-full bg-white/5 border border-white/10 rounded-lg
                           text-[12px] text-mac-label p-2 outline-none"
                data-testid="detail-tags-input"
              />
            ) : obj.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {obj.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-white/5
                               text-mac-tertiary-label border border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-mac-tertiary-label italic">
                No tags
              </span>
            )}
          </div>

          {/* Source session */}
          <div className="mt-4 pt-3 glass-border-t">
            <h4 className="text-[11px] font-semibold text-mac-tertiary-label uppercase tracking-wide mb-2">
              Source
            </h4>
            <div className="flex items-center gap-2 text-[12px] text-mac-tertiary-label">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Session: {obj.sessionId}</span>
            </div>
            <div className="text-[11px] text-mac-tertiary-label mt-1">
              {formattedTime}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
