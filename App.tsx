
import React, { useState } from 'react';
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
import ClientsView from './components/ClientsView'; 
import LoginView from './components/LoginView';
import SettingsView from './components/SettingsView';
import QuotesView from './components/QuotesView';
import { useStore } from './services/store';
import { UserRole } from './types';

const MainContent = () => {
  const { currentUser, isAuthenticated, logout } = useStore();
  
  // Default view logic per role
  const getDefaultView = () => {
    if (!currentUser) return 'dashboard';
    if (currentUser.role === UserRole.DRIVER || currentUser.role === UserRole.GARAGE_AUX) return 'driver-schedule';
    if (currentUser.role === UserRole.MECHANIC) return 'maintenance';
    if (currentUser.role === UserRole.AGENT) return 'dashboard';
    return 'dashboard';
  };

  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // React to auth changes and role changes
  React.useEffect(() => {
    if (isAuthenticated && currentUser) {
        setCurrentView(getDefaultView());
    }
  }, [isAuthenticated, currentUser?.id, currentUser?.role]);

  if (!isAuthenticated) {
      return <LoginView />;
  }

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
                  <button 
                    onClick={logout}
                    className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors w-full"
                  >
                      Sair
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
      case 'clients': return <ClientsView />;
      case 'vehicles': return <VehiclesView />;
      case 'charter': return <CharterView />;
      case 'inventory': 
      case 'fuel': return <InventoryView />;
      case 'documents': return <DocumentsView />;
      case 'finance': return <FinanceView />;
      
      // Portal do Colaborador Individualizado
      case 'driver-schedule': return <DriverPortal view="schedule" />;
      case 'driver-finance': return <DriverPortal view="finance" />;
      case 'driver-report': return <DriverPortal view="report" />;

      case 'maintenance': return <MaintenanceView />;
      case 'users': return <UsersView />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  const getContextTitle = () => {
      if (currentUser.role === UserRole.DRIVER) return 'Operacional';
      if (currentUser.role === UserRole.MECHANIC) return 'Manutenção';
      return 'Rabelo Tour';
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header (UNIFICADO) */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg shrink-0 z-50">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileOpen(true)} className="p-1 -ml-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
                <div className="font-bold text-sm uppercase tracking-wider">{getContextTitle()}</div>
            </div>
            <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-white/20" alt="" />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
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
