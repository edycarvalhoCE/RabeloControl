import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Bus } from '../types';

const BookingsView: React.FC = () => {
  const { bookings, buses, users, addBooking, updateBookingStatus, transactions } = useStore();
  const [formData, setFormData] = useState({
    busId: '',
    driverId: '',
    clientName: '',
    destination: '',
    startTime: '',
    endTime: '',
    value: 0,
    paymentStatus: 'PENDING' as 'PAID' | 'PENDING' | 'SCHEDULED',
    paymentDate: '',
    departureLocation: '',
    presentationTime: ''
  });
  
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Conflict Popup State
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState('');

  // Bus Details Modal State
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const drivers = users.filter(u => u.role === UserRole.DRIVER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.busId || !formData.startTime || !formData.endTime || !formData.departureLocation || !formData.presentationTime) {
        setMsg({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
        return;
    }

    if (formData.paymentStatus !== 'PENDING' && !formData.paymentDate) {
        setMsg({ type: 'error', text: 'Informe a data do pagamento.' });
        return;
    }

    const result = await addBooking({
      ...formData,
      driverId: formData.driverId || null,
      paymentDate: formData.paymentDate || null
    });

    if (result.success) {
      setMsg({ type: 'success', text: result.message });
      setFormData({ 
        busId: '', driverId: '', clientName: '', destination: '', startTime: '', endTime: '', value: 0,
        paymentStatus: 'PENDING', paymentDate: '',
        departureLocation: '', presentationTime: ''
      });
      setTimeout(() => setMsg(null), 3000);
    } else {
      if (result.message.includes('Conflito')) {
        // Show Popup for conflict
        setConflictDetails(result.message);
        setShowConflictModal(true);
      } else {
        setMsg({ type: 'error', text: result.message });
        setTimeout(() => setMsg(null), 3000);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'value' ? parseFloat(value) : value
    }));
  };

  // Helper to find related maintenance
  const getBusMaintenanceHistory = (plate: string) => {
      if (!plate) return [];
      // Simple heuristic: check if transaction description contains the plate
      return transactions.filter(t => 
          t.type === 'EXPENSE' && 
          t.description.toLowerCase().includes(plate.toLowerCase())
      );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in relative">
      
      {/* CONFLICT POPUP MODAL */}
      {showConflictModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
                  <div className="bg-red-600 p-4 flex items-center gap-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      <h3 className="text-xl font-bold text-white">Veículo Indisponível!</h3>
                  </div>
                  <div className="p-6">
                      <p className="text-slate-700 font-medium text-lg mb-2">Atenção, Gerente:</p>
                      <p className="text-slate-600 mb-6 border-l-4 border-red-200 pl-4 py-2 bg-red-50 rounded-r">
                        {conflictDetails}
                      </p>
                      <p className="text-sm text-slate-500 mb-6">
                        Já existe uma locação confirmada para este ônibus no mesmo dia e horário. Por favor, selecione outro veículo ou altere o horário.
                      </p>
                      <button 
                        onClick={() => setShowConflictModal(false)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
                      >
                        Entendido, vou corrigir
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* BUS DETAILS MODAL */}
      {selectedBus && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedBus(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            🚌 {selectedBus.model}
                        </h2>
                        <span className="text-blue-200 font-mono text-lg">{selectedBus.plate}</span>
                    </div>
                    <button onClick={() => setSelectedBus(null)} className="text-slate-400 hover:text-white">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-xs font-bold text-slate-500 uppercase">Capacidade</span>
                            <p className="text-xl font-bold text-slate-800">{selectedBus.capacity} Passageiros</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-xs font-bold text-slate-500 uppercase">Status Atual</span>
                            <p className={`text-xl font-bold ${selectedBus.status === 'AVAILABLE' ? 'text-green-600' : selectedBus.status === 'MAINTENANCE' ? 'text-red-600' : 'text-blue-600'}`}>
                                {selectedBus.status === 'AVAILABLE' ? 'Disponível' : selectedBus.status === 'MAINTENANCE' ? 'Em Manutenção' : 'Em Viagem'}
                            </p>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Histórico de Manutenção (Despesas)</h3>
                    <div className="space-y-2 mb-6">
                        {getBusMaintenanceHistory(selectedBus.plate).length > 0 ? (
                            getBusMaintenanceHistory(selectedBus.plate).map(t => (
                                <div key={t.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                                    <div>
                                        <p className="font-semibold text-slate-800">{t.description}</p>
                                        <p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                                    </div>
                                    <span className="font-bold text-red-600">- R$ {t.amount.toLocaleString('pt-BR')}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 italic text-sm">Nenhum registro de manutenção encontrado para esta placa.</p>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Próximas Viagens</h3>
                    <div className="space-y-2">
                        {bookings.filter(b => b.busId === selectedBus.id && b.status === 'CONFIRMED' && new Date(b.startTime) > new Date()).length > 0 ? (
                            bookings.filter(b => b.busId === selectedBus.id && b.status === 'CONFIRMED' && new Date(b.startTime) > new Date())
                                .sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                .map(b => (
                                    <div key={b.id} className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <div>
                                            <p className="font-semibold text-slate-800">{b.destination}</p>
                                            <p className="text-xs text-slate-500">{new Date(b.startTime).toLocaleDateString()} • {b.clientName}</p>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <p className="text-slate-500 italic text-sm">Nenhuma viagem futura agendada.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* List of Bookings */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">Escala de Locações</h2>
        <div className="grid gap-4">
          {bookings.map(booking => {
            const bus = buses.find(b => b.id === booking.busId);
            const driver = users.find(u => u.id === booking.driverId);
            
            return (
              <div key={booking.id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {booking.status}
                    </span>
                    <h3 className="font-semibold text-lg text-slate-900">{booking.destination}</h3>
                  </div>
                  <p className="text-slate-600 text-sm">Cliente: <span className="font-medium text-slate-800">{booking.clientName}</span></p>
                  
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {new Date(booking.startTime).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {new Date(booking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(booking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                  
                  {/* Logistics Info */}
                  <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex gap-2 items-start">
                             <span className="text-blue-500">📍</span>
                             <div>
                                 <span className="font-bold text-blue-900 block text-xs uppercase">Local de Saída</span>
                                 <span className="text-blue-800">{booking.departureLocation || 'Não informado'}</span>
                             </div>
                        </div>
                        <div className="flex gap-2 items-start">
                             <span className="text-blue-500">🕒</span>
                             <div>
                                 <span className="font-bold text-blue-900 block text-xs uppercase">Apresentação (Garagem)</span>
                                 <span className="text-blue-800">
                                     {booking.presentationTime ? new Date(booking.presentationTime).toLocaleString([], {weekday:'short', hour:'2-digit', minute:'2-digit'}) : 'Não informado'}
                                 </span>
                             </div>
                        </div>
                      </div>
                  </div>

                  <div className="mt-3 text-sm grid grid-cols-2 gap-2">
                    <div>
                        <span className="font-medium text-slate-700 block">Veículo</span> 
                        {bus ? (
                            <button 
                                onClick={() => setSelectedBus(bus)}
                                className="text-blue-600 hover:text-blue-800 font-semibold hover:underline text-left"
                                title="Ver detalhes do veículo"
                            >
                                {bus.model} ({bus.plate})
                            </button>
                        ) : (
                            <span className="text-slate-600">Não atribuído</span>
                        )}
                    </div>
                    <div>
                        <span className="font-medium text-slate-700 block">Motorista</span> 
                        <span className="text-slate-600">{driver ? driver.name : <span className="text-red-500">Não atribuído</span>}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 min-w-[150px]">
                  <p className="text-lg font-bold text-blue-600">R$ {booking.value.toLocaleString('pt-BR')}</p>
                  
                  <div className="mt-2 text-xs">
                     {booking.paymentStatus === 'PAID' && (
                         <span className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200 w-full text-center">
                             Pago em {new Date(booking.paymentDate!).toLocaleDateString()}
                         </span>
                     )}
                     {booking.paymentStatus === 'SCHEDULED' && (
                         <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 w-full text-center">
                             Vence em {new Date(booking.paymentDate!).toLocaleDateString()}
                         </span>
                     )}
                     {booking.paymentStatus === 'PENDING' && (
                         <span className="inline-block px-2 py-1 bg-yellow-50 text-yellow-700 rounded border border-yellow-200 w-full text-center">
                             Pagamento Pendente
                         </span>
                     )}
                  </div>

                  {booking.status === 'CONFIRMED' && (
                    <button 
                        onClick={() => updateBookingStatus(booking.id, 'CANCELLED')}
                        className="text-xs text-red-500 hover:text-red-700 mt-3 underline block w-full text-right"
                    >
                        Cancelar Viagem
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {bookings.length === 0 && <p className="text-slate-500 text-center py-10">Nenhuma locação agendada.</p>}
        </div>
      </div>

      {/* New Booking Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit sticky top-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Nova Locação</h3>
        {msg && (
            <div className={`p-3 rounded-lg text-sm mb-4 ${msg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {msg.text}
            </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <input 
              type="text" name="clientName" value={formData.clientName} onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Nome da empresa ou pessoa"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Destino</label>
            <input 
              type="text" name="destination" value={formData.destination} onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Início da Viagem</label>
                <input 
                type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fim da Viagem</label>
                <input 
                type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                />
            </div>
          </div>
          
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Logística</p>
              <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Local de Saída</label>
                    <input 
                      type="text" name="departureLocation" value={formData.departureLocation} onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Ex: Rodoviária, Praça da Matriz..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Apresentação na Garagem</label>
                    <input 
                      type="datetime-local" name="presentationTime" value={formData.presentationTime} onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">Horário que o motorista deve chegar.</p>
                  </div>
              </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ônibus</label>
            <select 
              name="busId" value={formData.busId} onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            >
              <option value="">Selecione um veículo</option>
              {buses.map(bus => (
                <option key={bus.id} value={bus.id} disabled={bus.status === 'MAINTENANCE'}>
                  {bus.plate} - {bus.model} {bus.status === 'MAINTENANCE' ? '(Manutenção)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motorista (Opcional)</label>
            <select 
              name="driverId" value={formData.driverId} onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Selecione um motorista</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
          </div>
          
          <div className="border-t border-slate-200 pt-4 mt-2">
              <label className="block text-sm font-bold text-slate-800 mb-2">Informações de Pagamento</label>
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor do Contrato (R$)</label>
                <input 
                  type="number" name="value" value={formData.value} onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status do Pagamento</label>
                  <select
                    name="paymentStatus" 
                    value={formData.paymentStatus} 
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                  >
                      <option value="PENDING">Pendente (Não lançado no caixa)</option>
                      <option value="PAID">Já Pago (Entra no caixa hoje/data informada)</option>
                      <option value="SCHEDULED">Para Frente (Agendar recebimento)</option>
                  </select>
              </div>

              {formData.paymentStatus !== 'PENDING' && (
                  <div className="mb-3 animate-fade-in">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                          {formData.paymentStatus === 'PAID' ? 'Data do Pagamento' : 'Data do Vencimento'}
                      </label>
                      <input 
                        type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                  </div>
              )}
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors shadow-md"
          >
            Agendar Locação
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingsView;