
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Part, FuelRecord } from '../types';

const InventoryView: React.FC = () => {
  const { parts, updateStock, addPart, currentUser, purchaseRequests, users, buses, updatePurchaseRequestStatus, addFuelRecord, fuelRecords, fuelSupplies, addFuelSupply, fuelStockLevel, restockPart, updateFuelRecord, deleteFuelRecord } = useStore();
  
  // SEGURANÇA: Trava de acesso para Agente Comercial
  if (currentUser.role === UserRole.AGENT) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="text-red-500 text-5xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
        <p className="text-slate-500">O perfil de Agente Comercial não possui permissão para gerenciar o estoque de peças.</p>
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
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
  };
  
  const [newPart, setNewPart] = useState({ name: '', quantity: 0, minQuantity: 5, price: 0, lastSupplier: '', lastNfe: '' });
  const [viewMode, setViewMode] = useState<'STOCK' | 'REQUESTS' | 'FUEL_CONSUMPTION' | 'FUEL_SUPPLY'>('STOCK');
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
      receiverName: currentUser.name || '',
      registeredInFinance: true
  });
  
  const [supplyFilterStart, setSupplyFilterStart] = useState('');
  const [supplyFilterEnd, setSupplyFilterEnd] = useState('');

  const [restockItem, setRestockItem] = useState<Part | null>(null);
  const [restockForm, setRestockForm] = useState({
      quantity: 1,
      unitCost: 0,
      supplier: '',
      nfe: ''
  });

  const canManageStock = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER || currentUser.role === UserRole.FINANCE;

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    addPart(newPart);
    setShowAddForm(false);
    setNewPart({ name: '', quantity: 0, minQuantity: 5, price: 0, lastSupplier: '', lastNfe: '' });
  };

  const handleRestockPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, "");
    const realValue = Number(digits) / 100;
    setRestockForm(prev => ({ ...prev, unitCost: realValue }));
  };

  const handleOpenRestock = (part: Part) => {
      setRestockItem(part);
      setRestockForm({
          quantity: 1,
          unitCost: part.price || 0,
          supplier: part.lastSupplier || '',
          nfe: ''
      });
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!restockItem) return;
      await restockPart(restockItem.id, restockForm.quantity, restockForm.unitCost, restockForm.supplier, restockForm.nfe);
      alert("Entrada registrada com sucesso!");
      setRestockItem(null);
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
      const totalCost = fuelForm.location === 'STREET' ? (fuelForm.cost + (fuelForm.hasArla ? fuelForm.arlaCost : 0)) : 0;

      addFuelRecord({
          ...fuelForm,
          arlaLiters: fuelForm.hasArla ? fuelForm.arlaLiters : 0,
          cost: totalCost,
          arlaCost: fuelForm.hasArla && fuelForm.location === 'STREET' ? fuelForm.arlaCost : 0,
          loggedBy: currentUser.id,
          averageConsumption: average
      });
      alert(`Consumo registrado! Média: ${average.toFixed(2)} km/L`);
      setFuelForm({ date: getTodayLocal(), busId: '', dieselLiters: 0, hasArla: false, arlaLiters: 0, location: 'GARAGE', cost: 0, arlaCost: 0, stationName: '', kmStart: 0, kmEnd: 0 });
  };

  const handleDeleteFuel = async (id: string) => {
      if (confirm("Excluir este abastecimento permanentemente?")) {
          await deleteFuelRecord(id);
      }
  };

  const handleFuelSupplySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (supplyForm.liters <= 0) return;
      addFuelSupply({ ...supplyForm, type: 'DIESEL' });
      alert("Entrada de combustível salva!");
      setSupplyForm({ date: getTodayLocal(), liters: 0, cost: 0, receiverName: currentUser.name || '', registeredInFinance: true });
  };

  const filteredParts = parts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredFuelRecords = fuelRecords.filter(r => {
    if(supplyFilterStart && r.date < supplyFilterStart) return false;
    if(supplyFilterEnd && r.date > supplyFilterEnd) return false;
    return true;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredSupplies = fuelSupplies.filter(s => {
    if(supplyFilterStart && s.date < supplyFilterStart) return false;
    if(supplyFilterEnd && s.date > supplyFilterEnd) return false;
    return true;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* RESTOCK MODAL */}
      {restockItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                  <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">📦 Entrada: {restockItem.name}</h3>
                  <form onSubmit={handleRestockSubmit} className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantidade</label>
                          <input type="number" min="1" required value={restockForm.quantity} onChange={e => setRestockForm({...restockForm, quantity: parseInt(e.target.value)})} className="w-full border p-2 rounded text-lg font-bold" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Unitário (R$)</label>
                          <input type="text" inputMode="numeric" required value={restockForm.unitCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})} onChange={handleRestockPriceChange} className="w-full border p-2 rounded" />
                      </div>
                      <input required value={restockForm.supplier} onChange={e => setRestockForm({...restockForm, supplier: e.target.value})} className="w-full border p-2 rounded" placeholder="Fornecedor" />
                      <input required value={restockForm.nfe} onChange={e => setRestockForm({...restockForm, nfe: e.target.value})} className="w-full border p-2 rounded" placeholder="Nota Fiscal" />
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setRestockItem(null)} className="flex-1 bg-slate-200 py-2 rounded font-bold">Cancelar</button>
                          <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded font-bold">Confirmar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Controle de Estoque</h2>
        <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => setViewMode('STOCK')} className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors ${viewMode === 'STOCK' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}>Peças</button>
            <button onClick={() => setViewMode('FUEL_SUPPLY')} className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors ${viewMode === 'FUEL_SUPPLY' ? 'bg-green-700 text-white' : 'bg-white border text-slate-600'}`}>Entrada Comb.</button>
            <button onClick={() => setViewMode('FUEL_CONSUMPTION')} className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors ${viewMode === 'FUEL_CONSUMPTION' ? 'bg-blue-700 text-white' : 'bg-white border text-slate-600'}`}>Saída/Consumo</button>
            <button onClick={() => setViewMode('REQUESTS')} className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors ${viewMode === 'REQUESTS' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}>Solicitações</button>
        </div>
      </div>

      {viewMode === 'STOCK' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b flex gap-4">
                  <input type="text" placeholder="🔍 Buscar peça..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 border p-2 rounded-lg text-sm" />
                  {canManageStock && <button onClick={() => setShowAddForm(!showAddForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">+ Peça</button>}
              </div>
              {showAddForm && (
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <form onSubmit={handleAddPart} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <input placeholder="Nome da Peça" required value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} className="border p-2 rounded" />
                          <input type="number" placeholder="Qtd" required onChange={e => setNewPart({...newPart, quantity: parseInt(e.target.value)})} className="border p-2 rounded" />
                          <input type="number" placeholder="Minimo" required onChange={e => setNewPart({...newPart, minQuantity: parseInt(e.target.value)})} className="border p-2 rounded" />
                          <button type="submit" className="bg-green-600 text-white py-2 rounded font-bold">Salvar</button>
                      </form>
                  </div>
              )}
              <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold">
                      <tr><th className="p-4">Item</th><th className="p-4">Custo</th><th className="p-4 text-center">Quantidade</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Ação</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredParts.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma peça encontrada.</td></tr>
                      ) : filteredParts.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                              <td className="p-4 font-medium">{p.name}</td>
                              <td className="p-4">R$ {p.price.toLocaleString('pt-BR')}</td>
                              <td className="p-4 text-center font-bold">{p.quantity}</td>
                              <td className="p-4 text-center">
                                  {p.quantity <= p.minQuantity ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-[10px] font-bold">Crítico</span> : <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold">Ok</span>}
                              </td>
                              <td className="p-4 text-right">
                                  <button onClick={() => handleOpenRestock(p)} className="text-blue-600 font-bold text-xs hover:underline">Dar Entrada</button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {viewMode === 'FUEL_SUPPLY' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 h-fit">
                  <div className="bg-green-100 p-4 rounded-lg text-center mb-6">
                      <p className="text-xs font-bold text-green-800 uppercase">Estoque Tanque</p>
                      <p className="text-3xl font-bold text-green-900">{fuelStockLevel} L</p>
                  </div>
                  <h3 className="font-bold mb-4">Nova Compra de Diesel</h3>
                  <form onSubmit={handleFuelSupplySubmit} className="space-y-4">
                      <input type="date" value={supplyForm.date} onChange={e => setSupplyForm({...supplyForm, date: e.target.value})} className="w-full border p-2 rounded" />
                      <input type="number" placeholder="Litros" onChange={e => setSupplyForm({...supplyForm, liters: parseFloat(e.target.value)})} className="w-full border p-2 rounded" />
                      <input type="number" placeholder="Valor Total (R$)" onChange={e => setSupplyForm({...supplyForm, cost: parseFloat(e.target.value)})} className="w-full border p-2 rounded" />
                      <button type="submit" className="w-full bg-green-700 text-white py-3 rounded font-bold shadow-md">Salvar Entrada</button>
                  </form>
              </div>
              <div className="lg:col-span-2">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-4 bg-white p-4 rounded-lg border border-slate-200 gap-4">
                      <h3 className="font-bold text-slate-700">Histórico de Recebimento</h3>
                      <div className="flex gap-2 text-xs items-center font-medium bg-slate-50 p-2 rounded-lg">
                          <span>Filtrar:</span>
                          <input type="date" value={supplyFilterStart} onChange={e => setSupplyFilterStart(e.target.value)} className="border p-1 rounded" title="Data Inicial" />
                          <span>até</span>
                          <input type="date" value={supplyFilterEnd} onChange={e => setSupplyFilterEnd(e.target.value)} className="border p-1 rounded" title="Data Final" />
                      </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b">
                              <tr><th className="p-3">Data</th><th className="p-3">Qtd</th><th className="p-3">Valor</th><th className="p-3">Responsável</th></tr>
                          </thead>
                          <tbody className="divide-y">
                              {filteredSupplies.length === 0 ? (
                                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum registro para o período.</td></tr>
                              ) : filteredSupplies.map(s => (
                                  <tr key={s.id} className="hover:bg-slate-50">
                                      <td className="p-3 text-sm">{formatDate(s.date)}</td>
                                      <td className="p-3 font-bold text-green-700">{s.liters} L</td>
                                      <td className="p-3 text-sm">R$ {s.cost.toLocaleString('pt-BR')}</td>
                                      <td className="p-3 text-sm">{s.receiverName}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {viewMode === 'FUEL_CONSUMPTION' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 h-fit">
                  <h3 className="font-bold mb-4 flex items-center gap-2">⛽ Lançar Abastecimento</h3>
                  <form onSubmit={handleFuelConsumptionSubmit} className="space-y-4">
                      <select onChange={handleBusChange} className="w-full border p-2 rounded bg-slate-50" required>
                          <option value="">Selecione o ônibus...</option>
                          {buses.map(b => <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                          <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400">KM Inicial</label>
                              <input type="number" placeholder="0" value={fuelForm.kmStart} onChange={e => setFuelForm({...fuelForm, kmStart: parseInt(e.target.value)})} className="w-full border p-2 rounded text-center bg-slate-100" />
                          </div>
                          <div>
                              <label className="text-[10px] uppercase font-bold text-slate-400">KM Final</label>
                              <input type="number" placeholder="0" value={fuelForm.kmEnd || ''} onChange={e => setFuelForm({...fuelForm, kmEnd: parseInt(e.target.value)})} className="w-full border p-2 rounded text-center font-bold" />
                          </div>
                      </div>
                      <input type="number" step="0.1" placeholder="Litros Diesel" onChange={e => setFuelForm({...fuelForm, dieselLiters: parseFloat(e.target.value)})} className="w-full border p-2 rounded" />
                      <button type="submit" className="w-full bg-blue-700 text-white py-3 rounded font-bold shadow-md hover:bg-blue-800 transition-colors">Salvar Saída</button>
                  </form>
              </div>
              <div className="lg:col-span-2">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-4 bg-white p-4 rounded-lg border border-slate-200 gap-4">
                      <h3 className="font-bold text-slate-700">Histórico de Consumo</h3>
                      <div className="flex gap-2 text-xs items-center font-medium bg-slate-50 p-2 rounded-lg">
                          <span>Filtrar período:</span>
                          <input type="date" value={supplyFilterStart} onChange={e => setSupplyFilterStart(e.target.value)} className="border p-1 rounded" title="Data Inicial" />
                          <span>até</span>
                          <input type="date" value={supplyFilterEnd} onChange={e => setSupplyFilterEnd(e.target.value)} className="border p-1 rounded" title="Data Final" />
                      </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b">
                              <tr><th className="p-3">Data</th><th className="p-3">Veículo</th><th className="p-3">KM Perc.</th><th className="p-3">Diesel</th><th className="p-3">Média</th><th className="p-3 text-right">Ação</th></tr>
                          </thead>
                          <tbody className="divide-y">
                              {filteredFuelRecords.length === 0 ? (
                                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum registro de consumo para o período.</td></tr>
                              ) : filteredFuelRecords.map(r => {
                                  const bus = buses.find(b => b.id === r.busId);
                                  const dist = (r.kmEnd && r.kmStart) ? r.kmEnd - r.kmStart : 0;
                                  return (
                                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="p-3 text-sm text-slate-600">{formatDate(r.date)}</td>
                                          <td className="p-3 font-bold text-slate-800">{bus?.plate}</td>
                                          <td className="p-3 text-sm text-slate-600">{dist > 0 ? `${dist} km` : '-'}</td>
                                          <td className="p-3 text-sm font-bold text-blue-700">{r.dieselLiters} L</td>
                                          <td className="p-3 font-bold text-blue-600">{r.averageConsumption ? `${r.averageConsumption.toFixed(2)} km/l` : '-'}</td>
                                          <td className="p-3 text-right"><button onClick={() => handleDeleteFuel(r.id)} className="text-red-400 hover:text-red-600 transition-colors">✕</button></td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {viewMode === 'REQUESTS' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 text-center">
              <p className="text-slate-500 italic">Solicitações de compra enviadas pela manutenção aparecerão aqui.</p>
          </div>
      )}
    </div>
  );
};

export default InventoryView;
