
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, User } from '../types';

const UsersView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser, sendPasswordReset } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resetMsg, setResetMsg] = useState<{id: string, text: string} | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', role: UserRole.DRIVER as UserRole, dailyRate: 0 });

  const isManager = currentUser.role === UserRole.DEVELOPER || currentUser.role === UserRole.MANAGER;

  // Filter users based on search
  const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingUsers = filteredUsers.filter(u => u.status === 'PENDING');
  const activeUsers = filteredUsers.filter(u => u.status !== 'PENDING');

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

  const handleResetPassword = async (user: User) => {
      if (window.confirm(`Enviar um e-mail de redefinição de senha para ${user.email}?`)) {
          const res = await sendPasswordReset(user.email);
          if (res.success) {
              setResetMsg({id: user.id, text: 'E-mail enviado!'});
              setTimeout(() => setResetMsg(null), 3000);
          } else {
              alert("Erro: " + res.message);
          }
      }
  };

  const handleDelete = async (user: User) => {
      if (user.id === currentUser.id) {
          alert("Você não pode excluir a si mesmo!");
          return;
      }
      if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.name} (${user.email})?`)) {
          await deleteUser(user.id);
          alert("Usuário excluído com sucesso.");
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
            await updateUser(editingUser.id, formData);
            alert("Usuário atualizado com sucesso!");
        } else {
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h2>
            <p className="text-sm text-slate-500">Controle quem acessa o sistema e quais as permissões.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingUser(null); setFormData({ name: '', email: '', role: UserRole.DRIVER, dailyRate: 0 }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Novo Usuário'}
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              <input 
                type="text" 
                placeholder="Localizar e-mail ou nome..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
              />
          </div>
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
                               <div className="overflow-hidden">
                                   <p className="font-bold text-slate-800 text-sm truncate">{user.name}</p>
                                   <p className="text-xs text-slate-500 truncate">{user.email}</p>
                               </div>
                          </div>
                          <div className="flex gap-2 mt-1">
                              <button onClick={() => handleApprove(user)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded transition-colors">Aprovar</button>
                              <button onClick={() => handleReject(user)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-2 rounded transition-colors">Recusar</button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl animate-fade-in">
              <h3 className="font-bold text-lg mb-4 text-slate-700">{editingUser ? 'Editar Usuário' : 'Cadastrar Usuário'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded outline-none" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                          <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border p-2 rounded outline-none" disabled={!!editingUser} />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                          <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full border p-2 rounded">
                              <option value={UserRole.AGENT}>Agente Comercial</option>
                              <option value={UserRole.DRIVER}>Motorista</option>
                              <option value={UserRole.FINANCE}>Financeiro</option>
                              <option value={UserRole.MANAGER}>Gerente</option>
                          </select>
                      </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                      <button type="button" onClick={handleCancel} className="flex-1 bg-slate-200 py-2 rounded font-bold">Cancelar</button>
                      <button type="submit" className="flex-1 bg-slate-800 text-white py-2 rounded font-bold">Salvar</button>
                  </div>
              </form>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeUsers.map(user => (
              <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center group hover:border-blue-300 transition-colors">
                  <div className="flex items-center space-x-4 overflow-hidden">
                      <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-slate-200 shrink-0" />
                      <div className="overflow-hidden">
                          <h4 className="font-bold text-slate-800 truncate">{user.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 font-bold uppercase">{user.role}</span>
                          <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>
                      </div>
                  </div>
                  <div className="flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleEdit(user)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Editar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleResetPassword(user)} className="p-2 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 relative" title="Redefinir Senha (Enviar E-mail)">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                          {resetMsg?.id === user.id && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap animate-bounce">{resetMsg.text}</span>}
                      </button>
                      <button onClick={() => handleDelete(user)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Excluir">
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
