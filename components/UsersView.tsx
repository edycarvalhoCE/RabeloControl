
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, User } from '../types';

const UsersView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', role: UserRole.DRIVER as UserRole, dailyRate: 0 });

  const isManager = currentUser.role === UserRole.DEVELOPER || currentUser.role === UserRole.MANAGER;

  // Filter pending users (only visible to managers)
  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const activeUsers = users.filter(u => u.status !== 'PENDING');

  const handleEdit = (user: User) => {
      setEditingUser(user);
      setFormData({ 
          name: user.name, 
          email: user.email, 
          role: user.role as UserRole,
          dailyRate: user.dailyRate || 0
      });
      setShowForm(true);
  };

  const handleDelete = async (user: User) => {
      if (user.id === currentUser.id) {
          alert("Você não pode excluir a si mesmo!");
          return;
      }
      if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
          await deleteUser(user.id);
      }
  };

  const handleApprove = async (user: User) => {
      if (window.confirm(`Confirma a aprovação do acesso para ${user.name}?`)) {
          await updateUser(user.id, { status: 'APPROVED' });
      }
  };

  const handleReject = async (user: User) => {
      if (window.confirm(`Deseja recusar e excluir o cadastro de ${user.name}?`)) {
          await deleteUser(user.id);
      }
  };

  const handleDailyRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const digits = value.replace(/\D/g, "");
      const realValue = Number(digits) / 100;
      setFormData(prev => ({ ...prev, dailyRate: realValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(formData.name && formData.email) {
        if (editingUser) {
            // Update existing
            await updateUser(editingUser.id, formData);
            alert("Usuário atualizado com sucesso!");
        } else {
            // Create new
            addUser(formData);
            alert("Usuário criado com sucesso!");
        }
        setFormData({ name: '', email: '', role: UserRole.DRIVER, dailyRate: 0 });
        setEditingUser(null);
        setShowForm(false);
    }
  };

  const handleCancel = () => {
      setShowForm(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', role: UserRole.DRIVER, dailyRate: 0 });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h2>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingUser(null); setFormData({ name: '', email: '', role: UserRole.DRIVER, dailyRate: 0 }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Novo Usuário'}
        </button>
      </div>

      {/* PENDING APPROVAL SECTION */}
      {isManager && pendingUsers.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm mb-6">
              <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                  <span className="bg-orange-200 text-orange-800 p-1 rounded text-xs">⚠️</span>
                  Solicitações de Acesso Pendentes ({pendingUsers.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingUsers.map(user => (
                      <div key={user.id} className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                               <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full bg-slate-100" />
                               <div>
                                   <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                                   <p className="text-xs text-slate-500">{user.email}</p>
                                   <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase font-bold text-slate-600 mt-1 inline-block">
                                       {user.role}
                                   </span>
                               </div>
                          </div>
                          <div className="flex gap-2 mt-1">
                              <button 
                                onClick={() => handleApprove(user)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded transition-colors"
                              >
                                  Aprovar
                              </button>
                              <button 
                                onClick={() => handleReject(user)}
                                className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-2 rounded transition-colors"
                              >
                                  Recusar
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
              <h3 className="font-bold text-lg mb-4 text-slate-700">
                  {editingUser ? 'Editar Usuário' : 'Cadastrar Usuário / Motorista'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                          <input 
                            required value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: João da Silva"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                          <input 
                            required type="email" value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="joao@rabelo.com"
                            disabled={!!editingUser} // Email is ID in Auth generally, keep specific for now
                          />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Função no Sistema</label>
                          <select 
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                              <option value={UserRole.DRIVER}>Motorista</option>
                              <option value={UserRole.GARAGE_AUX}>Aux. Garagem / Limpeza</option>
                              <option value={UserRole.MECHANIC}>Mecânico</option>
                              <option value={UserRole.FINANCE}>Financeiro</option>
                              <option value={UserRole.MANAGER}>Gerente</option>
                              {currentUser.role === UserRole.DEVELOPER && (
                                  <option value={UserRole.DEVELOPER}>Desenvolvedor (Admin)</option>
                              )}
                          </select>
                      </div>
                      
                      {/* Driver Daily Rate Field */}
                      {formData.role === UserRole.DRIVER && (
                          <div className="animate-fade-in">
                              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Diária Padrão</label>
                              <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500">
                                  <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-r border-slate-300 text-sm">R$</span>
                                  <input 
                                      type="text" 
                                      inputMode="numeric"
                                      value={formData.dailyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                                      onChange={handleDailyRateChange}
                                      className="w-full p-2 outline-none text-right font-bold text-slate-800"
                                      placeholder="0,00"
                                  />
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="flex gap-2 pt-2">
                      <button type="button" onClick={handleCancel} className="flex-1 bg-slate-200 text-slate-800 py-2 rounded font-bold hover:bg-slate-300">
                          Cancelar
                      </button>
                      <button type="submit" className="flex-1 bg-slate-800 text-white py-2 rounded font-bold hover:bg-slate-700">
                          {editingUser ? 'Salvar Alterações' : 'Salvar Cadastro'}
                      </button>
                  </div>
              </form>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeUsers.map(user => (
              <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center group">
                  <div className="flex items-center space-x-4">
                      <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-slate-200" />
                      <div>
                          <h4 className="font-bold text-slate-800">{user.name}</h4>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                              {user.role}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                          {user.role === UserRole.DRIVER && user.dailyRate && user.dailyRate > 0 && (
                              <p className="text-xs text-green-600 font-bold mt-1">Diária: R$ {user.dailyRate.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                          )}
                      </div>
                  </div>
                  <div className="flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Editar"
                      >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(user)}
                        className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Excluir"
                      >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default UsersView;
