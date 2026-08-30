import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { SSEProvider } from './context/SSEContext.tsx';
import { ToastProvider } from './components/Toast/ToastProvider.tsx';
import { CyberPetProvider } from './components/CyberPet/CyberPetContext.tsx';
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
        <ToastProvider>
          <SSEProvider>
            <CyberPetProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </CyberPetProvider>
          </SSEProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

