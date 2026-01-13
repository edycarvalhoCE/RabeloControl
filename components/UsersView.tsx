import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, User } from '../types';

const UsersView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', role: UserRole.DRIVER as UserRole });

  const handleEdit = (user: User) => {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, role: user.role });
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
        setFormData({ name: '', email: '', role: UserRole.DRIVER });
        setEditingUser(null);
        setShowForm(false);
    }
  };

  const handleCancel = () => {
      setShowForm(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', role: UserRole.DRIVER });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h2>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingUser(null); setFormData({ name: '', email: '', role: UserRole.DRIVER }); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Novo Usuário'}
        </button>
      </div>

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
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Função no Sistema</label>
                      <select 
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                          <option value={UserRole.DRIVER}>Motorista</option>
                          <option value={UserRole.MECHANIC}>Mecânico</option>
                          <option value={UserRole.FINANCE}>Financeiro</option>
                          <option value={UserRole.MANAGER}>Gerente</option>
                          {currentUser.role === UserRole.DEVELOPER && (
                              <option value={UserRole.DEVELOPER}>Desenvolvedor (Admin)</option>
                          )}
                      </select>
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
          {users.map(user => (
              <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center group">
                  <div className="flex items-center space-x-4">
                      <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-slate-200" />
                      <div>
                          <h4 className="font-bold text-slate-800">{user.name}</h4>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                              {user.role}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">{user.email}</p>
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