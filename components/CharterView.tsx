
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, CharterContract } from '../types';

const CharterView: React.FC = () => {
  const { buses, users, addCharterContract, updateCharterContract, deleteCharterContract, charterContracts } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<CharterContract | null>(null);
  
  const [contract, setContract] = useState({
      clientName: 'Carbografite',
      route: '',
      busId: '',
      driverId: '',
      freelanceDriverName: '',
      isFreelance: false,
      weekDays: [] as number[],
      morningDeparture: '05:30',
      afternoonDeparture: '16:30',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  });

  const drivers = users.filter(u => u.role === UserRole.DRIVER);
  
  const weekDaysOptions = [
      { id: 1, label: 'Seg' },
      { id: 2, label: 'Ter' },
      { id: 3, label: 'Qua' },
      { id: 4, label: 'Qui' },
      { id: 5, label: 'Sex' },
      { id: 6, label: 'Sáb' },
      { id: 0, label: 'Dom' },
  ];

  const handleDayToggle = (dayId: number) => {
      if (contract.weekDays.includes(dayId)) {
          setContract({...contract, weekDays: contract.weekDays.filter(d => d !== dayId)});
      } else {
          setContract({...contract, weekDays: [...contract.weekDays, dayId]});
      }
  };

  const handleEdit = (c: CharterContract) => {
      setEditingContract(c);
      setContract({
          clientName: c.clientName,
          route: c.route,
          busId: c.busId,
          driverId: c.driverId || '',
          freelanceDriverName: c.freelanceDriverName || '',
          isFreelance: !c.driverId && !!c.freelanceDriverName,
          weekDays: c.weekDays,
          morningDeparture: c.morningDeparture,
          afternoonDeparture: c.afternoonDeparture,
          startDate: c.startDate,
          endDate: c.endDate
      });
      setShowForm(true);
  };

  const handleDelete = async (id: string) => {
      if (confirm("Tem certeza que deseja excluir este contrato? Isso irá remover as viagens futuras do calendário.")) {
          await deleteCharterContract(id);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!contract.busId || (!contract.driverId && !contract.freelanceDriverName) || contract.weekDays.length === 0) {
          alert('Preencha os campos obrigatórios e selecione o motorista e dias da semana.');
          return;
      }
      
      const payload = {
          clientName: contract.clientName,
          route: contract.route,
          busId: contract.busId,
          driverId: contract.isFreelance ? null : contract.driverId,
          freelanceDriverName: contract.isFreelance ? contract.freelanceDriverName : null,
          weekDays: contract.weekDays,
          morningDeparture: contract.morningDeparture,
          afternoonDeparture: contract.afternoonDeparture,
          startDate: contract.startDate,
          endDate: contract.endDate
      };

      if (editingContract) {
          await updateCharterContract(editingContract.id, payload);
          alert('Contrato atualizado! A escala foi ajustada automaticamente.');
      } else {
          await addCharterContract(payload);
          alert('Contrato salvo! A escala foi gerada automaticamente para o período selecionado.');
      }

      setEditingContract(null);
      setShowForm(false);
      // Reset form default state if needed, or keep last values for convenience
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Fretamento Contínuo</h2>
            <button 
                onClick={() => { setShowForm(!showForm); setEditingContract(null); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
            >
                {showForm ? 'Cancelar' : '+ Novo Contrato'}
            </button>
        </div>

        {showForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4 text-slate-700">{editingContract ? 'Editar Contrato' : 'Configurar Fretamento'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente / Empresa</label>
                            <input 
                                value={contract.clientName}
                                onChange={e => setContract({...contract, clientName: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Ex: Carbografite"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Linha / Rota</label>
                            <input 
                                value={contract.route}
                                onChange={e => setContract({...contract, route: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Ex: Administrativo - Centro"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Veículo Fixo</label>
                            <select 
                                value={contract.busId}
                                onChange={e => setContract({...contract, busId: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            >
                                <option value="">Selecione...</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-slate-700">Motorista Fixo</label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={contract.isFreelance} 
                                        onChange={e => setContract({...contract, isFreelance: e.target.checked})}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="font-bold text-indigo-700">Freelance?</span>
                                </label>
                            </div>
                            
                            {contract.isFreelance ? (
                                <input 
                                    value={contract.freelanceDriverName} 
                                    onChange={e => setContract({...contract, freelanceDriverName: e.target.value})} 
                                    placeholder="Digite o nome do Freelance" 
                                    className="w-full border p-2 rounded border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    required 
                                />
                            ) : (
                                <select 
                                    value={contract.driverId}
                                    onChange={e => setContract({...contract, driverId: e.target.value})}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    required={!contract.isFreelance}
                                >
                                    <option value="">Selecione...</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Dias da Semana</label>
                        <div className="flex flex-wrap gap-2">
                            {weekDaysOptions.map(day => (
                                <button
                                    key={day.id}
                                    type="button"
                                    onClick={() => handleDayToggle(day.id)}
                                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                        contract.weekDays.includes(day.id) 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Horário Saída (Manhã)</label>
                            <input 
                                type="time"
                                value={contract.morningDeparture}
                                onChange={e => setContract({...contract, morningDeparture: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Horário Saída (Tarde)</label>
                            <input 
                                type="time"
                                value={contract.afternoonDeparture}
                                onChange={e => setContract({...contract, afternoonDeparture: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Início Contrato</label>
                            <input 
                                type="date"
                                value={contract.startDate}
                                onChange={e => setContract({...contract, startDate: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim (Para gerar escala)</label>
                            <input 
                                type="date"
                                value={contract.endDate}
                                onChange={e => setContract({...contract, endDate: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="text-sm text-slate-500 bg-yellow-50 p-2 rounded border border-yellow-100">
                        Nota: Ao salvar, o sistema irá atualizar automaticamente a agenda para o período selecionado.
                    </div>

                    <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700">
                        {editingContract ? 'Atualizar Contrato' : 'Gerar Escala de Fretamento'}
                    </button>
                </form>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {charterContracts.map(c => {
                 const bus = buses.find(b => b.id === c.busId);
                 const driver = users.find(u => u.id === c.driverId);
                 const driverDisplay = c.driverId ? driver?.name : c.freelanceDriverName ? `${c.freelanceDriverName} (Freelance)` : 'Não atribuído';

                 return (
                     <div key={c.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative flex flex-col group">
                         <div className="h-1 bg-indigo-500 w-full top-0 absolute"></div>
                         
                         {/* Action Buttons (Visible on Hover/Mobile) */}
                         <div className="absolute top-3 right-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg shadow-sm">
                             <button 
                                onClick={() => handleEdit(c)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Editar"
                             >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                             </button>
                             <button 
                                onClick={() => handleDelete(c.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Excluir"
                             >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                         </div>

                         <div className="p-5 flex-1">
                             <h3 className="text-lg font-bold text-slate-800 pr-12">{c.clientName}</h3>
                             <p className="text-sm text-indigo-600 font-medium mb-3">{c.route}</p>
                             
                             <div className="space-y-2 text-sm text-slate-600">
                                 <p>🚌 <span className="font-semibold">{bus?.plate}</span></p>
                                 <p>👤 <span className="font-semibold">{driverDisplay}</span></p>
                                 <p>🕒 {c.morningDeparture} / {c.afternoonDeparture}</p>
                             </div>

                             <div className="mt-4 flex flex-wrap gap-1">
                                 {c.weekDays.sort().map(d => (
                                     <span key={d} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                                         {weekDaysOptions.find(w => w.id === d)?.label}
                                     </span>
                                 ))}
                             </div>
                             
                             <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                                 <span>De: {new Date(c.startDate).toLocaleDateString()}</span>
                                 <span>Até: {new Date(c.endDate).toLocaleDateString()}</span>
                             </div>
                         </div>
                     </div>
                 )
            })}
             {charterContracts.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                    Nenhum contrato de fretamento ativo.
                </div>
            )}
        </div>
    </div>
  );
};

export default CharterView;
