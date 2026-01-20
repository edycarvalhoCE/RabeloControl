
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Quote, Bus, PriceRoute } from '../types';

const QuotesView: React.FC = () => {
  const { quotes, addQuote, updateQuote, convertQuoteToBooking, deleteQuote, currentUser, buses, priceRoutes, addPriceRoute, deletePriceRoute, importDefaultPrices, clearPriceTable } = useStore();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showPriceTable, setShowPriceTable] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  
  // State for Conversion (Approval)
  const [approvingQuote, setApprovingQuote] = useState<Quote | null>(null);
  const [selectedBusForApproval, setSelectedBusForApproval] = useState('');

  // Price Table State
  const [priceSearch, setPriceSearch] = useState('');
  const [priceVehicleFilter, setPriceVehicleFilter] = useState(''); // NEW FILTER STATE
  const [newRouteForm, setNewRouteForm] = useState({ origin: 'Petrópolis', destination: '', vehicleType: 'Convencional', price: 0 });

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

  // Updated to include FINANCE
  const canManage = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER || currentUser.role === UserRole.FINANCE;
  const isDeveloper = currentUser.role === UserRole.DEVELOPER;
  // Finance can view but NOT edit price table (Add/Delete routes)
  const canEditPriceTable = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER;

  if (!canManage) {
      return <div className="p-8 text-center text-slate-500">Acesso restrito.</div>;
  }

  // --- HANDLERS ---

  const handleImportPrices = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("Iniciando processo de importação...");

      if (priceRoutes.length > 0) {
          if (!confirm(`Já existem ${priceRoutes.length} rotas cadastradas. Importar novamente pode gerar duplicatas.\nDeseja continuar mesmo assim?`)) {
              return;
          }
      } 
      // Se tabela vazia, roda direto sem perguntar para facilitar

      setLoadingImport(true);
      try {
          const result = await importDefaultPrices();
          if (result.success) {
              alert(result.message);
          } else {
              alert("Falha na importação: " + result.message);
          }
      } catch (err: any) {
          alert("Erro crítico: " + err.message);
      } finally {
          setLoadingImport(false);
      }
  };

  const handleClearTable = async () => {
      if (confirm("⚠️ Tem certeza que deseja APAGAR TODAS as rotas da tabela de preços? Esta ação não pode ser desfeita.")) {
          setLoadingImport(true);
          const result = await clearPriceTable();
          setLoadingImport(false);
          alert(result.message);
      }
  };

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

  // --- PRICE TABLE HANDLERS ---
  const handleAddRoute = (e: React.FormEvent) => {
      e.preventDefault();
      if (newRouteForm.destination && newRouteForm.price > 0) {
          addPriceRoute(newRouteForm);
          setNewRouteForm({ origin: 'Petrópolis', destination: '', vehicleType: 'Convencional', price: 0 });
          alert("Rota adicionada à tabela!");
      }
  };

  const handleUsePrice = (route: PriceRoute) => {
      setForm(prev => ({
          ...prev,
          destination: route.destination,
          departureLocation: route.origin,
          price: route.price,
          observations: `${prev.observations ? prev.observations + '\n' : ''}Preço baseado na tabela: ${route.vehicleType}`
      }));
      setShowPriceTable(false);
      setShowNewForm(true); // Open form if closed
  };

  // --- KANBAN COLUMNS ---
  const columns: {id: Quote['status'], title: string}[] = [
      { id: 'NEW', title: '🆕 Novos Pedidos' },
      { id: 'PRICED', title: '💲 Precificados' },
      { id: 'SENT', title: '📩 Enviado ao Cliente' },
      { id: 'APPROVED', title: '✅ Fechados' },
      { id: 'REJECTED', title: '❌ Perdidos' },
  ];

  // Get unique vehicle types for the filter dropdown
  const uniqueVehicleTypes = Array.from(new Set(priceRoutes.map(r => r.vehicleType))).sort();

  const filteredRoutes = priceRoutes.filter(r => {
      const matchText = r.destination.toLowerCase().includes(priceSearch.toLowerCase()) || 
                        r.origin.toLowerCase().includes(priceSearch.toLowerCase());
      const matchVehicle = priceVehicleFilter ? r.vehicleType === priceVehicleFilter : true;
      
      return matchText && matchVehicle;
  });

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Orçamentos & CRM</h2>
                <p className="text-sm text-slate-500">Gerencie solicitações e feche mais viagens.</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowPriceTable(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                >
                    <span>💰</span> Tabela de Preços
                </button>
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

        {/* PRICE TABLE MODAL */}
        {showPriceTable && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                    <div className="bg-emerald-800 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2">💰 Tabela de Preços de Locação</h3>
                        <div className="flex items-center gap-2">
                            {/* RESTRICTED: Only Developer can see Clear Table */}
                            {isDeveloper && priceRoutes.length > 0 && (
                                <button 
                                    type="button"
                                    onClick={handleClearTable}
                                    disabled={loadingImport}
                                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold border border-red-500 shadow-sm mr-2"
                                >
                                    🗑️ Limpar Tabela
                                </button>
                            )}
                            
                            {/* RESTRICTED: Only Developer can see Import Table */}
                            {isDeveloper && (
                                <button 
                                    type="button"
                                    onClick={handleImportPrices} 
                                    disabled={loadingImport}
                                    className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded font-bold border border-emerald-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingImport ? 'Importando...' : '📥 Importar Tabela Padrão'}
                                </button>
                            )}
                            
                            <button onClick={() => setShowPriceTable(false)} className="text-emerald-200 hover:text-white text-xl ml-2">&times;</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* LEFT: LIST - W-FULL if editing is disabled (Finance) */}
                        <div className={`w-full ${canEditPriceTable ? 'md:w-2/3 border-r' : 'md:w-full'} p-6 overflow-y-auto bg-white border-slate-200`}>
                            
                            {/* SEARCH AND FILTER BAR */}
                            <div className="flex flex-col md:flex-row gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="🔍 Buscar Destino ou Origem..." 
                                    value={priceSearch}
                                    onChange={(e) => setPriceSearch(e.target.value)}
                                    className="flex-1 border p-2 rounded bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <select 
                                    value={priceVehicleFilter}
                                    onChange={(e) => setPriceVehicleFilter(e.target.value)}
                                    className="md:w-1/3 border p-2 rounded bg-slate-50 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="">Todos os Veículos</option>
                                    {uniqueVehicleTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="space-y-2">
                                <div className="grid grid-cols-4 font-bold text-xs text-slate-500 uppercase pb-2 border-b">
                                    <div className="col-span-2">Rota</div>
                                    <div>Veículo</div>
                                    <div className="text-right">Valor</div>
                                </div>
                                {filteredRoutes.map(route => (
                                    <div key={route.id} className="grid grid-cols-4 items-center p-3 hover:bg-slate-50 border-b border-slate-100 group">
                                        <div className="col-span-2 pr-2">
                                            <p className="font-bold text-slate-800 text-sm">{route.destination}</p>
                                            <p className="text-xs text-slate-500">Saída: {route.origin}</p>
                                        </div>
                                        <div className="text-sm text-slate-600">{route.vehicleType}</div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-600">R$ {route.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                            <div className="flex justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {canEditPriceTable && <button onClick={() => deletePriceRoute(route.id)} className="text-xs text-red-400 hover:text-red-600">Excluir</button>}
                                                <button onClick={() => handleUsePrice(route)} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold hover:bg-emerald-200">Usar</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredRoutes.length === 0 && <p className="text-center text-slate-400 py-4">Nenhuma rota encontrada para os filtros.</p>}
                            </div>
                        </div>

                        {/* RIGHT: ADD FORM (Visible to Manager & Developer Only) */}
                        {canEditPriceTable && (
                            <div className="w-full md:w-1/3 bg-slate-50 p-6 overflow-y-auto">
                                <h4 className="font-bold text-slate-700 mb-4">Cadastrar Nova Rota</h4>
                                <form onSubmit={handleAddRoute} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Origem</label>
                                        <input 
                                            required value={newRouteForm.origin} onChange={e => setNewRouteForm({...newRouteForm, origin: e.target.value})}
                                            className="w-full border p-2 rounded text-sm" placeholder="Ex: Petrópolis"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Destino</label>
                                        <input 
                                            required value={newRouteForm.destination} onChange={e => setNewRouteForm({...newRouteForm, destination: e.target.value})}
                                            className="w-full border p-2 rounded text-sm" placeholder="Ex: Cabo Frio"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Veículo</label>
                                        <select 
                                            value={newRouteForm.vehicleType} onChange={e => setNewRouteForm({...newRouteForm, vehicleType: e.target.value})}
                                            className="w-full border p-2 rounded text-sm bg-white"
                                        >
                                            <option value="Convencional">Convencional (46 lug)</option>
                                            <option value="Executivo">Executivo (50 lug)</option>
                                            <option value="Semi-Leito">Semi-Leito</option>
                                            <option value="Leito">Leito Total</option>
                                            <option value="DD (Double Deck)">DD (Double Deck)</option>
                                            <option value="LD (Low Driver)">LD (Low Driver)</option>
                                            <option value="Micro">Micro-ônibus</option>
                                            <option value="Van">Van</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Valor Tabela (R$)</label>
                                        <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 font-bold border-r border-slate-300 text-xs">R$</span>
                                            <input 
                                                type="text" 
                                                inputMode="numeric"
                                                required
                                                value={newRouteForm.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                onChange={e => {
                                                    const val = Number(e.target.value.replace(/\D/g, "")) / 100;
                                                    setNewRouteForm({...newRouteForm, price: val});
                                                }}
                                                className="w-full p-2 outline-none text-right font-bold text-slate-800 text-sm"
                                                placeholder="0,00"
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded font-bold text-sm hover:bg-slate-700">
                                        Salvar na Tabela
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* NEW/EDIT MODAL */}
        {showNewForm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto animate-fade-in">
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
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-bold text-slate-700 uppercase">Dados da Viagem</h4>
                                <button type="button" onClick={() => {setShowNewForm(false); setShowPriceTable(true)}} className="text-xs text-emerald-600 font-bold hover:underline">
                                    🔍 Consultar Tabela
                                </button>
                            </div>
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
