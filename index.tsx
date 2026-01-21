
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Fallback visual caso o HTML esteja quebrado
  document.body.innerHTML = '<div style="color:red; padding:20px;">Erro Fatal: Elemento root não encontrado no HTML. Verifique o index.html.</div>';
  throw new Error("Elemento root não encontrado");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Erro ao iniciar React:", error);
  rootElement.innerHTML = '<div style="color:red; padding:20px;">Erro ao carregar aplicação. Verifique o console.</div>';
}
