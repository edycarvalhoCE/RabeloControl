import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const { currentUser, logout } = useStore();
  const [copyMsg, setCopyMsg] = useState('');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: [UserRole.MANAGER, UserRole.FINANCE] },
    { id: 'calendar', label: 'Calendário (Escala)', icon: '📅', roles: [UserRole.MANAGER] },
    { id: 'bookings', label: 'Locações', icon: '🚌', roles: [UserRole.MANAGER] },
    { id: 'travel-packages', label: 'Pacotes de Viagem', icon: '🏖️', roles: [UserRole.MANAGER, UserRole.FINANCE] },
    { id: 'charter', label: 'Fretamento', icon: '🏭', roles: [UserRole.MANAGER] },
    { id: 'vehicles', label: 'Veículos / Frota', icon: '🚐', roles: [UserRole.MANAGER] },
    { id: 'maintenance', label: 'Manutenção', icon: '🛠️', roles: [UserRole.MANAGER, UserRole.MECHANIC] },
    { id: 'inventory', label: 'Estoque de Peças', icon: '🔧', roles: [UserRole.MANAGER, UserRole.MECHANIC] },
    { id: 'documents', label: 'Documentos', icon: '📂', roles: [UserRole.MANAGER] },
    { id: 'finance', label: 'Financeiro (Caixa)', icon: '💰', roles: [UserRole.MANAGER, UserRole.FINANCE] },
    { id: 'users', label: 'Usuários', icon: '👥', roles: [UserRole.MANAGER] },
    { id: 'driver-portal', label: 'Minha Escala', icon: 'steering-wheel', roles: [UserRole.DRIVER] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(currentUser.role));

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.MANAGER: return 'Gerente';
      case UserRole.FINANCE: return 'Financeiro';
      case UserRole.DRIVER: return 'Motorista';
      case UserRole.MECHANIC: return 'Mecânico';
      default: return 'Usuário';
    }
  };

  const handleShareLink = () => {
      const url = window.location.origin;
      navigator.clipboard.writeText(url).then(() => {
          setCopyMsg('Link copiado!');
          setTimeout(() => setCopyMsg(''), 2000);
      });
  };

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 shadow-2xl z-20">
      <div className="p-6 border-b border-slate-700 flex flex-col items-center text-center">
        {/* Company Logo - Text Only */}
        <div className="mb-3 w-full flex justify-center h-16 items-center">
            <span className="text-white font-extrabold text-2xl tracking-tighter">
                Rabelo<span className="text-blue-500">Tour</span>
            </span>
        </div>
        <p className="text-xs text-slate-400">Sistema Integrado</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenu.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>{item.icon === 'steering-wheel' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="flex items-center space-x-3 mb-4">
          <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-blue-500" />
          <div>
            <p className="text-sm font-semibold truncate w-32">{currentUser.name}</p>
            <p className="text-xs text-blue-300">{getRoleLabel(currentUser.role)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-2 space-y-2 border-t border-slate-600 pt-4">
            {/* Share Button */}
            <button 
                onClick={handleShareLink}
                className="w-full flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-blue-300 hover:text-white py-2 rounded transition-colors text-xs font-medium border border-slate-600"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                <span>{copyMsg || 'Compartilhar App'}</span>
            </button>

            {/* Logout Button */}
            <button 
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 bg-slate-700 hover:bg-red-600 text-slate-200 hover:text-white py-2 rounded transition-colors text-xs font-medium"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Sair</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;