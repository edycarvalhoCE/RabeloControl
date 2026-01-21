
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

  const setView = (viewId: string) => {
      window.location.hash = viewId;
  };

  useEffect(() => {
      const handleHashChange = () => {
          const hash = window.location.hash.replace('#', '');
          if (hash) {
              setCurrentViewInternal(hash);
          } else if (isAuthenticated && currentUser) {
              let def = 'dashboard';
              if (currentUser.role === 'MOTORISTA') def = 'driver-portal';
              if (currentUser.role === 'MECANICO') def = 'maintenance';
              if (currentView !== def) {
                  window.location.hash = def;
              }
          }
      };
      window.addEventListener('hashchange', handleHashChange);
      handleHashChange();
      return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, currentUser?.role]);

  if (!isAuthenticated) {
      return <LoginView />;
  }

  if (!currentUser) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white flex-col gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p>Carregando perfil do usuário...</p>
          </div>
      );
  }

  // Se o usuário estiver PENDENTE
  if (currentUser.status === 'PENDING') {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Pendente</h2>
                  <p className="text-slate-600 mb-6">Aguarde a aprovação do gerente.</p>
                  <button onClick={logout} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700">Sair</button>
              </div>
          </div>
      );
  }

  const renderView = () => {
    try {
      switch (currentView) {
        case 'dashboard': return <Dashboard />;
        case 'quotes': return <QuotesView />;
        case 'calendar': return <CalendarView />;
        case 'new-booking': return <NewBookingView />;
        case 'bookings': return <BookingsView />;
        case 'travel-packages': return <TravelPackagesView />;
        case 'vehicles': return <VehiclesView />;
        case 'charter': return <CharterView />;
        case 'inventory': return <InventoryView />;
        case 'documents': return <DocumentsView />;
        case 'finance': return <FinanceView />;
        case 'driver-portal': return <DriverPortal />;
        case 'maintenance': return <MaintenanceView />;
        case 'users': return <UsersView />;
        case 'settings': return <SettingsView />;
        default: return <Dashboard />;
      }
    } catch (error) {
      console.error("Erro na visualização:", error);
      return <div className="p-8 text-red-600">Erro ao carregar esta tela. Tente recarregar a página.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden relative">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md shrink-0 pt-8">
            <div className="font-extrabold text-xl">Rabelo<span className="text-blue-500">Tour</span></div>
            <button onClick={() => setIsMobileOpen(true)} className="p-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{renderView()}</div>
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
