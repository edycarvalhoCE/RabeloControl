import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Componente de Barreira de Erro para evitar tela branca silenciosa
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CRITICAL APP ERROR:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f8fafc',
          color: '#1e293b',
          fontFamily: 'system-ui, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{fontSize: '48px', marginBottom: '10px'}}>🤕</div>
          <h1 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#dc2626'}}>Ops! O sistema encontrou um erro.</h1>
          <p style={{marginBottom: '20px', color: '#64748b'}}>Não foi possível carregar a aplicação. Tente recarregar a página.</p>
          
          <div style={{
            background: '#fff', 
            border: '1px solid #cbd5e1', 
            padding: '15px', 
            borderRadius: '8px', 
            width: '100%', 
            maxWidth: '600px', 
            marginBottom: '20px',
            overflowX: 'auto',
            textAlign: 'left'
          }}>
            <p style={{fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px'}}>Detalhes do erro:</p>
            <code style={{fontSize: '11px', color: '#ef4444', display: 'block'}}>
              {this.state.error?.toString() || "Erro desconhecido"}
            </code>
          </div>

          <button
            onClick={() => {
              // Limpa caches antes de recarregar
              if(window.caches) {
                caches.keys().then(names => {
                  for (let name of names) caches.delete(name);
                });
              }
              localStorage.removeItem('app_version_tag'); // Força re-check de versão
              window.location.reload();
            }}
            style={{
              backgroundColor: '#2e2e77', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            🔄 Limpar Cache e Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);