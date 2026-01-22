
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Client } from '../types';

const ClientsView: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, bookings, packagePassengers, travelPackages, currentUser } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // History Modal State
  const [historyClient, setHistoryClient] = useState<Client | null>(null);

  // Form State
  const [form, setForm] = useState({
      name: '',
      type: 'PF' as 'PF' | 'PJ',
      cpf: '',
      rg: '',
      birthDate: '',
      phone: '',
      email: '',
      address: '',
      code: '',
      observations: ''
  });

  const canManage = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER || currentUser.role === UserRole.FINANCE;

  if (!canManage) {
      return <div className="p-8 text-center text-slate-500">Acesso restrito.</div>;
  }

  const resetForm = () => {
      setForm({ name: '', type: 'PF', cpf: '', rg: '', birthDate: '', phone: '', email: '', address: '', code: '', observations: '' });
      setEditingClient(null);
      setShowForm(false);
  };

  const handleEdit = (client: Client) => {
      setEditingClient(client);
      setForm({
          name: client.name,
          type: client.type || 'PF',
          cpf: client.cpf || '',
          rg: client.rg || '',
          birthDate: client.birthDate || '',
          phone: client.phone || '',
          email: client.email || '',
          address: client.address || '',
          code: client.code || '',
          observations: client.observations || ''
      });
      setShowForm(true);
  };

  const handleDelete = async (id: string) => {
      if (confirm('Tem certeza que deseja excluir este cliente?')) {
          await deleteClient(id);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name) return;

      if (editingClient) {
          await updateClient(editingClient.id, form);
          alert('Cliente atualizado!');
      } else {
          await addClient(form);
          alert('Cliente cadastrado com sucesso!');
      }
      resetForm();
  };

  // Filter Clients
  const filteredClients = clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.cpf.includes(searchTerm) ||
      c.phone?.includes(searchTerm) ||
      c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => a.name.localeCompare(b.name));

  // Client History Logic (Bookings + Packages)
  const getClientHistory = (client: Client) => {
      // 1. Regular Bookings (Match by exact name or phone since ID linkage might be missing in legacy)
      const clientBookings = bookings.filter(b => 
          b.clientName.toLowerCase() === client.name.toLowerCase() || 
          (client.phone && b.clientPhone && b.clientPhone === client.phone)
      ).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      // 2. Package Trips (Linked by clientId)
      const clientPackages = packagePassengers.filter(p => p.clientId === client.id);

      return { clientBookings, clientPackages };
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Gestão de Clientes</h2>
                <p className="text-sm text-slate-500">Base de dados unificada de passageiros e contratantes.</p>
            </div>
            <button 
                onClick={() => { resetForm(); setShowForm(true); }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
            >
                + Novo Cliente
            </button>
        </div>

        {/* LIST & SEARCH */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex gap-4">
                <input 
                    type="text" 
                    placeholder="🔍 Buscar por Nome, CPF, Telefone ou Código..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1 border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                />
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                        <tr>
                            <th className="p-4">Código</th>
                            <th className="p-4">Nome / Razão Social</th>
                            <th className="p-4">Contato</th>
                            <th className="p-4">Documento</th>
                            <th className="p-4 text-center">Tipo</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredClients.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
                        ) : (
                            filteredClients.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 text-sm text-slate-500 font-mono">{c.code || '-'}</td>
                                    <td className="p-4 font-bold text-slate-800">{c.name}</td>
                                    <td className="p-4 text-sm text-slate-600">
                                        <div className="flex flex-col">
                                            <span>{c.phone}</span>
                                            <span className="text-xs text-slate-400">{c.email}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-500">{c.cpf}</td>
                                    <td className="p-4 text-center">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${c.type === 'PJ' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {c.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setHistoryClient(c)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                                            title="Histórico de Viagens"
                                        >
                                            📜
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(c)}
                                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" 
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(c.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                                            title="Excluir"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* ADD/EDIT FORM MODAL */}
        {showForm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                    <h3 className="font-bold text-xl mb-4 text-slate-800">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                                <select 
                                    value={form.type} 
                                    onChange={e => setForm({...form, type: e.target.value as any})}
                                    className="w-full border p-2 rounded bg-white"
                                >
                                    <option value="PF">Pessoa Física</option>
                                    <option value="PJ">Pessoa Jurídica</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Código (Opcional)</label>
                                <input 
                                    value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                                    className="w-full border p-2 rounded" placeholder="Cód. Planilha Antiga"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo / Razão Social *</label>
                            <input 
                                required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                className="w-full border p-2 rounded" placeholder="Nome do Cliente"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{form.type === 'PF' ? 'CPF' : 'CNPJ'}</label>
                                <input 
                                    value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})}
                                    className="w-full border p-2 rounded" placeholder="Documento"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{form.type === 'PF' ? 'RG' : 'Inscrição Estadual'}</label>
                                <input 
                                    value={form.rg} onChange={e => setForm({...form, rg: e.target.value})}
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Telefone / WhatsApp</label>
                                <input 
                                    value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                                    className="w-full border p-2 rounded" placeholder="(00) 00000-0000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                <input 
                                    type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                                    className="w-full border p-2 rounded" placeholder="cliente@email.com"
                                />
                            </div>
                        </div>

                        {form.type === 'PF' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Data de Nascimento</label>
                                <input 
                                    type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})}
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Endereço Completo</label>
                            <input 
                                value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                                className="w-full border p-2 rounded" placeholder="Rua, Número, Bairro, Cidade - UF"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Observações</label>
                            <textarea 
                                value={form.observations} onChange={e => setForm({...form, observations: e.target.value})}
                                className="w-full border p-2 rounded h-20" placeholder="Ex: Cliente VIP, prefere poltrona janela..."
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                            <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 rounded text-slate-700 font-bold hover:bg-slate-300">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Salvar Cliente</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* HISTORY MODAL */}
        {historyClient && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-bounce-in">
                    <div className="bg-slate-800 p-4 text-white flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-lg">Histórico: {historyClient.name}</h3>
                        <button onClick={() => setHistoryClient(null)} className="text-slate-400 hover:text-white text-xl">&times;</button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* PREVIOUS BOOKINGS (LOCAÇÕES) */}
                            <div>
                                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    🚌 Locações de Ônibus
                                </h4>
                                <div className="space-y-2">
                                    {getClientHistory(historyClient).clientBookings.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">Nenhuma locação encontrada.</p>
                                    ) : (
                                        getClientHistory(historyClient).clientBookings.map(b => (
                                            <div key={b.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-slate-800 text-sm">{b.destination}</span>
                                                    <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500">{new Date(b.startTime).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Valor: R$ {b.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* PACKAGE TRIPS (EXCURSÕES) */}
                            <div>
                                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    🏖️ Pacotes de Viagem
                                </h4>
                                <div className="space-y-2">
                                    {getClientHistory(historyClient).clientPackages.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">Nenhum pacote encontrado.</p>
                                    ) : (
                                        getClientHistory(historyClient).clientPackages.map(p => {
                                            const pkg = travelPackages.find(tp => tp.id === p.packageId);
                                            return (
                                                <div key={p.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-slate-800 text-sm">{pkg?.title || 'Pacote Desconhecido'}</span>
                                                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded font-bold">{p.status}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">Data: {pkg ? new Date(pkg.date).toLocaleDateString() : '-'}</p>
                                                    <p className="text-xs text-slate-500">Pago: R$ {p.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-white text-right">
                        <button onClick={() => setHistoryClient(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded font-bold text-slate-700 text-sm">Fechar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ClientsView;
