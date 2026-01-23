
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
import ClientsView from './components/ClientsView'; // Import
import LoginView from './components/LoginView';
import SettingsView from './components/SettingsView';
import QuotesView from './components/QuotesView';
import { useStore } from './services/store';

const MainContent = () => {
  const { currentUser, isAuthenticated, logout } = useStore();
  
  // Default view logic
  const getDefaultView = () => {
    if (!currentUser) return 'dashboard';
    if (currentUser.role === 'MOTORISTA' || currentUser.role === 'AUX_GARAGEM') return 'driver-portal';
    if (currentUser.role === 'MECANICO') return 'maintenance';
    return 'dashboard';
  };

  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // React to auth changes and role changes
  React.useEffect(() => {
    if (isAuthenticated && currentUser) {
        setCurrentView(getDefaultView());
    }
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
      case 'clients': return <ClientsView />; // Nova Rota
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
  };

  // Check if current user is NOT a driver (Drivers already have their own bottom nav in DriverPortal)
  const showMainBottomNav = currentUser.role !== 'MOTORISTA' && currentUser.role !== 'AUX_GARAGEM';

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header (Only visible if NOT showing bottom nav, or maybe simplified) 
            Actually, let's keep it simple: top header always visible on mobile for Logo 
        */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md shrink-0">
            <div className="font-extrabold text-xl">
                Rabelo<span className="text-blue-500">Tour</span>
            </div>
            {/* If we have bottom nav, we might not need this top hamburger, but keeping it as backup is okay.
                However, for cleaner UI with bottom nav, we usually remove top hamburger.
                Let's keep it for now as a secondary way or remove it if Bottom Nav has "Menu".
            */}
            {!showMainBottomNav && (
                <button onClick={() => setIsMobileOpen(true)} className="p-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
            )}
        </div>

        <main className={`flex-1 overflow-y-auto p-4 md:p-8 ${showMainBottomNav ? 'pb-24' : ''}`}>
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>

        {/* NEW: MOBILE BOTTOM NAVIGATION FOR ADMINS/MANAGERS */}
        {showMainBottomNav && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex justify-around items-center">
                <button 
                    onClick={() => setCurrentView('dashboard')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    <span className="text-[10px] font-bold">Início</span>
                </button>

                <button 
                    onClick={() => setCurrentView('calendar')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'calendar' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-[10px] font-bold">Agenda</span>
                </button>

                <button 
                    onClick={() => setCurrentView('bookings')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'bookings' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-[10px] font-bold">Viagens</span>
                </button>

                <button 
                    onClick={() => setIsMobileOpen(true)}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isMobileOpen ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    <span className="text-[10px] font-bold">Menu</span>
                </button>
            </div>
        )}
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
