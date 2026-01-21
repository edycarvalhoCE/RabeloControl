
import React, { useState, useEffect } from 'react';
import { StoreProvider } from './services/store';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import BookingsView from './components/BookingsView';
import NewBookingView from './components/NewBookingView';
import InventoryView from './components/InventoryView';
import FinanceView from './components/FinanceView';
import DriverPortal from './components/DriverPortal';
import CalendarView from './components/CalendarView';
import DocumentsView from './components/DocumentsView';
import MaintenanceView from './components/MaintenanceView';
import UsersView from './components/UsersView';
import VehiclesView from './components/VehiclesView';
import CharterView from './components/CharterView';
import TravelPackagesView from './components/TravelPackagesView';
import LoginView from './components/LoginView';
import SettingsView from './components/SettingsView';
import QuotesView from './components/QuotesView';
import { useStore } from './services/store';
import { UserRole } from './types';

const MainContent = () => {
  const { currentUser, isAuthenticated, logout, settings } = useStore();
  const [currentView, setCurrentViewInternal] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // --- NAVIGATION LOGIC (Fix for "O sistema não volta") ---
  // Updates the URL Hash, creating a history entry in the browser
  const setView = (viewId: string) => {
      window.location.hash = viewId;
  };

  useEffect(() => {
      const handleHashChange = () => {
          // Get hash without the '#' character
          const hash = window.location.hash.replace('#', '');
          
          if (hash) {
              setCurrentViewInternal(hash);
          } else if (isAuthenticated && currentUser) {
              // Default routing based on role if no hash is present
              let def = 'dashboard';
              if (currentUser.role === 'MOTORISTA') def = 'driver-portal';
              if (currentUser.role === 'MECANICO') def = 'maintenance';
              
              // Only redirect if we aren't already there (avoids loops)
              if (currentView !== def) {
                  window.location.hash = def;
              }
          }
      };

      // Listen for browser Back/Forward buttons
      window.addEventListener('hashchange', handleHashChange);
      
      // Trigger once on mount to handle bookmarks or reloads
      handleHashChange();

      return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, currentUser?.role]);


  if (!isAuthenticated) {
      return <LoginView />;
  }

  // Prevent crash if authenticated but user profile not yet loaded from Firestore
  if (!currentUser) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900">
              <div className="text-center">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400 font-medium">Carregando perfil...</p>
              </div>
          </div>
      );
  }

  // --- SYSTEM LOCK CHECK ---
  if (settings.subscriptionStatus === 'LOCKED' && currentUser.role !== UserRole.DEVELOPER) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
              <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-slate-600">
                  <div className="text-slate-600 mb-4 flex justify-center">
                      <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800 mb-2">Sistema em Manutenção</h1>
                  <p className="text-slate-600 mb-6">
                      O acesso ao sistema está temporariamente indisponível para uma atualização administrativa de rotina.
                  </p>
                  <div className="bg-slate-100 p-4 rounded-lg text-sm text-slate-700 mb-6">
                      <p className="font-bold mb-1">Previsão de Retorno:</p>
                      <p>Em breve. Entre em contato com a administração para mais informações.</p>
                  </div>
                  <button 
                    onClick={logout} 
                    className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700"
                  >
                      Sair e Tentar Mais Tarde
                  </button>
              </div>
              <p className="text-slate-500 mt-8 text-xs">Rabelo Controle &copy; 2026</p>
          </div>
      );
  }

  // PENDING APPROVAL SCREEN
  if (currentUser.status === 'PENDING') {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
                  <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Pendente</h2>
                  <p className="text-slate-600 mb-6">
                      Seu cadastro foi realizado com sucesso, mas o acesso ao sistema precisa ser aprovado por um <strong>Gerente</strong> ou <strong>Administrador</strong>.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-500 mb-6">
                      <p>Nome: {currentUser.name}</p>
                      <p>Email: {currentUser.email}</p>
                      <p>Função Solicitada: {currentUser.role}</p>
                  </div>
                  <button 
                    onClick={logout}
                    className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors w-full"
                  >
                      Sair e Tentar Mais Tarde
                  </button>
              </div>
          </div>
      );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'quotes': return <QuotesView />;
      case 'calendar': return <CalendarView />;
      case 'new-booking': return <NewBookingView />;
      case 'bookings': return <BookingsView />;
      case 'travel-packages': return <TravelPackagesView />;
      case 'vehicles': return <VehiclesView />;
      case 'charter': return <CharterView />;
      case 'inventory': return <InventoryView />; // System for parts input/output
      case 'documents': return <DocumentsView />;
      case 'finance': return <FinanceView />;
      case 'driver-portal': return <DriverPortal />;
      case 'maintenance': return <MaintenanceView />;
      case 'users': return <UsersView />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden relative">
      
      {/* DEVELOPER LOCK BANNER */}
      {settings.subscriptionStatus === 'LOCKED' && currentUser.role === UserRole.DEVELOPER && (
          <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-xs font-bold text-center py-1 z-50 shadow-md">
              ⚠️ MODO DE BLOQUEIO ATIVO: O sistema está inacessível para usuários comuns. (Você tem acesso pois é Desenvolvedor)
          </div>
      )}

      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md shrink-0 pt-8">
            <div className="font-extrabold text-xl">
                Rabelo<span className="text-blue-500">Tour</span>
            </div>
            <div className="flex gap-2">
                {/* Mobile Back Button (Now works with browser history) */}
                <button onClick={() => window.history.back()} className="p-2 text-slate-300 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <button onClick={() => setIsMobileOpen(true)} className="p-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
            </div>
        </div>

        <main className={`flex-1 overflow-y-auto p-4 md:p-8 ${settings.subscriptionStatus === 'LOCKED' && currentUser.role === UserRole.DEVELOPER ? 'pt-8' : ''}`}>
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainContent />
    </StoreProvider>
  );
}
