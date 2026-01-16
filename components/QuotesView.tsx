
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Quote, Bus } from '../types';

const QuotesView: React.FC = () => {
  const { quotes, addQuote, updateQuote, convertQuoteToBooking, deleteQuote, currentUser, buses } = useStore();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  
  // State for Conversion (Approval)
  const [approvingQuote, setApprovingQuote] = useState<Quote | null>(null);
  const [selectedBusForApproval, setSelectedBusForApproval] = useState('');

  // New Quote Form State
  const [form, setForm] = useState({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      destination: '',
      departureLocation: '',
      startTime: '',
      endTime: '',
      passengerCount: 46,
      observations: '',
      price: 0
  });

  const canManage = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER;

  if (!canManage) {
      return <div className="p-8 text-center text-slate-500">Acesso restrito.</div>;
  }

  // --- HELPERS ---
  const getStatusColor = (status: string) => {
      switch(status) {
          case 'NEW': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
          case 'PRICED': return 'bg-blue-100 border-blue-200 text-blue-800';
          case 'SENT': return 'bg-purple-100 border-purple-200 text-purple-800';
          case 'APPROVED': return 'bg-green-100 border-green-200 text-green-800';
          case 'REJECTED': return 'bg-red-100 border-red-200 text-red-800';
          default: return 'bg-gray-100';
      }
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'NEW': return 'Novo';
          case 'PRICED': return 'Precificado';
          case 'SENT': return 'Enviado';
          case 'APPROVED': return 'Fechado';
          case 'REJECTED': return 'Perdido';
          default: return status;
      }
  };

  // --- HANDLERS ---

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(form.clientName && form.destination && form.startTime) {
          if (editingQuote) {
              updateQuote(editingQuote.id, form);
              alert("Orçamento atualizado!");
              setEditingQuote(null);
          } else {
              addQuote({
                  ...form,
                  // If adding new, status defaults to NEW in store, but if price is added immediately?
                  // Let's keep simpler, store handles status NEW. 
                  // If manager adds price right away, we might want to update it to PRICED, but let's stick to flow.
              });
              alert("Solicitação de orçamento criada!");
          }
          setShowNewForm(false);
          setForm({ clientName: '', clientPhone: '', clientEmail: '', destination: '', departureLocation: '', startTime: '', endTime: '', passengerCount: 46, observations: '', price: 0 });
      }
  };

  const handleEditClick = (quote: Quote) => {
      setEditingQuote(quote);
      setForm({
          clientName: quote.clientName,
          clientPhone: quote.clientPhone,
          clientEmail: quote.clientEmail || '',
          destination: quote.destination,
          departureLocation: quote.departureLocation,
          startTime: quote.startTime,
          endTime: quote.endTime,
          passengerCount: quote.passengerCount,
          observations: quote.observations || '',
          price: quote.price || 0
      });
      setShowNewForm(true);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "");
      setForm(prev => ({ ...prev, price: Number(value) / 100 }));
  };

  const handleStatusChange = async (quote: Quote, newStatus: Quote['status']) => {
      if (newStatus === 'APPROVED') {
          setApprovingQuote(quote);
          return;
      }
      await updateQuote(quote.id, { status: newStatus });
  };

  const handleConfirmApproval = async () => {
      if (!approvingQuote || !selectedBusForApproval) {
          alert("Selecione um ônibus para confirmar a locação.");
          return;
      }
      const res = await convertQuoteToBooking(approvingQuote.id, selectedBusForApproval);
      if (res.success) {
          alert(res.message);
          setApprovingQuote(null);
          setSelectedBusForApproval('');
      } else {
          alert("Erro: " + res.message);
      }
  };

  // --- KANBAN COLUMNS ---
  const columns: {id: Quote['status'], title: string}[] = [
      { id: 'NEW', title: '🆕 Novos Pedidos' },
      { id: 'PRICED', title: '💲 Precificados' },
      { id: 'SENT', title: '📩 Enviado ao Cliente' },
      { id: 'APPROVED', title: '✅ Fechados' },
      { id: 'REJECTED', title: '❌ Perdidos' },
  ];

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Orçamentos & CRM</h2>
                <p className="text-sm text-slate-500">Gerencie solicitações e feche mais viagens.</p>
            </div>
            <button 
                onClick={() => {
                    setEditingQuote(null);
                    setForm({ clientName: '', clientPhone: '', clientEmail: '', destination: '', departureLocation: '', startTime: '', endTime: '', passengerCount: 46, observations: '', price: 0 });
                    setShowNewForm(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
            >
                + Novo Orçamento
            </button>
        </div>

        {/* KANBAN BOARD */}
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {columns.map(col => (
                <div key={col.id} className="min-w-[280px] w-[280px] flex flex-col bg-slate-100 rounded-xl border border-slate-200 max-h-full">
                    <div className={`p-3 font-bold text-sm text-slate-700 border-b border-slate-200 uppercase tracking-wide sticky top-0 bg-slate-100 rounded-t-xl z-10 flex justify-between items-center`}>
                        {col.title}
                        <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                            {quotes.filter(q => q.status === col.id).length}
                        </span>
                    </div>
                    <div className="p-3 space-y-3 overflow-y-auto flex-1">
                        {quotes.filter(q => q.status === col.id).map(quote => (
                            <div key={quote.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{quote.clientName}</h4>
                                    <button onClick={() => handleEditClick(quote)} className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                </div>
                                <p className="text-xs font-semibold text-slate-600 mb-1">{quote.destination}</p>
                                <p className="text-xs text-slate-500 mb-2">📅 {new Date(quote.startTime).toLocaleDateString()}</p>
                                
                                {quote.price ? (
                                    <p className="text-sm font-bold text-green-700 mb-2">R$ {quote.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                ) : (
                                    <p className="text-xs text-orange-500 font-bold mb-2">Sem preço definido</p>
                                )}

                                {/* Quick Actions */}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
                                    <select 
                                        value={quote.status}
                                        onChange={(e) => handleStatusChange(quote, e.target.value as any)}
                                        className="text-[10px] bg-slate-50 border border-slate-200 rounded p-1 outline-none w-full"
                                        disabled={quote.status === 'APPROVED'} // Locked if converted
                                    >
                                        <option value="NEW">Novo</option>
                                        <option value="PRICED">Precificado</option>
                                        <option value="SENT">Enviado</option>
                                        <option value="APPROVED">Fechar (Aprovar)</option>
                                        <option value="REJECTED">Perdido</option>
                                    </select>
                                </div>
                                
                                <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                                    <span>Pax: {quote.passengerCount}</span>
                                    <button onClick={() => { if(confirm('Excluir?')) deleteQuote(quote.id); }} className="hover:text-red-500">Excluir</button>
                                </div>
                            </div>
                        ))}
                        {quotes.filter(q => q.status === col.id).length === 0 && (
                            <p className="text-center text-xs text-slate-400 italic py-4">Vazio</p>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* NEW/EDIT MODAL */}
        {showNewForm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                    <h3 className="font-bold text-xl mb-4 text-slate-800">{editingQuote ? 'Editar Orçamento' : 'Novo Pedido de Orçamento'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                                <input required value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} className="w-full border p-2 rounded" placeholder="Nome Completo" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                                <input value={form.clientPhone} onChange={e => setForm({...form, clientPhone: e.target.value})} className="w-full border p-2 rounded" placeholder="(00) 00000-0000" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email (Opcional)</label>
                            <input type="email" value={form.clientEmail} onChange={e => setForm({...form, clientEmail: e.target.value})} className="w-full border p-2 rounded" placeholder="cliente@email.com" />
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Destino</label>
                                    <input required value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className="w-full border p-2 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Saída (Local)</label>
                                    <input required value={form.departureLocation} onChange={e => setForm({...form, departureLocation: e.target.value})} className="w-full border p-2 rounded" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Data/Hora Ida</label>
                                    <input type="datetime-local" required value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} className="w-full border p-2 rounded text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Data/Hora Volta</label>
                                    <input type="datetime-local" required value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} className="w-full border p-2 rounded text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Passageiros</label>
                                    <input type="number" required value={form.passengerCount} onChange={e => setForm({...form, passengerCount: parseInt(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Observações / Roteiro</label>
                            <textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} className="w-full border p-2 rounded h-20" placeholder="Detalhes extras..." />
                        </div>

                        {/* PRICE FIELD - Highlighted */}
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <label className="block text-sm font-bold text-green-800 mb-1">Valor do Orçamento (R$)</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                value={form.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                                onChange={handlePriceChange}
                                className="w-full border border-green-300 p-2 rounded text-lg font-bold text-green-700" 
                                placeholder="0,00"
                            />
                            <p className="text-xs text-green-600 mt-1">Preencha para mover para "Precificado".</p>
                        </div>

                        <div className="flex gap-2 justify-end pt-4">
                            <button type="button" onClick={() => setShowNewForm(false)} className="px-4 py-2 bg-slate-200 rounded text-slate-700 font-bold">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded font-bold hover:bg-slate-700">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* APPROVAL MODAL */}
        {approvingQuote && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-bounce-in">
                    <h3 className="font-bold text-xl mb-2 text-green-800 flex items-center gap-2">
                        <span>🎉</span> Fechamento de Venda!
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Para converter o orçamento de <strong>{approvingQuote.clientName}</strong> em uma locação oficial, selecione o veículo que fará a viagem.
                    </p>
                    
                    <div className="mb-4 bg-slate-50 p-3 rounded text-sm">
                        <p><strong>Destino:</strong> {approvingQuote.destination}</p>
                        <p><strong>Data:</strong> {new Date(approvingQuote.startTime).toLocaleDateString()}</p>
                        <p><strong>Valor Fechado:</strong> R$ {approvingQuote.price?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Selecione o Ônibus</label>
                        <select 
                            value={selectedBusForApproval} 
                            onChange={e => setSelectedBusForApproval(e.target.value)}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="">Escolha um veículo...</option>
                            {buses.filter(b => b.status !== 'MAINTENANCE').map(b => (
                                <option key={b.id} value={b.id}>{b.plate} - {b.model} ({b.capacity} lug)</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => { setApprovingQuote(null); setSelectedBusForApproval(''); }} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded font-bold">Cancelar</button>
                        <button onClick={handleConfirmApproval} className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Gerar Locação</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default QuotesView;
