import React, { createContext, useContext, useEffect, useState } from 'react';
import { SSEMessage } from '@triarc/shared-types';
import { useAuth } from './AuthContext.tsx';

interface SSEContextType {
  lastEvent: SSEMessage | null;
  isConnected: boolean;
}

const SSEContext = createContext<SSEContextType>({
  lastEvent: null,
  isConnected: false
});

export const SSEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [lastEvent, setLastEvent] = useState<SSEMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connect() {
      const url = currentUser ? `/api/stream?userId=${currentUser.id}` : '/api/stream';
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as SSEMessage;
          setLastEvent(parsed);
        } catch (err) {
          // Ignored
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [currentUser?.id]);

  return (
    <SSEContext.Provider value={{ lastEvent, isConnected }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => useContext(SSEContext);
