import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { SSEProvider } from './context/SSEContext.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SSEProvider>
          <App />
        </SSEProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
