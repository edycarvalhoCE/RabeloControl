import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

const NewBookingView: React.FC = () => {
  const { buses, users, addBooking } = useStore();
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    busId: '',
    driverId: '',
    freelanceDriverName: '',
    isFreelance: false,
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

  const drivers = users.filter(u => u.role === UserRole.DRIVER);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'paymentStatus' && value === 'PENDING') {
         setFormData(prev => ({ ...prev, [name]: value, paymentDate: '' }));
    } else if (name === 'isFreelance') {
         // Handle checkbox for freelance
         const isChecked = (e.target as HTMLInputElement).checked;
         setFormData(prev => ({ ...prev, isFreelance: isChecked, driverId: '', freelanceDriverName: '' }));
    } else {
        setFormData(prev => ({ ...prev, [name]: name === 'value' ? parseFloat(value) : value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.busId || !formData.startTime || !formData.endTime || !formData.destination) {
        setMsg({ type: 'error', text: 'Preencha os campos obrigatórios.' });
        window.scrollTo(0,0);
        return;
    }

    if (!formData.isFreelance && !formData.driverId) {
        setMsg({ type: 'error', text: 'Selecione um motorista ou marque a opção Freelance.' });
        window.scrollTo(0,0);
        return;
    }
    
    if (formData.isFreelance && !formData.freelanceDriverName) {
        setMsg({ type: 'error', text: 'Digite o nome do motorista Freelance.' });
        window.scrollTo(0,0);
        return;
    }

    const payload = {
        busId: formData.busId,
        driverId: formData.isFreelance ? null : formData.driverId,
        freelanceDriverName: formData.isFreelance ? formData.freelanceDriverName : undefined,
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

    const result = await addBooking(payload);

    if (result.success) {
      setMsg({ type: 'success', text: result.message });
      // Reset Form
      setFormData({
        busId: '', driverId: '', freelanceDriverName: '', isFreelance: false,
        clientName: '', clientPhone: '', destination: '', startTime: '', endTime: '', value: 0,
        paymentStatus: 'PENDING', paymentDate: '',
        departureLocation: '', presentationTime: '', observations: ''
      });
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
            
            {/* Section 1: Client & Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 border-b pb-2">Dados do Cliente</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente *</label>
                        <input name="clientName" value={formData.clientName} onChange={handleChange} placeholder="Ex: Igreja Batista" className="w-full border p-2 rounded" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / Contato</label>
                        <input name="clientPhone" value={formData.clientPhone} onChange={handleChange} placeholder="(00) 00000-0000" className="w-full border p-2 rounded" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 border-b pb-2">Destino e Rota</h3>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Destino da Viagem *</label>
                        <input name="destination" value={formData.destination} onChange={handleChange} placeholder="Ex: Aparecida do Norte - SP" className="w-full border p-2 rounded" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Local de Saída *</label>
                        <input name="departureLocation" value={formData.departureLocation} onChange={handleChange} placeholder="Ex: Praça Central" className="w-full border p-2 rounded" required />
                    </div>
                </div>
            </div>

            {/* Section 2: Dates */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4">Datas e Horários</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data/Hora Saída *</label>
                        <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full border p-2 rounded" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data/Hora Retorno *</label>
                        <input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full border p-2 rounded" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Apresentação na Garagem</label>
                        <input type="datetime-local" name="presentationTime" value={formData.presentationTime} onChange={handleChange} className="w-full border p-2 rounded" />
                        <p className="text-[10px] text-slate-500 mt-1">Caso diferente da saída</p>
                    </div>
                </div>
            </div>

            {/* Section 3: Bus & Driver */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Veículo *</label>
                    <select name="busId" value={formData.busId} onChange={handleChange} className="w-full border p-2 rounded bg-white" required>
                        <option value="">Selecione o Ônibus</option>
                        {buses.map(b => (
                            <option key={b.id} value={b.id} disabled={b.status === 'MAINTENANCE'}>{b.plate} - {b.model}</option>
                        ))}
                    </select>
                </div>
                
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-slate-700">Motorista *</label>
                        <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input 
                                type="checkbox" 
                                name="isFreelance" 
                                checked={formData.isFreelance} 
                                onChange={handleChange} 
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-blue-700">Motorista Freelance?</span>
                        </label>
                    </div>
                    
                    {formData.isFreelance ? (
                        <input 
                            name="freelanceDriverName" 
                            value={formData.freelanceDriverName} 
                            onChange={handleChange} 
                            placeholder="Digite o nome do Freelance" 
                            className="w-full border p-2 rounded border-blue-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                            required 
                        />
                    ) : (
                        <select name="driverId" value={formData.driverId} onChange={handleChange} className="w-full border p-2 rounded bg-white" required={!formData.isFreelance}>
                            <option value="">Selecione o Motorista da Frota</option>
                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* Section 4: Observations */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Observações (Impressas na OS)</label>
                <textarea 
                    name="observations" 
                    value={formData.observations} 
                    onChange={handleChange} 
                    placeholder="Instruções para o motorista, rota específica, etc..." 
                    className="w-full border p-2 rounded mt-1 h-24 resize-none text-sm" 
                />
            </div>

            {/* Section 5: Finance */}
            <div className="border-t pt-4">
                <h3 className="font-bold text-slate-700 mb-3">Financeiro</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
                        <input type="number" name="value" value={formData.value} onChange={handleChange} className="w-full border p-2 rounded" placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status Pagamento</label>
                        <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className="w-full border p-2 rounded">
                            <option value="PENDING">Pendente</option>
                            <option value="PAID">Pago</option>
                            <option value="SCHEDULED">Agendado</option>
                        </select>
                    </div>
                    {formData.paymentStatus !== 'PENDING' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Pagamento/Venc.</label>
                            <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className="w-full border p-2 rounded" required />
                        </div>
                    )}
                </div>
            </div>

            <button type="submit" className="w-full py-4 rounded-lg text-white font-bold text-lg bg-slate-800 hover:bg-slate-700 shadow-lg transition-transform transform active:scale-95">
                Confirmar Agendamento
            </button>
        </form>
      </div>
    </div>
  );
};

export default NewBookingView;