import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGatewayClient, type Session, type SessionMessage } from '../connection/gateway-api';

const SESSIONS_KEY = ['sessions'] as const;

export function useSessions() {
  return useQuery<Session[]>({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const items = await getGatewayClient().listSessions();
      return items;
    },
    refetchInterval: 30_000,
  });
}

export function useSessionMessages(id: string | null) {
  return useQuery<SessionMessage[]>({
    queryKey: [...SESSIONS_KEY, 'messages', id],
    queryFn: async () => {
      if (!id) return [];
      const items = await getGatewayClient().getSessionMessages(id);
      return items;
    },
    enabled: id !== null,
  });
}

/**
 * Rename a session via PATCH. Uses optimistic update — the cache is
 * updated immediately and rolled back on error.
 */
export function useRenameSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      return getGatewayClient().patchSession(id, { title });
    },
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: SESSIONS_KEY });
      const prev = qc.getQueryData<Session[]>(SESSIONS_KEY);
      qc.setQueryData<Session[]>(SESSIONS_KEY, (old) =>
        old?.map((s) => (s.id === id ? { ...s, title } : s)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(SESSIONS_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

/**
 * Delete a session via DELETE. Removes from cache on success.
 */
export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await getGatewayClient().deleteSession(id);
      return id;
    },
    onSuccess: (deletedId) => {
      qc.setQueryData<Session[]>(SESSIONS_KEY, (old) =>
        old?.filter((s) => s.id !== deletedId),
      );
    },
  });
}

/**
 * Auto-title a session from the first user message.
 * Called after a successful chat response on the first exchange.
 */
export function useAutoTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const title = extractTitle(message);
      return getGatewayClient().patchSession(id, { title });
    },
    onMutate: async ({ id, message }) => {
      const title = extractTitle(message);
      await qc.cancelQueries({ queryKey: SESSIONS_KEY });
      const prev = qc.getQueryData<Session[]>(SESSIONS_KEY);
      qc.setQueryData<Session[]>(SESSIONS_KEY, (old) =>
        old?.map((s) => (s.id === id ? { ...s, title } : s)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(SESSIONS_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

/**
 * Extract a concise title from the first user message.
 * Takes the first ~50 characters, trimmed at word boundary.
 */
export function extractTitle(message: string): string {
  const trimmed = message.trim().replace(/\n+/g, ' ');
  if (trimmed.length <= 50) return trimmed;
  const slice = trimmed.slice(0, 50);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace < 20) return slice + '…';
  return slice.slice(0, lastSpace) + '…';
}
