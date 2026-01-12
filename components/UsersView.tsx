import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

const UsersView: React.FC = () => {
  const { users, addUser } = useStore();
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.DRIVER as UserRole });
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(newUser.name && newUser.email) {
        addUser(newUser);
        setNewUser({ name: '', email: '', role: UserRole.DRIVER });
        setShowForm(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Novo Usuário'}
        </button>
      </div>

      {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
              <h3 className="font-bold text-lg mb-4 text-slate-700">Cadastrar Usuário / Motorista</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                          <input 
                            required value={newUser.name}
                            onChange={e => setNewUser({...newUser, name: e.target.value})}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: João da Silva"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                          <input 
                            required type="email" value={newUser.email}
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="joao@rabelo.com"
                          />
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Função no Sistema</label>
                      <select 
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                          <option value={UserRole.DRIVER}>Motorista</option>
                          <option value={UserRole.MECHANIC}>Mecânico</option>
                          <option value={UserRole.FINANCE}>Financeiro</option>
                          <option value={UserRole.MANAGER}>Gerente</option>
                      </select>
                  </div>
                  <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded font-bold hover:bg-slate-700">
                      Salvar Cadastro
                  </button>
              </form>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
              <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-slate-200" />
                  <div>
                      <h4 className="font-bold text-slate-800">{user.name}</h4>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                          {user.role}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default UsersView;