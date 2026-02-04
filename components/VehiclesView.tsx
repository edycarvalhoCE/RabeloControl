
import React, { useState } from 'react';
import { useStore } from '../services/store';

const VehiclesView: React.FC = () => {
  const { buses, addBus, updateBusStatus, deleteBus } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBus, setNewBus] = useState({ 
    plate: '', 
    model: '', 
    capacity: 40, 
    features: [] as string[]
  });

  const availableFeatures = ['Ar Condicionado', 'WiFi', 'Banheiro', 'TV', 'Frigobar', 'Tomadas USB', 'Leito', 'Semi-Leito'];

  const handleFeatureToggle = (feature: string) => {
    if (newBus.features.includes(feature)) {
      setNewBus({...newBus, features: newBus.features.filter(f => f !== feature)});
    } else {
      setNewBus({...newBus, features: [...newBus.features, feature]});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(newBus.plate && newBus.model) {
        addBus(newBus);
        setShowAddForm(false);
        setNewBus({ plate: '', model: '', capacity: 40, features: [] });
    }
  };

  const handleStatusToggle = (busId: string, currentStatus: string) => {
    // Permitir forçar manutenção mesmo se estiver em viagem (BUSY)
    if (currentStatus === 'BUSY') {
        if (!window.confirm("⚠️ ATENÇÃO: Este veículo está marcado como EM VIAGEM.\n\nDeseja forçar a mudança para MANUTENÇÃO?")) {
            return;
        }
    }

    const newStatus = currentStatus === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    updateBusStatus(busId, newStatus);
  };

  const handleDelete = async (id: string, plate: string) => {
      // Confirmação de segurança para evitar exclusão acidental
      const confirmMessage = `Tem certeza que deseja excluir o ônibus placa ${plate}?\n\nEsta ação irá remover o veículo do sistema permanentemente.`;
      if (window.confirm(confirmMessage)) {
          await deleteBus(id);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Frota de Veículos</h2>
            <p className="text-sm text-slate-500">Gerencie os ônibus, características e status de manutenção.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <span>{showAddForm ? '✕ Cancelar' : '＋ Novo Veículo'}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-3xl animate-fade-in">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Cadastrar Novo Ônibus</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Placa</label>
                        <input 
                            required value={newBus.plate}
                            onChange={e => setNewBus({...newBus, plate: e.target.value.toUpperCase()})}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                            placeholder="ABC-1234"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                        <input 
                            required value={newBus.model}
                            onChange={e => setNewBus({...newBus, model: e.target.value})}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: Scania K360"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Capacidade (Lugares)</label>
                        <input 
                            required type="number" min="10" max="100"
                            value={newBus.capacity}
                            onChange={e => setNewBus({...newBus, capacity: parseInt(e.target.value)})}
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Opcionais e Configurações</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {availableFeatures.map(feature => (
                            <label key={feature} className="flex items-center space-x-2 bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
                                <input 
                                    type="checkbox"
                                    checked={newBus.features.includes(feature)}
                                    onChange={() => handleFeatureToggle(feature)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-700">{feature}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-md">
                    Salvar Veículo
                </button>
            </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buses.map(bus => (
              <div key={bus.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative group transition-all hover:shadow-md">
                  {/* Status Indicator Bar */}
                  <div className={`h-2 w-full ${bus.status === 'AVAILABLE' ? 'bg-green-500' : bus.status === 'MAINTENANCE' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                  
                  {/* Delete Button (Top Right) */}
                  <button 
                    onClick={() => handleDelete(bus.id, bus.plate)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                    title="Excluir Veículo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>

                  <div className="p-5 flex-1">
                      <div className="flex flex-col mb-4">
                          <h3 className="text-2xl font-bold text-slate-800">{bus.plate}</h3>
                          <p className="text-sm text-slate-500 font-medium">{bus.model}</p>
                      </div>
                      
                      <div className="mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              bus.status === 'AVAILABLE' ? 'bg-green-50 text-green-700 border-green-100' : 
                              bus.status === 'MAINTENANCE' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                              {bus.status === 'AVAILABLE' ? '🟢 Disponível' : bus.status === 'MAINTENANCE' ? '🔴 Em Manutenção' : '🔵 Em Viagem'}
                          </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-semibold border border-slate-200">
                            💺 {bus.capacity} Lugares
                          </span>
                          {bus.features && bus.features.map((feat, idx) => (
                              <span key={idx} className="bg-slate-50 text-slate-600 text-xs px-2 py-1 rounded border border-slate-100">
                                  {feat}
                              </span>
                          ))}
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 p-3 border-t border-slate-100">
                      <button 
                        onClick={() => handleStatusToggle(bus.id, bus.status)}
                        className={`w-full text-sm font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm flex justify-center items-center gap-2 ${
                            bus.status === 'MAINTENANCE' 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                        title={bus.status === 'BUSY' ? 'Forçar Manutenção' : ''}
                      >
                          {bus.status === 'MAINTENANCE' ? (
                              <><span>✅</span> LIBERAR VEÍCULO</>
                          ) : (
                              <><span>🛠️</span> ENVIAR P/ MANUTENÇÃO</>
                          )}
                      </button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default VehiclesView;
