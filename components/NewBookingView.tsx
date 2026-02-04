
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { UserRole, Client } from '../types';

const NewBookingView: React.FC = () => {
  const { buses, users, addBooking, clients } = useStore();
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    busId: '',
    driverId: '',
    freelanceDriverName: '',
    isFreelance: false,
    driver2Id: '',
    freelanceDriver2Name: '',
    isFreelance2: false,
    clientName: '',
    clientPhone: '',
    destination: '',
    startTime: '',
    endTime: '',
    value: 0,
    paymentStatus: 'PENDING' as 'PAID' | 'PENDING' | 'SCHEDULED',
    paymentDate: '',
    departureLocation: '',
    presentationTime: '',
    observations: ''
  });

  // Client Search State
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // Driver Fee States
  const [driverDailyValue, setDriverDailyValue] = useState(0);
  const [driver2DailyValue, setDriver2DailyValue] = useState(0);
  const [calculatedDays, setCalculatedDays] = useState(0);

  const drivers = users.filter(u => u.role === UserRole.DRIVER);

  // Auto-fill Driver 1 Daily Rate
  useEffect(() => {
      if (!formData.isFreelance && formData.driverId) {
          const selectedDriver = drivers.find(d => d.id === formData.driverId);
          if (selectedDriver && selectedDriver.dailyRate) {
              setDriverDailyValue(selectedDriver.dailyRate);
          } else {
              setDriverDailyValue(0);
          }
      }
  }, [formData.driverId, formData.isFreelance, drivers]);

  // Auto-fill Driver 2 Daily Rate
  useEffect(() => {
      if (!formData.isFreelance2 && formData.driver2Id) {
          const selectedDriver = drivers.find(d => d.id === formData.driver2Id);
          if (selectedDriver && selectedDriver.dailyRate) {
              setDriver2DailyValue(selectedDriver.dailyRate);
          } else {
              setDriver2DailyValue(0);
          }
      }
  }, [formData.driver2Id, formData.isFreelance2, drivers]);

  // Effect to calculate days
  useEffect(() => {
      if (formData.startTime && formData.endTime) {
          const start = new Date(formData.startTime);
          const end = new Date(formData.endTime);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const startDay = new Date(start); startDay.setHours(0,0,0,0);
              const endDay = new Date(end); endDay.setHours(0,0,0,0);
              const diffTime = Math.abs(endDay.getTime() - startDay.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
              setCalculatedDays(diffDays + 1);
          }
      } else {
          setCalculatedDays(0);
      }
  }, [formData.startTime, formData.endTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'paymentStatus' && value === 'PENDING') {
         setFormData(prev => ({ ...prev, [name]: value, paymentDate: '' }));
    } else if (name === 'isFreelance') {
         const isChecked = (e.target as HTMLInputElement).checked;
         setFormData(prev => ({ ...prev, isFreelance: isChecked, driverId: '', freelanceDriverName: '' }));
         if (isChecked) setDriverDailyValue(0);
    } else if (name === 'isFreelance2') {
         const isChecked = (e.target as HTMLInputElement).checked;
         setFormData(prev => ({ ...prev, isFreelance2: isChecked, driver2Id: '', freelanceDriver2Name: '' }));
         if (isChecked) setDriver2DailyValue(0);
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData(prev => ({ ...prev, value: Number(value) / 100 }));
  };

  const handleDriverFeeChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: number) => void) => {
    const value = e.target.value.replace(/\D/g, "");
    setter(Number(value) / 100);
  };

  const filteredClients = clientSearchTerm 
    ? clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || c.cpf.includes(clientSearchTerm))
    : [];

  const handleSelectClient = (client: Client) => {
      setFormData(prev => ({ ...prev, clientName: client.name, clientPhone: client.phone || '' }));
      setClientSearchTerm('');
      setShowClientSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.busId || !formData.startTime || !formData.endTime || !formData.destination) {
        setMsg({ type: 'error', text: 'Preencha os campos obrigatórios.' });
        window.scrollTo(0,0);
        return;
    }

    const payload = {
        busId: formData.busId,
        driverId: formData.isFreelance ? null : formData.driverId,
        freelanceDriverName: formData.isFreelance ? formData.freelanceDriverName : null,
        driver2Id: formData.driver2Id ? (formData.isFreelance2 ? null : formData.driver2Id) : null,
        freelanceDriver2Name: formData.isFreelance2 ? formData.freelanceDriver2Name : null,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        destination: formData.destination,
        startTime: formData.startTime,
        endTime: formData.endTime,
        value: formData.value,
        paymentStatus: formData.paymentStatus,
        paymentDate: formData.paymentDate || null,
        departureLocation: formData.departureLocation || 'Garagem',
        presentationTime: formData.presentationTime || formData.startTime,
        observations: formData.observations
    };

    const result = await addBooking(payload, driverDailyValue * calculatedDays, driver2DailyValue * calculatedDays);

    if (result.success) {
      setMsg({ type: 'success', text: result.message });
      setFormData({
        busId: '', driverId: '', freelanceDriverName: '', isFreelance: false,
        driver2Id: '', freelanceDriver2Name: '', isFreelance2: false,
        clientName: '', clientPhone: '', destination: '', startTime: '', endTime: '', value: 0,
        paymentStatus: 'PENDING', paymentDate: '',
        departureLocation: '', presentationTime: '', observations: ''
      });
      setDriverDailyValue(0);
      setDriver2DailyValue(0);
      window.scrollTo(0,0);
      setTimeout(() => setMsg(null), 3000);
    } else {
      setMsg({ type: 'error', text: result.message });
      window.scrollTo(0,0);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="bg-blue-600 text-white p-2 rounded-lg text-lg">➕</span>
            Nova Locação
        </h2>
        
        {msg && <div className={`p-4 rounded mb-6 text-sm font-medium ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{msg.text}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 border-b pb-2">Dados do Cliente</h3>
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente *</label>
                        <div className="flex gap-2">
                            <input name="clientName" value={formData.clientName} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
                            <button type="button" onClick={() => setShowClientSuggestions(!showClientSuggestions)} className="bg-blue-100 text-blue-600 p-2 rounded hover:bg-blue-200">🔍</button>
                        </div>
                        {showClientSuggestions && (
                            <div className="absolute z-10 w-full bg-white border border-slate-300 rounded shadow-lg mt-1 p-2">
                                <input autoFocus placeholder="Digite para buscar..." className="w-full border p-1 rounded text-sm mb-2" value={clientSearchTerm} onChange={e => setClientSearchTerm(e.target.value)} />
                                <div className="max-h-40 overflow-y-auto">
                                    {filteredClients.map(c => (
                                        <div key={c.id} onClick={() => handleSelectClient(c)} className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0">
                                            <strong>{c.name}</strong> <span className="text-xs text-slate-500">({c.phone})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                        <input name="clientPhone" value={formData.clientPhone} onChange={handleChange} className="w-full border p-2 rounded" />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 border-b pb-2">Destino e Rota</h3>
                    <input name="destination" value={formData.destination} onChange={handleChange} placeholder="Destino *" className="w-full border p-2 rounded" required />
                    <input name="departureLocation" value={formData.departureLocation} onChange={handleChange} placeholder="Local de Saída *" className="w-full border p-2 rounded" required />
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4">Datas e Horários</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full border p-2 rounded" required />
                    <input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full border p-2 rounded" required />
                    <input type="datetime-local" name="presentationTime" value={formData.presentationTime} onChange={handleChange} className="w-full border p-2 rounded" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Veículo *</label>
                    <select name="busId" value={formData.busId} onChange={handleChange} className="w-full border p-2 rounded bg-white" required>
                        <option value="">Selecione o Ônibus</option>
                        {buses.map(b => (
                            <option key={b.id} value={b.id} disabled={b.status === 'MAINTENANCE'}>{b.plate} - {b.model}</option>
                        ))}
                    </select>
                </div>
                
                {/* DOIS MOTORISTAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* MOTORISTA 1 */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-bold text-slate-700">1º Motorista *</label>
                            <label className="flex items-center space-x-1 text-xs cursor-pointer">
                                <input type="checkbox" name="isFreelance" checked={formData.isFreelance} onChange={handleChange} className="rounded" />
                                <span>Freelance?</span>
                            </label>
                        </div>
                        {formData.isFreelance ? (
                            <input name="freelanceDriverName" value={formData.freelanceDriverName} onChange={handleChange} placeholder="Nome do Freelance" className="w-full border p-2 rounded text-sm" required />
                        ) : (
                            <select name="driverId" value={formData.driverId} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-white" required>
                                <option value="">Selecione...</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 border rounded bg-white overflow-hidden flex items-center">
                                <span className="bg-slate-100 text-[10px] px-2 font-bold py-2 border-r">R$</span>
                                <input type="text" inputMode="numeric" value={driverDailyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={(e) => handleDriverFeeChange(e, setDriverDailyValue)} className="w-full p-1.5 text-right font-bold text-sm outline-none" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Diária</span>
                        </div>
                    </div>

                    {/* MOTORISTA 2 */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-bold text-slate-700">2º Motorista (Opcional)</label>
                            <label className="flex items-center space-x-1 text-xs cursor-pointer">
                                <input type="checkbox" name="isFreelance2" checked={formData.isFreelance2} onChange={handleChange} className="rounded" />
                                <span>Freelance?</span>
                            </label>
                        </div>
                        {formData.isFreelance2 ? (
                            <input name="freelanceDriver2Name" value={formData.freelanceDriver2Name} onChange={handleChange} placeholder="Nome do Freelance" className="w-full border p-2 rounded text-sm" />
                        ) : (
                            <select name="driver2Id" value={formData.driver2Id} onChange={handleChange} className="w-full border p-2 rounded text-sm bg-white">
                                <option value="">Nenhum</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 border rounded bg-white overflow-hidden flex items-center">
                                <span className="bg-slate-100 text-[10px] px-2 font-bold py-2 border-r">R$</span>
                                <input type="text" inputMode="numeric" value={driver2DailyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={(e) => handleDriverFeeChange(e, setDriver2DailyValue)} className="w-full p-1.5 text-right font-bold text-sm outline-none" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Diária</span>
                        </div>
                    </div>
                </div>
                
                {calculatedDays > 0 && (
                    <p className="text-xs text-right font-bold text-blue-600">Periodo: {calculatedDays} {calculatedDays === 1 ? 'dia' : 'dias'}</p>
                )}
            </div>

            <div className="border-t pt-4">
                <h3 className="font-bold text-slate-700 mb-3">Financeiro</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center border border-slate-300 rounded overflow-hidden">
                        <span className="bg-slate-100 px-3 py-2 font-bold">R$</span>
                        <input name="value" value={formData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={handleCurrencyChange} className="w-full p-2 outline-none text-right font-bold" />
                    </div>
                    <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className="border p-2 rounded">
                        <option value="PENDING">Pendente</option><option value="PAID">Pago</option><option value="SCHEDULED">Agendado</option>
                    </select>
                    {formData.paymentStatus !== 'PENDING' && <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className="border p-2 rounded" />}
                </div>
            </div>

            <button type="submit" className="w-full py-4 rounded-lg text-white font-bold bg-slate-800 hover:bg-slate-700 shadow-lg">Confirmar Agendamento</button>
        </form>
      </div>
    </div>
  );
};

export default NewBookingView;
