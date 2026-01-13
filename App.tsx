import React, { useState } from 'react';
import { StoreProvider } from './services/store';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import BookingsView from './components/BookingsView';
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
import { useStore } from './services/store';

const MainContent = () => {
  const { currentUser, isAuthenticated } = useStore();
  
  // Default view logic
  const getDefaultView = () => {
    if (!currentUser) return 'dashboard';
    if (currentUser.role === 'MOTORISTA') return 'driver-portal';
    if (currentUser.role === 'MECANICO') return 'maintenance';
    return 'dashboard';
  };

  const [currentView, setCurrentView] = useState('dashboard');

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

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'calendar': return <CalendarView />;
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
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
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