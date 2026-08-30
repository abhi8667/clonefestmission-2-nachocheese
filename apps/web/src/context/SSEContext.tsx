import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { SSEMessage } from '@triarc/shared-types';
import { useAuth } from './AuthContext.tsx';
import { useToast } from '../components/Toast/ToastProvider.tsx';

interface SSEContextType {
  lastEvent: SSEMessage | null;
  isConnected: boolean;
}

const SSEContext = createContext<SSEContextType>({
  lastEvent: null,
  isConnected: false,
});

/** Reconnect backoff bounds for the event stream. */
const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

/** Maps SSE event types → toast copy */
function toastForEvent(event: SSEMessage, currentUserId?: string) {
  const data = event.data as any;

  switch (event.type) {
    case 'bug:updated': {
      const isAuto = data?.automated;
      if (isAuto) {
        return {
          kind: 'automated' as const,
          title: `🤖 Automated — Bug #${data?.bug_id ?? '?'} → ${data?.new_status ?? 'updated'}`,
          body: data?.git_ref ? `via git push · ${data.git_ref}` : 'via webhook',
          durationMs: 6000,
        };
      }
      return {
        kind: 'info' as const,
        title: `Bug #${data?.bug_id ?? '?'} updated`,
        body: data?.field ? `${data.field}: ${data.old_value ?? '—'} → ${data.new_value}` : undefined,
        durationMs: 4000,
      };
    }

    case 'flag:created': {
      if (data?.requestee_id === currentUserId) {
        return {
          kind: 'flag' as const,
          title: `📬 New ${data?.type_name ?? 'flag'} request on Bug #${data?.bug_id}`,
          body: `from @${data?.setter_username ?? 'someone'} — awaiting your response`,
          durationMs: 7000,
        };
      }
      return null; // don't spam other users
    }

    case 'flag:resolved': {
      if (data?.setter_id === currentUserId) {
        const verb = data?.status === '+' ? '✅ Granted' : '❌ Denied';
        return {
          kind: data?.status === '+' ? 'success' as const : 'warning' as const,
          title: `${verb} — ${data?.type_name ?? 'flag'} on Bug #${data?.bug_id}`,
          body: `by @${data?.resolver_username ?? 'reviewer'}`,
          durationMs: 5000,
        };
      }
      return null;
    }

    case 'bug:created': {
      return {
        kind: 'success' as const,
        title: `Bug #${data?.bug_id ?? '?'} filed`,
        body: data?.title?.slice(0, 60),
        durationMs: 3500,
      };
    }

    case 'presence:changed':
      return null; // silent

    default:
      return null;
  }
}

export const SSEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [lastEvent, setLastEvent] = useState<SSEMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Suppress toasts for the first burst of events on connect
  const suppressUntil = useRef<number>(Date.now() + 2000);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let attempt = 0;

    // Exponential backoff with jitter: a downed API shouldn't be hammered
    // once per 3s by every open tab.
    function nextDelay(): number {
      const base = Math.min(BASE_RECONNECT_MS * 2 ** attempt, MAX_RECONNECT_MS);
      attempt++;
      return base + Math.random() * (base * 0.3); // ±30% jitter, de-synchronises tabs
    }

    function connect() {
      if (cancelled) return;
      suppressUntil.current = Date.now() + 2000;
      const url = currentUser ? `/api/stream?userId=${currentUser.id}` : '/api/stream';
      const es = new EventSource(url);
      eventSource = es;

      es.onopen = () => {
        if (es !== eventSource) return;
        attempt = 0; // healthy again — next drop retries fast
        setIsConnected(true);
      };

      es.onmessage = (ev) => {
        if (es !== eventSource) return;
        try {
          const parsed = JSON.parse(ev.data) as SSEMessage;
          setLastEvent(parsed);

          // Fire toast (suppress initial burst)
          if (Date.now() > suppressUntil.current) {
            const t = toastForEvent(parsed, currentUser?.id);
            if (t) addToast(t);
          }
        } catch {
          // ignore malformed
        }
      };

      es.onerror = () => {
        // onerror can fire repeatedly, and superseded streams can fire late.
        // Both would stack reconnects and flatten the backoff, so retire this
        // stream and keep exactly one retry in flight.
        if (es !== eventSource || cancelled) return;
        setIsConnected(false);
        es.onopen = null;
        es.onmessage = null;
        es.onerror = null;
        es.close();
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connect, nextDelay());
      };
    }

    connect();

    return () => {
      cancelled = true;
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [currentUser?.id, addToast]);

  return (
    <SSEContext.Provider value={{ lastEvent, isConnected }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => useContext(SSEContext);
