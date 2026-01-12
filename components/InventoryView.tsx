import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

const InventoryView: React.FC = () => {
  const { parts, updateStock, addPart, currentUser, purchaseRequests, users, buses, updatePurchaseRequestStatus } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPart, setNewPart] = useState({ name: '', quantity: 0, minQuantity: 5, price: 0 });
  const [viewMode, setViewMode] = useState<'STOCK' | 'REQUESTS'>('STOCK');

  const isMechanic = currentUser.role === UserRole.MECHANIC;

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    addPart(newPart);
    setShowAddForm(false);
    setNewPart({ name: '', quantity: 0, minQuantity: 5, price: 0 });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Controle de Estoque</h2>
        
        <div className="flex gap-2">
            <button 
                onClick={() => setViewMode('STOCK')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'STOCK' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}
            >
                Peças em Estoque
            </button>
            <button 
                onClick={() => setViewMode('REQUESTS')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'REQUESTS' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}
            >
                Solicitações de Compra
                {purchaseRequests.filter(r => r.status === 'PENDING').length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {purchaseRequests.filter(r => r.status === 'PENDING').length}
                    </span>
                )}
            </button>
            {!isMechanic && viewMode === 'STOCK' && (
                <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors ml-2"
                >
                {showAddForm ? 'Cancelar' : '+ Nova Peça'}
                </button>
            )}
        </div>
      </div>

      {viewMode === 'STOCK' && (
          <>
            {showAddForm && !isMechanic && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                <h3 className="font-bold text-lg mb-4">Cadastrar Novo Item</h3>
                <form onSubmit={handleAddPart} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input 
                    placeholder="Nome da Peça" required
                    value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})}
                    className="border p-2 rounded"
                    />
                    <input 
                    type="number" placeholder="Quantidade Inicial" required
                    value={newPart.quantity || ''} onChange={e => setNewPart({...newPart, quantity: parseInt(e.target.value)})}
                    className="border p-2 rounded"
                    />
                    <input 
                    type="number" placeholder="Estoque Mínimo" required
                    value={newPart.minQuantity || ''} onChange={e => setNewPart({...newPart, minQuantity: parseInt(e.target.value)})}
                    className="border p-2 rounded"
                    />
                    <input 
                    type="number" placeholder="Preço Unitário" step="0.01" required
                    value={newPart.price || ''} onChange={e => setNewPart({...newPart, price: parseFloat(e.target.value)})}
                    className="border p-2 rounded"
                    />
                    <button type="submit" className="md:col-span-4 bg-green-600 text-white py-2 rounded hover:bg-green-700">Salvar Item</button>
                </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-sm uppercase font-semibold">
                    <tr>
                    <th className="p-4">Item</th>
                    <th className="p-4">Preço Unit.</th>
                    <th className="p-4 text-center">Quantidade</th>
                    <th className="p-4 text-center">Status</th>
                    {!isMechanic && <th className="p-4 text-right">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {parts.map(part => (
                    <tr key={part.id} className="hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-800">{part.name}</td>
                        <td className="p-4 text-slate-600">R$ {part.price.toFixed(2)}</td>
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
                                title="Registrar Saída"
                            >
                                -
                            </button>
                            <button 
                                onClick={() => updateStock(part.id, 1)}
                                className="w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                                title="Registrar Entrada"
                            >
                                +
                            </button>
                            </td>
                        )}
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </>
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