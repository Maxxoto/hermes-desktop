import {
  Terminal,
  Smartphone,
  Globe,
  Bot,
  MessageSquare,
} from 'lucide-react';
import type { Session } from '../connection/gateway-api';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
}

const sourceIconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  terminal: Terminal,
  cli: Terminal,
  mobile: Smartphone,
  phone: Smartphone,
  web: Globe,
  browser: Globe,
  api: Globe,
};

function getSourceIcon(source: string) {
  const Icon = sourceIconMap[source.toLowerCase()] ?? Bot;
  return Icon;
}

function formatRelativeTime(epochSec: number): string {
  const now = Date.now();
  const then = epochSec * 1000;
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;

  return new Date(epochSec * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getDisplayTitle(session: Session): string {
  if (session.title && session.title.trim().length > 0) {
    return session.title;
  }
  return 'New conversation';
}

export default function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  const Icon = getSourceIcon(session.source);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors cursor-pointer
        ${isActive
          ? 'bg-blue-900/50 border-l-2 border-blue-500'
          : 'hover:bg-gray-800/50 border-l-2 border-transparent'
        }`}
    >
      <div className="mt-0.5 shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-100 truncate">
            {getDisplayTitle(session)}
          </span>
          <span className="text-xs text-gray-500 shrink-0">
            {formatRelativeTime(session.last_active)}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <MessageSquare className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">
            {session.message_count} {session.message_count === 1 ? 'message' : 'messages'}
          </span>
          {session.model && (
            <>
              <span className="text-xs text-gray-600">·</span>
              <span className="text-xs text-gray-500 truncate">{session.model}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
