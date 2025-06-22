import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.scss'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'

const queryClient = new QueryClient()

// Make sure the DOM is fully loaded before rendering
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing app with Google OAuth');
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
