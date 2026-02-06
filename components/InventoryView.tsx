
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Part, FuelRecord, FuelSupply, PurchaseRequest } from '../types';

const InventoryView: React.FC = () => {
  const { 
    parts, addPart, currentUser, buses, users,
    addFuelRecord, fuelRecords, fuelSupplies, addFuelSupply, 
    dieselStockLevel, arlaStockLevel, restockPart, deleteFuelRecord,
    purchaseRequests, updatePurchaseRequestStatus
  } = useStore();
  
  if (currentUser.role === UserRole.AGENT) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="text-red-500 text-5xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
        <p className="text-slate-500">O perfil de Agente Comercial não possui permissão para gerenciar o estoque de peças e combustível.</p>
      </div>
    );
  }

  const [showAddForm, setShowAddForm] = useState(false);
  
  const getTodayLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const formatDate = (dateStr: string) => {
      if (!dateStr) return '-';
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR');
      } catch (e) {
        return dateStr;
      }
  };
  
  // Tab Logic: Operations role (Driver/Mechanic) starts at Fuel tab
  const isOperational = currentUser.role === UserRole.DRIVER || currentUser.role === UserRole.MECHANIC;
  const [viewMode, setViewMode] = useState<'STOCK' | 'REQUESTS' | 'FUEL_CONSUMPTION' | 'FUEL_SUPPLY'>(isOperational ? 'FUEL_CONSUMPTION' : 'STOCK');
  
  const [searchTerm, setSearchTerm] = useState('');

  const [fuelForm, setFuelForm] = useState({
      date: getTodayLocal(),
      busId: '',
      dieselLiters: 0,
      hasArla: false,
      arlaLiters: 0,
      location: 'GARAGE' as 'GARAGE' | 'STREET',
      cost: 0,
      arlaCost: 0,
      stationName: '',
      kmStart: 0,
      kmEnd: 0
  });

  const [supplyForm, setSupplyForm] = useState({
      date: getTodayLocal(),
      liters: 0,
      cost: 0,
      supplier: '',
      nfe: '',
      type: 'DIESEL' as 'DIESEL' | 'ARLA',
      receiverName: currentUser.name || '',
      registeredInFinance: true
  });
  
  const [supplyFilterStart, setSupplyFilterStart] = useState('');
  const [supplyFilterEnd, setSupplyFilterEnd] = useState('');

  const [restockItem, setRestockItem] = useState<Part | null>(null);
  const [restockForm, setRestockForm] = useState({ quantity: 1, unitCost: 0, supplier: '', nfe: '' });

  const canManageStock = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER || currentUser.role === UserRole.FINANCE;

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    addPart(newPart);
    setShowAddForm(false);
    setNewPart({ name: '', quantity: 0, minQuantity: 5, price: 0, lastSupplier: '', lastNfe: '' });
  };

  const [newPart, setNewPart] = useState({ name: '', quantity: 0, minQuantity: 5, price: 0, lastSupplier: '', lastNfe: '' });

  const handleRestockSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!restockItem) return;
      await restockPart(restockItem.id, restockForm.quantity, restockForm.unitCost, restockForm.supplier, restockForm.nfe);
      alert("Entrada registrada!");
      setRestockItem(null);
  };

  const handleOpenRestock = (p: Part) => {
      setRestockItem(p);
      setRestockForm({ 
          quantity: 1, 
          unitCost: p.price, 
          supplier: p.lastSupplier || '', 
          nfe: '' 
      });
  };

  const handleBusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedBusId = e.target.value;
      let lastKm = 0;
      if (selectedBusId) {
          const busRecords = fuelRecords.filter(r => r.busId === selectedBusId);
          if (busRecords.length > 0) {
              busRecords.sort((a, b) => (b.kmEnd || 0) - (a.kmEnd || 0));
              lastKm = busRecords[0].kmEnd || 0;
          }
      }
      setFuelForm(prev => ({ ...prev, busId: selectedBusId, kmStart: lastKm, kmEnd: 0 }));
  };

  const handleFuelConsumptionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!fuelForm.busId || fuelForm.dieselLiters <= 0) {
          alert("Informe o veículo e os litros.");
          return;
      }
      if (fuelForm.kmEnd <= fuelForm.kmStart) {
          alert("KM Final deve ser maior que o Inicial.");
          return;
      }
      const distance = fuelForm.kmEnd - fuelForm.kmStart;
      const average = distance / fuelForm.dieselLiters;
      
      addFuelRecord({
          ...fuelForm,
          arlaLiters: fuelForm.hasArla ? fuelForm.arlaLiters : 0,
          cost: fuelForm.location === 'STREET' ? fuelForm.cost : 0,
          arlaCost: (fuelForm.hasArla && fuelForm.location === 'STREET') ? fuelForm.arlaCost : 0,
          loggedBy: currentUser.id,
          averageConsumption: average
      });
      alert(`Abastecimento registrado! Média: ${average.toFixed(2)} km/L`);
      setFuelForm({ date: getTodayLocal(), busId: '', dieselLiters: 0, hasArla: false, arlaLiters: 0, location: 'GARAGE', cost: 0, arlaCost: 0, stationName: '', kmStart: 0, kmEnd: 0 });
  };

  const handleFuelSupplySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (supplyForm.liters <= 0 || !supplyForm.supplier || !supplyForm.nfe) {
          alert("Preencha fornecedor, NFe e litros.");
          return;
      }
      addFuelSupply({ ...supplyForm });
      alert("Entrada de combustível salva e lançada no financeiro!");
      setSupplyForm({ date: getTodayLocal(), liters: 0, cost: 0, supplier: '', nfe: '', type: 'DIESEL', receiverName: currentUser.name || '', registeredInFinance: true });
  };

  const filteredParts = parts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFuelRecords = fuelRecords.filter(r => (!supplyFilterStart || r.date >= supplyFilterStart) && (!supplyFilterEnd || r.date <= supplyFilterEnd)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filteredSupplies = fuelSupplies.filter(s => (!supplyFilterStart || s.date >= supplyFilterStart) && (!supplyFilterEnd || s.date <= supplyFilterEnd)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingRequests = purchaseRequests.filter(r => r.status === 'PENDING').sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {restockItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                  <h3 className="font-bold text-lg mb-4 text-slate-800">📦 Entrada: {restockItem.name}</h3>
                  <form onSubmit={handleRestockSubmit} className="space-y-3">
                      <input type="number" min="1" required value={restockForm.quantity} onChange={e => setRestockForm({...restockForm, quantity: parseInt(e.target.value)})} className="w-full border p-2 rounded" placeholder="Qtd" />
                      <input type="number" step="0.01" required value={restockForm.unitCost} onChange={e => setRestockForm({...restockForm, unitCost: parseFloat(e.target.value)})} className="w-full border p-2 rounded" placeholder="Custo Unitário" />
                      <input required value={restockForm.supplier} onChange={e => setRestockForm({...restockForm, supplier: e.target.value})} className="w-full border p-2 rounded" placeholder="Fornecedor" />
                      <input required value={restockForm.nfe} onChange={e => setRestockForm({...restockForm, nfe: e.target.value})} className="w-full border p-2 rounded" placeholder="Nota Fiscal" />
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setRestockItem(null)} className="flex-1 bg-slate-200 py-2 rounded">Cancelar</button>
                          <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded">Confirmar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-black text-slate-800 uppercase">Insumos & Abastecimento</h2>
        <div className="flex gap-2 flex-wrap justify-center md:justify-end">
            {!isOperational && <button onClick={() => setViewMode('STOCK')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase ${viewMode === 'STOCK' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border text-slate-600'}`}>Peças</button>}
            {!isOperational && <button onClick={() => setViewMode('REQUESTS')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase relative ${viewMode === 'REQUESTS' ? 'bg-orange-600 text-white shadow-md' : 'bg-white border text-slate-600'}`}>Solicitações</button>}
            <button onClick={() => setViewMode('FUEL_CONSUMPTION')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase ${viewMode === 'FUEL_CONSUMPTION' ? 'bg-blue-700 text-white shadow-md' : 'bg-white border text-slate-600'}`}>Abastecimento (Saída)</button>
            {!isOperational && <button onClick={() => setViewMode('FUEL_SUPPLY')} className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase ${viewMode === 'FUEL_SUPPLY' ? 'bg-emerald-700 text-white shadow-md' : 'bg-white border text-slate-600'}`}>Tanque (Entrada)</button>}
        </div>
      </div>

      {viewMode === 'STOCK' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b flex gap-4">
                  <input type="text" placeholder="🔍 Buscar peça..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 border p-2 rounded-lg text-sm" />
                  {canManageStock && <button onClick={() => setShowAddForm(!showAddForm)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold">+ Peça</button>}
              </div>
              {showAddForm && (
                  <div className="p-4 bg-slate-50 border-b">
                      <form onSubmit={handleAddPart} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <input placeholder="Nome da Peça" required value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} className="border p-2 rounded" />
                          <input type="number" placeholder="Qtd Inicial" required onChange={e => setNewPart({...newPart, quantity: parseInt(e.target.value)})} className="border p-2 rounded" />
                          <input type="number" placeholder="Mínimo Alerta" required onChange={e => setNewPart({...newPart, minQuantity: parseInt(e.target.value)})} className="border p-2 rounded" />
                          <button type="submit" className="bg-blue-600 text-white py-2 rounded font-bold uppercase text-xs">Cadastrar</button>
                      </form>
                  </div>
              )}
              <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b">
                      <tr><th className="p-4">Item</th><th className="p-4">Custo</th><th className="p-4 text-center">Qtd</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Ação</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                      {filteredParts.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum item.</td></tr>) : filteredParts.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                              <td className="p-4 text-slate-800">{p.name}</td>
                              <td className="p-4 text-slate-500 text-sm">R$ {p.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                              <td className="p-4 text-center text-lg">{p.quantity}</td>
                              <td className="p-4 text-center">
                                  {p.quantity <= p.minQuantity ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-[9px]">CRÍTICO</span> : <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[9px]">OK</span>}
                              </td>
                              <td className="p-4 text-right">
                                  <button onClick={() => handleOpenRestock(p)} className="text-blue-600 text-xs hover:underline uppercase">Entrada</button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {viewMode === 'REQUESTS' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-black text-slate-800 uppercase text-lg">Pedidos da Manutenção</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b">
                          <tr><th className="p-4">Data</th><th className="p-4">Solicitante</th><th className="p-4">Item</th><th className="p-4">Veículo</th><th className="p-4 text-right">Ações</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-sm">
                          {pendingRequests.length === 0 ? (
                              <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhum pedido pendente.</td></tr>
                          ) : pendingRequests.map(req => {
                              const requester = users.find(u => u.id === req.requesterId);
                              const bus = buses.find(b => b.id === req.relatedBusId);
                              return (
                                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="p-4 text-slate-500 font-medium">{formatDate(req.requestDate)}</td>
                                      <td className="p-4 text-slate-700">{requester?.name || 'Mecânico'}</td>
                                      <td className="p-4"><span>{req.partName}</span><span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">x{req.quantity}</span></td>
                                      <td className="p-4 text-slate-600">{bus ? bus.plate : 'Geral'}</td>
                                      <td className="p-4 text-right flex justify-end gap-2">
                                          <button onClick={() => updatePurchaseRequestStatus(req.id, 'APPROVED')} className="bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase">V</button>
                                          <button onClick={() => updatePurchaseRequestStatus(req.id, 'REJECTED')} className="bg-red-100 text-red-600 px-3 py-1 rounded text-[10px] font-black uppercase">X</button>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {viewMode === 'FUEL_SUPPLY' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl h-fit">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100">
                          <p className="text-[9px] font-black text-emerald-600 uppercase">Diesel</p>
                          <p className="text-2xl font-black text-emerald-900">{dieselStockLevel.toLocaleString()}L</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                          <p className="text-[9px] font-black text-blue-600 uppercase">Arla</p>
                          <p className="text-2xl font-black text-blue-900">{arlaStockLevel.toLocaleString()}L</p>
                      </div>
                  </div>
                  <h3 className="font-black text-slate-800 uppercase mb-4 text-sm">Entrada Tanque</h3>
                  <form onSubmit={handleFuelSupplySubmit} className="space-y-4">
                      <div className="flex gap-2">
                          <button type="button" onClick={() => setSupplyForm({...supplyForm, type: 'DIESEL'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black border ${supplyForm.type === 'DIESEL' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>DIESEL</button>
                          <button type="button" onClick={() => setSupplyForm({...supplyForm, type: 'ARLA'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black border ${supplyForm.type === 'ARLA' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>ARLA</button>
                      </div>
                      <input type="date" value={supplyForm.date} onChange={e => setSupplyForm({...supplyForm, date: e.target.value})} className="w-full border p-3 rounded-xl font-bold" />
                      <input placeholder="Fornecedor" required value={supplyForm.supplier} onChange={e => setSupplyForm({...supplyForm, supplier: e.target.value})} className="w-full border p-3 rounded-xl" />
                      <input placeholder="NFe" required value={supplyForm.nfe} onChange={e => setSupplyForm({...supplyForm, nfe: e.target.value})} className="w-full border p-3 rounded-xl" />
                      <div className="grid grid-cols-2 gap-2">
                          <input type="number" placeholder="Litragem" required onChange={e => setSupplyForm({...supplyForm, liters: parseFloat(e.target.value)})} className="w-full border p-3 rounded-xl" />
                          <input type="number" placeholder="Valor R$" required onChange={e => setSupplyForm({...supplyForm, cost: parseFloat(e.target.value)})} className="w-full border p-3 rounded-xl" />
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs">Confirmar Entrada</button>
                  </form>
              </div>
              <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b">
                              <tr><th className="p-4">Data</th><th className="p-4">Tipo</th><th className="p-4">Qtd</th><th className="p-4 text-right">Valor</th></tr>
                          </thead>
                          <tbody className="divide-y font-bold">
                              {filteredSupplies.map(s => (
                                  <tr key={s.id} className="hover:bg-slate-50">
                                      <td className="p-4">{formatDate(s.date)}</td>
                                      <td className="p-4"><span className={`px-2 py-0.5 rounded text-[9px] ${s.type === 'DIESEL' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{s.type}</span></td>
                                      <td className="p-4">{s.liters}L</td>
                                      <td className="p-4 text-right text-emerald-600">R$ {s.cost.toLocaleString('pt-BR')}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {viewMode === 'FUEL_CONSUMPTION' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl h-fit">
                  <h3 className="font-black text-slate-800 uppercase mb-4 text-sm">⛽ Lançar Abastecimento</h3>
                  <form onSubmit={handleFuelConsumptionSubmit} className="space-y-4">
                      <select onChange={handleBusChange} className="w-full border p-3 rounded-xl font-bold bg-slate-50" required>
                          <option value="">Ônibus...</option>
                          {buses.map(b => <option key={b.id} value={b.id}>{b.plate}</option>)}
                      </select>
                      
                      <div className="flex gap-2">
                          <button type="button" onClick={() => setFuelForm({...fuelForm, location: 'GARAGE'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black border ${fuelForm.location === 'GARAGE' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>GARAGEM</button>
                          <button type="button" onClick={() => setFuelForm({...fuelForm, location: 'STREET'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black border ${fuelForm.location === 'STREET' ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-400'}`}>POSTO</button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[9px] font-black text-slate-400 uppercase">KM Inicial</label><input type="number" readOnly value={fuelForm.kmStart} className="w-full border p-2 rounded-xl bg-slate-100 font-bold" /></div>
                          <div><label className="text-[9px] font-black text-slate-800 uppercase">KM Final</label><input type="number" required value={fuelForm.kmEnd || ''} onChange={e => setFuelForm({...fuelForm, kmEnd: parseInt(e.target.value)})} className="w-full border p-2 rounded-xl font-bold border-blue-200" /></div>
                      </div>

                      <div className="space-y-2 border-t pt-3">
                          <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-600 uppercase">Diesel (L)</label><input type="number" step="0.1" required onChange={e => setFuelForm({...fuelForm, dieselLiters: parseFloat(e.target.value)})} className="w-24 border p-2 rounded-xl font-bold text-right" /></div>
                          <div className="flex justify-between items-center">
                              <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 cursor-pointer uppercase"><input type="checkbox" checked={fuelForm.hasArla} onChange={e => setFuelForm({...fuelForm, hasArla: e.target.checked})} /> Arla?</label>
                              {fuelForm.hasArla && <input type="number" step="0.1" onChange={e => setFuelForm({...fuelForm, arlaLiters: parseFloat(e.target.value)})} className="w-24 border p-2 rounded-xl font-bold text-right border-blue-300" />}
                          </div>
                      </div>

                      {fuelForm.location === 'STREET' && (
                          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 space-y-2">
                              <p className="text-[9px] font-black text-orange-700 uppercase">Posto Externo</p>
                              <div className="grid grid-cols-2 gap-2">
                                  <div><label className="text-[9px] font-bold">Valor Diesel</label><input type="number" step="0.01" onChange={e => setFuelForm({...fuelForm, cost: parseFloat(e.target.value)})} className="w-full border p-2 rounded-xl font-bold" /></div>
                                  {fuelForm.hasArla && <div><label className="text-[9px] font-bold">Valor Arla</label><input type="number" step="0.01" onChange={e => setFuelForm({...fuelForm, arlaCost: parseFloat(e.target.value)})} className="w-full border p-2 rounded-xl font-bold" /></div>}
                              </div>
                          </div>
                      )}

                      <button type="submit" className="w-full bg-blue-700 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Salvar Abastecimento</button>
                  </form>
              </div>
              <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 border-b">
                              <tr><th className="p-4">Data</th><th className="p-4">Veículo</th><th className="p-4">Diesel</th><th className="p-4">Média</th><th className="p-4 text-right">Ação</th></tr>
                          </thead>
                          <tbody className="divide-y font-bold">
                              {filteredFuelRecords.map(r => {
                                  const bus = buses.find(b => b.id === r.busId);
                                  return (
                                      <tr key={r.id} className="hover:bg-slate-50">
                                          <td className="p-4 text-slate-500">{formatDate(r.date)}</td>
                                          <td className="p-4 text-slate-800">{bus?.plate}</td>
                                          <td className="p-4">{r.dieselLiters}L</td>
                                          <td className="p-4"><span className={`px-2 py-1 rounded font-black ${r.averageConsumption && r.averageConsumption > 3 ? 'text-emerald-600' : 'text-orange-600'}`}>{r.averageConsumption ? `${r.averageConsumption.toFixed(2)} km/L` : '-'}</span></td>
                                          <td className="p-4 text-right"><button onClick={() => { if(confirm("Excluir?")) deleteFuelRecord(r.id); }} className="text-red-400">✕</button></td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default InventoryView;
