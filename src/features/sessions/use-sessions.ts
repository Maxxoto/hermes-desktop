import { useQuery } from '@tanstack/react-query';
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
