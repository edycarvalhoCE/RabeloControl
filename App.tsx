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
import { useStore } from './services/store';

const MainContent = () => {
  const { currentUser } = useStore();
  // Default view based on role
  const getDefaultView = () => {
    if (currentUser.role === 'MOTORISTA') return 'driver-portal';
    if (currentUser.role === 'MECANICO') return 'maintenance';
    return 'dashboard';
  };

  const [currentView, setCurrentView] = useState(getDefaultView());

  // Update view if user role changes and they lose access to current view
  React.useEffect(() => {
    const role = currentUser.role;
    if (role === 'MOTORISTA' && currentView !== 'driver-portal') {
      setCurrentView('driver-portal');
    } else if (role === 'MECANICO' && currentView !== 'maintenance' && currentView !== 'inventory') {
        setCurrentView('maintenance');
    } else if (role !== 'MOTORISTA' && role !== 'MECANICO' && currentView === 'driver-portal') {
        setCurrentView('dashboard');
    }
  }, [currentUser.role]);

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