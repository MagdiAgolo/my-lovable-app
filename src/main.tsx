import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.scss'
import App from './App'
import { GoogleAuthProvider } from './context/GoogleAuthContext'

// Using the correct Google OAuth Client ID
const GOOGLE_CLIENT_ID = '60283023975-mvo92q696q63cn8ip41vuvqmdufmg1k6.apps.googleusercontent.com';
const queryClient = new QueryClient()

// Make sure the DOM is fully loaded before rendering
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing app with Google OAuth');
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <GoogleAuthProvider>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </GoogleAuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
