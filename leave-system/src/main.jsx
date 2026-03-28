import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";
import { AlertProvider } from "./context/AlertContext.jsx";
import { AuthProvider } from './context/AuthContext.jsx';
import { LoadingProvider } from './context/LoadingContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AlertProvider>
        <AuthProvider>
          <LoadingProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </LoadingProvider>
        </AuthProvider>
      </AlertProvider>
    </BrowserRouter>
  </StrictMode>
)
