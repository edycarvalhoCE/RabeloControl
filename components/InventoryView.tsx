
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Part } from '../types';

const InventoryView: React.FC = () => {
  const { parts, updateStock, addPart, currentUser, purchaseRequests, users, buses, updatePurchaseRequestStatus, addFuelRecord, fuelRecords, fuelSupplies, addFuelSupply, fuelStockLevel, restockPart } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New Item State (Added supplier/nfe fields)
  const [newPart, setNewPart] = useState({ name: '', quantity: 0, minQuantity: 5, price: 0, lastSupplier: '', lastNfe: '' });
  
  const [viewMode, setViewMode] = useState<'STOCK' | 'REQUESTS' | 'FUEL_CONSUMPTION' | 'FUEL_SUPPLY'>('STOCK');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Fuel CONSUMPTION Form State
  const [fuelForm, setFuelForm] = useState({
      date: new Date().toISOString().split('T')[0],
      busId: '',
      dieselLiters: 0,
      hasArla: false,
      arlaLiters: 0,
      location: 'GARAGE' as 'GARAGE' | 'STREET',
      cost: 0,
      stationName: ''
  });

  // Fuel SUPPLY Form State
  const [supplyForm, setSupplyForm] = useState({
      date: new Date().toISOString().split('T')[0],
      liters: 0,
      cost: 0,
      receiverName: currentUser.name || '',
      registeredInFinance: true
  });
  
  // Fuel History Filters
  const [supplyFilterStart, setSupplyFilterStart] = useState('');
  const [supplyFilterEnd, setSupplyFilterEnd] = useState('');

  // RESTOCK MODAL STATE
  const [restockItem, setRestockItem] = useState<Part | null>(null);
  const [restockForm, setRestockForm] = useState({
      quantity: 1,
      unitCost: 0,
      supplier: '',
      nfe: ''
  });

  const isMechanic = currentUser.role === UserRole.MECHANIC;
  // Finance user is treated like manager here
  const canManageStock = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER || currentUser.role === UserRole.FINANCE;

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    addPart(newPart);
    setShowAddForm(false);
    setNewPart({ name: '', quantity: 0, minQuantity: 5, price: 0, lastSupplier: '', lastNfe: '' });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, setter: any) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, "");
    const realValue = Number(digits) / 100;
    setter((prev: any) => ({ ...prev, price: realValue }));
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
      if (restockForm.quantity <= 0) {
          alert("Quantidade inválida.");
          return;
      }

      await restockPart(restockItem.id, restockForm.quantity, restockForm.unitCost, restockForm.supplier, restockForm.nfe);
      alert("Entrada registrada com sucesso!");
      setRestockItem(null);
  };

  const handleFuelConsumptionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!fuelForm.busId || fuelForm.dieselLiters <= 0) {
          alert("Selecione o ônibus e informe a quantidade de Diesel.");
          return;
      }
      
      if (fuelForm.hasArla && (fuelForm.arlaLiters <= 0 || !fuelForm.arlaLiters)) {
         alert("⚠️ Atenção: Você marcou que abasteceu Arla.\nÉ obrigatório informar a quantidade de litros de Arla.");
         return;
      }
      
      addFuelRecord({
          date: fuelForm.date,
          busId: fuelForm.busId,
          dieselLiters: fuelForm.dieselLiters,
          arlaLiters: fuelForm.hasArla ? fuelForm.arlaLiters : 0,
          hasArla: fuelForm.hasArla,
          location: fuelForm.location,
          cost: fuelForm.location === 'STREET' ? fuelForm.cost : 0,
          stationName: fuelForm.location === 'STREET' ? fuelForm.stationName : '',
          loggedBy: currentUser.id
      });
      alert("Consumo registrado com sucesso!");
      setFuelForm({
        date: new Date().toISOString().split('T')[0],
        busId: '',
        dieselLiters: 0,
        hasArla: false,
        arlaLiters: 0,
        location: 'GARAGE',
        cost: 0,
        stationName: ''
      });
  };

  const handleFuelSupplySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (supplyForm.liters <= 0 || !supplyForm.receiverName) return;

      addFuelSupply({
          date: supplyForm.date,
          liters: supplyForm.liters,
          cost: supplyForm.cost,
          receiverName: supplyForm.receiverName,
          registeredInFinance: supplyForm.registeredInFinance,
          type: 'DIESEL' 
      });

      alert("Entrada de combustível registrada!");
      setSupplyForm({
          date: new Date().toISOString().split('T')[0],
          liters: 0,
          cost: 0,
          receiverName: currentUser.name || '',
          registeredInFinance: true
      });
  };

  const filteredParts = parts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSupplies = fuelSupplies.filter(s => {
      if(supplyFilterStart && new Date(s.date) < new Date(supplyFilterStart)) return false;
      if(supplyFilterEnd && new Date(s.date) > new Date(supplyFilterEnd)) return false;
      return true;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* RESTOCK MODAL */}
      {restockItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
                  <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                      <span className="bg-green-100 text-green-600 p-1.5 rounded text-sm">📦</span>
                      Entrada de Estoque: {restockItem.name}
                  </h3>
                  <form onSubmit={handleRestockSubmit} className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantidade (Entrada)</label>
                          <input 
                              type="number" min="1" required
                              value={restockForm.quantity} 
                              onChange={e => setRestockForm({...restockForm, quantity: parseInt(e.target.value)})}
                              className="w-full border p-2 rounded text-lg font-bold text-slate-800"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custo Unitário (R$)</label>
                          <input 
                              type="text" inputMode="numeric" required
                              value={restockForm.unitCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                              onChange={handleRestockPriceChange}
                              className="w-full border p-2 rounded"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fornecedor</label>
                          <input 
                              required
                              value={restockForm.supplier} 
                              onChange={e => setRestockForm({...restockForm, supplier: e.target.value})}
                              className="w-full border p-2 rounded"
                              placeholder="Ex: Auto Peças Silva"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número Nota Fiscal</label>
                          <input 
                              required
                              value={restockForm.nfe} 
                              onChange={e => setRestockForm({...restockForm, nfe: e.target.value})}
                              className="w-full border p-2 rounded"
                              placeholder="Ex: 12345"
                          />
                      </div>
                      
                      <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-200 mt-2">
                          Esta operação criará automaticamente uma despesa no financeiro.
                      </div>

                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setRestockItem(null)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded font-bold">Cancelar</button>
                          <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Confirmar Entrada</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Controle de Estoque</h2>
        
        <div className="flex flex-col md:flex-row gap-2 items-center w-full md:w-auto">
            {viewMode === 'STOCK' && (
                <div className="relative w-full md:w-64">
                    <input 
                        type="text" 
                        placeholder="🔍 Buscar peça..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            )}

            <div className="flex gap-2 flex-wrap justify-end">
                <button 
                    onClick={() => setViewMode('STOCK')}
                    className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors ${viewMode === 'STOCK' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}
                >
                    Peças
                </button>
                <button 
                    onClick={() => setViewMode('FUEL_SUPPLY')}
                    className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors ${viewMode === 'FUEL_SUPPLY' ? 'bg-green-700 text-white' : 'bg-white border text-slate-600'}`}
                >
                    Entrada Comb.
                </button>
                <button 
                    onClick={() => setViewMode('FUEL_CONSUMPTION')}
                    className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors ${viewMode === 'FUEL_CONSUMPTION' ? 'bg-blue-700 text-white' : 'bg-white border text-slate-600'}`}
                >
                    Saída/Consumo
                </button>
                <button 
                    onClick={() => setViewMode('REQUESTS')}
                    className={`px-3 py-2 rounded-lg font-medium text-xs transition-colors ${viewMode === 'REQUESTS' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}
                >
                    Solicitações
                    {purchaseRequests.filter(r => r.status === 'PENDING').length > 0 && (
                        <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {purchaseRequests.filter(r => r.status === 'PENDING').length}
                        </span>
                    )}
                </button>
                {canManageStock && viewMode === 'STOCK' && (
                    <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors ml-1 text-xs"
                    >
                    {showAddForm ? 'Cancelar' : '+ Item'}
                    </button>
                )}
            </div>
        </div>
      </div>

      {viewMode === 'STOCK' && (
          <>
            {showAddForm && canManageStock && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                <h3 className="font-bold text-lg mb-4">Cadastrar Novo Item</h3>
                <form onSubmit={handleAddPart} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input 
                        placeholder="Nome da Peça" required
                        value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})}
                        className="border p-2 rounded"
                    />
                    <input 
                        type="number" placeholder="Qtd. Inicial" required
                        value={newPart.quantity || ''} onChange={e => setNewPart({...newPart, quantity: parseInt(e.target.value)})}
                        className="border p-2 rounded"
                    />
                    <input 
                        type="number" placeholder="Estoque Mínimo" required
                        value={newPart.minQuantity || ''} onChange={e => setNewPart({...newPart, minQuantity: parseInt(e.target.value)})}
                        className="border p-2 rounded"
                    />
                    
                    <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500">
                        <span className="bg-slate-100 text-slate-600 px-2 py-2 font-bold border-r border-slate-300 text-sm">R$</span>
                        <input 
                            type="text" 
                            inputMode="numeric"
                            required 
                            value={newPart.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                            onChange={(e) => handlePriceChange(e, setNewPart)}
                            className="w-full p-2 outline-none text-right font-bold text-slate-800"
                            placeholder="Custo Unit."
                        />
                    </div>

                    {/* Additional fields for initial record */}
                    <input 
                        placeholder="Fornecedor Inicial" 
                        value={newPart.lastSupplier} onChange={e => setNewPart({...newPart, lastSupplier: e.target.value})}
                        className="border p-2 rounded"
                    />
                    <input 
                        placeholder="Nº Nota Fiscal" 
                        value={newPart.lastNfe} onChange={e => setNewPart({...newPart, lastNfe: e.target.value})}
                        className="border p-2 rounded"
                    />

                    <button type="submit" className="md:col-span-4 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold">
                        Salvar Item no Estoque
                    </button>
                </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-sm uppercase font-semibold">
                    <tr>
                    <th className="p-4">Item</th>
                    <th className="p-4">Último Custo</th>
                    <th className="p-4 text-center">Quantidade</th>
                    <th className="p-4 text-center">Status</th>
                    {!isMechanic && <th className="p-4 text-right">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredParts.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma peça encontrada.</td></tr>
                    ) : (
                        filteredParts.map(part => (
                        <tr key={part.id} className="hover:bg-slate-50">
                            <td className="p-4 font-medium text-slate-800">
                                {part.name}
                                {part.lastSupplier && (
                                    <span className="block text-[10px] text-slate-400 font-normal">Forn: {part.lastSupplier}</span>
                                )}
                            </td>
                            <td className="p-4 text-slate-600">{part.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td className="p-4 text-center">
                            <span className="font-bold text-lg">{part.quantity}</span>
                            <span className="text-xs text-slate-400 block">Min: {part.minQuantity}</span>
                            </td>
                            <td className="p-4 text-center">
                            {part.quantity <= part.minQuantity ? (
                                <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">Crítico</span>
                            ) : (
                                <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Normal</span>
                            )}
                            </td>
                            {!isMechanic && (
                                <td className="p-4 text-right space-x-2">
                                <button 
                                    onClick={() => updateStock(part.id, -1)}
                                    className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                    title="Registrar Saída Rápida"
                                >
                                    -
                                </button>
                                <button 
                                    onClick={() => handleOpenRestock(part)}
                                    className="w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                                    title="Registrar Entrada (Compra)"
                                >
                                    +
                                </button>
                                </td>
                            )}
                        </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
          </>
      )}

      {viewMode === 'FUEL_SUPPLY' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                  <div className="mb-6 bg-green-100 p-4 rounded-lg border border-green-200 text-center">
                      <p className="text-sm text-green-800 font-bold uppercase mb-1">Estoque Diesel (Tanque)</p>
                      <p className="text-3xl font-bold text-green-900">{fuelStockLevel} L</p>
                  </div>

                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                      <span className="bg-green-100 text-green-600 p-1.5 rounded">⬇️</span>
                      Registrar Entrada (Compra)
                  </h3>
                  <form onSubmit={handleFuelSupplySubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Data Recebimento</label>
                          <input 
                              type="date" required 
                              value={supplyForm.date} 
                              onChange={e => setSupplyForm({...supplyForm, date: e.target.value})}
                              className="w-full border p-2 rounded bg-slate-50"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Responsável Recebimento</label>
                          <input 
                                required value={supplyForm.receiverName}
                                onChange={e => setSupplyForm({...supplyForm, receiverName: e.target.value})}
                                placeholder="Nome de quem recebeu"
                                className="w-full border p-2 rounded"
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1">Qtd (Litros)</label>
                            <input 
                                type="number" min="1" required
                                value={supplyForm.liters || ''} 
                                onChange={e => setSupplyForm({...supplyForm, liters: parseFloat(e.target.value)})}
                                className="w-full border p-2 rounded outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1">Valor Total (R$)</label>
                            <input 
                                type="number" step="0.01" min="0" required
                                value={supplyForm.cost || ''} 
                                onChange={e => setSupplyForm({...supplyForm, cost: parseFloat(e.target.value)})}
                                className="w-full border p-2 rounded outline-none"
                            />
                          </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                          <label className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={supplyForm.registeredInFinance}
                                onChange={e => setSupplyForm({...supplyForm, registeredInFinance: e.target.checked})}
                                className="rounded text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-bold text-slate-700">Lançar saída no Financeiro (Caixa)</span>
                          </label>
                          <p className="text-xs text-slate-500 mt-1 pl-6">
                              Se marcado, criará uma despesa no livro caixa automaticamente.
                          </p>
                      </div>

                      <button type="submit" className="w-full bg-green-700 text-white font-bold py-3 rounded hover:bg-green-800 shadow-md">
                          Confirmar Entrada no Estoque
                      </button>
                  </form>
              </div>

              {/* Histórico Entradas */}
              <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-slate-700">Histórico de Recebimento</h3>
                    <div className="flex gap-2 text-sm items-center">
                        <input type="date" className="border p-1 rounded" value={supplyFilterStart} onChange={e => setSupplyFilterStart(e.target.value)} />
                        <span>até</span>
                        <input type="date" className="border p-1 rounded" value={supplyFilterEnd} onChange={e => setSupplyFilterEnd(e.target.value)} />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                              <tr>
                                  <th className="p-3">Data</th>
                                  <th className="p-3">Qtd. Litros</th>
                                  <th className="p-3">Valor Total</th>
                                  <th className="p-3">Recebido Por</th>
                                  <th className="p-3 text-center">Financ.</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredSupplies.length === 0 ? (
                                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum registro encontrado no período.</td></tr>
                              ) : (
                                  filteredSupplies.map(s => (
                                      <tr key={s.id} className="hover:bg-slate-50">
                                          <td className="p-3 text-sm text-slate-600">{new Date(s.date).toLocaleDateString()}</td>
                                          <td className="p-3 font-bold text-green-700">{s.liters} L</td>
                                          <td className="p-3 text-sm">R$ {s.cost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                          <td className="p-3 text-sm text-slate-700">{s.receiverName}</td>
                                          <td className="p-3 text-center">
                                              {s.registeredInFinance ? <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Sim</span> : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Não</span>}
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {viewMode === 'FUEL_CONSUMPTION' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form de Abastecimento (Saída) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-600 p-1.5 rounded">⛽</span>
                      Registrar Consumo
                  </h3>
                  <form onSubmit={handleFuelConsumptionSubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                          <input 
                              type="date" required 
                              value={fuelForm.date} 
                              onChange={e => setFuelForm({...fuelForm, date: e.target.value})}
                              className="w-full border p-2 rounded bg-slate-50"
                          />
                      </div>
                      
                      {/* NEW: Location Toggle */}
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setFuelForm({...fuelForm, location: 'GARAGE'})}
                            className={`py-2 text-sm font-bold rounded ${fuelForm.location === 'GARAGE' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                          >
                              🏢 Na Garagem
                          </button>
                          <button
                            type="button"
                            onClick={() => setFuelForm({...fuelForm, location: 'STREET'})}
                            className={`py-2 text-sm font-bold rounded ${fuelForm.location === 'STREET' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}
                          >
                              🛣️ Na Rua
                          </button>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Veículo / Modelo</label>
                          <select 
                              required 
                              value={fuelForm.busId} 
                              onChange={e => setFuelForm({...fuelForm, busId: e.target.value})}
                              className="w-full border p-2 rounded bg-slate-50"
                          >
                              <option value="">Selecione o ônibus...</option>
                              {buses.map(b => (
                                  <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                              ))}
                          </select>
                      </div>
                      
                      <div className="border-t border-slate-100 pt-3">
                        <label className="block text-sm font-bold text-slate-800 mb-2">Diesel</label>
                        <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white">
                            <input 
                                type="number" step="0.1" min="0" required
                                value={fuelForm.dieselLiters || ''} 
                                onChange={e => setFuelForm({...fuelForm, dieselLiters: parseFloat(e.target.value)})}
                                className="w-full p-2 outline-none"
                                placeholder="Qtd. Litros"
                            />
                            <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-l border-slate-300 text-xs">L</span>
                        </div>
                        {fuelForm.location === 'GARAGE' && (
                             <p className="text-xs text-green-600 mt-1">Será descontado do estoque interno ({fuelStockLevel} L)</p>
                        )}
                      </div>

                      {fuelForm.location === 'STREET' && (
                          <div className="bg-orange-50 p-3 rounded border border-orange-100 space-y-3 animate-fade-in">
                              <div>
                                  <label className="block text-xs font-bold text-orange-800 mb-1">Valor Pago (R$)</label>
                                  <input 
                                    type="number" step="0.01"
                                    value={fuelForm.cost || ''} onChange={e => setFuelForm({...fuelForm, cost: parseFloat(e.target.value)})}
                                    className="w-full border p-2 rounded text-sm" placeholder="0.00"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-orange-800 mb-1">Nome do Posto</label>
                                  <input 
                                    value={fuelForm.stationName} onChange={e => setFuelForm({...fuelForm, stationName: e.target.value})}
                                    className="w-full border p-2 rounded text-sm" placeholder="Ex: Posto Shell"
                                  />
                              </div>
                          </div>
                      )}

                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <label className="flex items-center justify-between cursor-pointer">
                              <span className="font-bold text-blue-800 text-sm">Abasteceu Arla 32?</span>
                              <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${fuelForm.hasArla ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                  <input 
                                      type="checkbox" 
                                      className="hidden" 
                                      checked={fuelForm.hasArla}
                                      onChange={e => setFuelForm({...fuelForm, hasArla: e.target.checked})}
                                  />
                                  <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${fuelForm.hasArla ? 'translate-x-5' : ''}`}></div>
                              </div>
                          </label>
                          
                          {fuelForm.hasArla && (
                              <div className="mt-3 animate-fade-in">
                                  <label className="block text-xs font-bold text-blue-700 mb-1">Qtd. Arla (Litros) *</label>
                                  <div className="flex items-center border border-blue-200 rounded overflow-hidden bg-white">
                                      <input 
                                          type="number" step="0.1" min="0" required
                                          value={fuelForm.arlaLiters || ''} 
                                          onChange={e => setFuelForm({...fuelForm, arlaLiters: parseFloat(e.target.value)})}
                                          className="w-full p-2 outline-none text-blue-900 font-bold"
                                          placeholder="0.0"
                                      />
                                      <span className="bg-blue-100 text-blue-600 px-3 py-2 font-bold border-l border-blue-200 text-xs">L</span>
                                  </div>
                              </div>
                          )}
                      </div>

                      <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded hover:bg-slate-700">
                          Lançar Consumo
                      </button>
                  </form>
              </div>

              {/* Histórico Consumo */}
              <div className="lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-slate-700">Histórico de Abastecimentos (Saídas)</h3>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                              <tr>
                                  <th className="p-3">Data</th>
                                  <th className="p-3">Veículo</th>
                                  <th className="p-3">Local</th>
                                  <th className="p-3">Diesel</th>
                                  <th className="p-3">Arla</th>
                                  <th className="p-3 text-right">Resp.</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {fuelRecords.length === 0 ? (
                                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum registro de abastecimento.</td></tr>
                              ) : (
                                  fuelRecords.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
                                      const bus = buses.find(b => b.id === record.busId);
                                      const user = users.find(u => u.id === record.loggedBy);
                                      return (
                                          <tr key={record.id} className="hover:bg-slate-50">
                                              <td className="p-3 text-sm text-slate-600">{new Date(record.date).toLocaleDateString()}</td>
                                              <td className="p-3 font-medium text-slate-800">
                                                  {bus?.plate} <span className="text-xs text-slate-500 block">{bus?.model}</span>
                                              </td>
                                              <td className="p-3">
                                                  {record.location === 'GARAGE' 
                                                    ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold">Garagem</span> 
                                                    : <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200 font-bold">Rua</span>}
                                              </td>
                                              <td className="p-3 text-sm font-bold text-slate-700">{record.dieselLiters} L</td>
                                              <td className="p-3 text-sm">
                                                  {record.hasArla ? <span className="text-blue-600 font-bold">{record.arlaLiters} L</span> : <span className="text-slate-300">-</span>}
                                              </td>
                                              <td className="p-3 text-right text-xs text-slate-500">{user?.name?.split(' ')[0] || 'N/A'}</td>
                                          </tr>
                                      );
                                  })
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {viewMode === 'REQUESTS' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-yellow-50">
                  <h3 className="font-bold text-yellow-800">Solicitações de Compra Pendentes</h3>
                  <p className="text-sm text-yellow-600">Peças solicitadas pela equipe de manutenção</p>
              </div>
              <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 text-sm uppercase font-semibold border-b border-slate-100">
                      <tr>
                          <th className="p-4">Data</th>
                          <th className="p-4">Item Solicitado</th>
                          <th className="p-4">Qtd</th>
                          <th className="p-4">Solicitante</th>
                          <th className="p-4">Para Veículo</th>
                          <th className="p-4 text-center">Status</th>
                          {!isMechanic && <th className="p-4 text-right">Ação</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {purchaseRequests.length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhuma solicitação de compra pendente.</td></tr>
                      ) : (
                          purchaseRequests.map(req => {
                              const requester = users.find(u => u.id === req.requesterId);
                              const relatedBus = buses.find(b => b.id === req.relatedBusId);
                              return (
                                  <tr key={req.id} className="hover:bg-slate-50">
                                      <td className="p-4 text-sm text-slate-500">{new Date(req.requestDate).toLocaleDateString()}</td>
                                      <td className="p-4 font-bold text-slate-800">{req.partName}</td>
                                      <td className="p-4 text-slate-700">{req.quantity}</td>
                                      <td className="p-4 text-sm text-slate-600">{requester?.name || 'Desconhecido'}</td>
                                      <td className="p-4 text-sm text-slate-600">{relatedBus ? relatedBus.plate : '-'}</td>
                                      <td className="p-4 text-center">
                                          {req.status === 'PENDING' ? (
                                              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold">Pendente</span>
                                          ) : (
                                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">Comprado</span>
                                          )}
                                      </td>
                                      {!isMechanic && req.status === 'PENDING' && (
                                          <td className="p-4 text-right">
                                              <button 
                                                onClick={() => updatePurchaseRequestStatus(req.id, 'COMPLETED')}
                                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                                              >
                                                  Marcar como Comprado
                                              </button>
                                          </td>
                                      )}
                                      {!isMechanic && req.status !== 'PENDING' && <td className="p-4"></td>}
                                  </tr>
                              );
                          })
                      )}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
};

export default InventoryView;
