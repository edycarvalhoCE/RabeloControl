import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Bus, Booking } from '../types';

const BookingsView: React.FC = () => {
  const { bookings, buses, users, addBooking, updateBooking, updateBookingStatus } = useStore();
  
  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    busId: '',
    driverId: '',
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
    observations: '' // New Field
  });
  
  // --- FILTER STATE ---
  const [filters, setFilters] = useState({
      client: '',
      busId: '',
      date: '',
      status: ''
  });

  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState('');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const drivers = users.filter(u => u.role === UserRole.DRIVER);

  // --- SAFE HELPERS ---
  const safeDate = (dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
      if (!dateStr) return 'N/A';
      try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return 'Data Inválida';
          return date.toLocaleDateString('pt-BR', options);
      } catch (e) { return 'Erro Data'; }
  };

  const safeTime = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } catch (e) { return ''; }
  };

  // --- ACTIONS ---

  const handleEdit = (booking: Booking) => {
    const safeStart = booking.startTime && booking.startTime.length >= 16 ? booking.startTime.slice(0, 16) : '';
    const safeEnd = booking.endTime && booking.endTime.length >= 16 ? booking.endTime.slice(0, 16) : '';
    const safePresentation = booking.presentationTime && booking.presentationTime.length >= 16 ? booking.presentationTime.slice(0, 16) : '';
    const safePaymentDate = booking.paymentDate ? booking.paymentDate.split('T')[0] : '';

    setFormData({
      busId: booking.busId,
      driverId: booking.driverId || '',
      clientName: booking.clientName,
      clientPhone: booking.clientPhone || '',
      destination: booking.destination,
      startTime: safeStart,
      endTime: safeEnd,
      value: booking.value,
      paymentStatus: booking.paymentStatus,
      paymentDate: safePaymentDate,
      departureLocation: booking.departureLocation || '',
      presentationTime: safePresentation,
      observations: booking.observations || ''
    });
    setEditingBookingId(booking.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingBookingId(null);
    setFormData({ 
      busId: '', driverId: '', clientName: '', clientPhone: '', destination: '', startTime: '', endTime: '', value: 0,
      paymentStatus: 'PENDING', paymentDate: '',
      departureLocation: '', presentationTime: '', observations: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.busId || !formData.startTime || !formData.endTime) {
        setMsg({ type: 'error', text: 'Preencha os campos obrigatórios.' });
        return;
    }

    const payload = {
        ...formData,
        driverId: formData.driverId || null,
        paymentDate: formData.paymentDate || null,
        departureLocation: formData.departureLocation || 'Garagem',
        presentationTime: formData.presentationTime || formData.startTime
    };

    let result;
    if (editingBookingId) {
        result = await updateBooking(editingBookingId, payload);
    } else {
        result = await addBooking(payload);
    }

    if (result.success) {
      setMsg({ type: 'success', text: result.message });
      handleCancelEdit();
      setTimeout(() => setMsg(null), 3000);
    } else {
      if (result.message.includes('Conflito')) {
        setConflictDetails(result.message);
        setShowConflictModal(true);
      } else {
        setMsg({ type: 'error', text: result.message });
        setTimeout(() => setMsg(null), 3000);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'paymentStatus' && value === 'PENDING') {
         setFormData(prev => ({ ...prev, [name]: value, paymentDate: '' }));
    } else {
        setFormData(prev => ({ ...prev, [name]: name === 'value' ? parseFloat(value) : value }));
    }
  };

  const handlePrintOS = (booking: Booking) => {
      const bus = buses.find(b => b.id === booking.busId);
      const driver = users.find(u => u.id === booking.driverId);
      const sStart = safeDate(booking.startTime) + ' ' + safeTime(booking.startTime);
      const sEnd = safeDate(booking.endTime) + ' ' + safeTime(booking.endTime);
      const sPres = safeDate(booking.presentationTime) + ' ' + safeTime(booking.presentationTime);

      const printContent = `
        <html><head><title>OS - ${booking.destination}</title>
        <style>
            body{font-family:Arial,sans-serif;padding:20px;color:#000}
            .header{text-align:center;border-bottom:2px solid #000;margin-bottom:20px;padding-bottom:10px}
            .row{display:flex;margin-bottom:8px;border-bottom:1px dotted #ccc;padding-bottom:2px}
            .label{font-weight:bold;width:160px;display:inline-block}
            .value{flex:1;font-weight:normal}
            .box{border:2px solid #000;padding:10px;margin-top:20px}
            .obs-box{background:#f0f0f0;padding:10px;margin-top:20px;border:1px solid #ccc;min-height:60px}
            h3 {margin: 15px 0 5px 0; font-size: 16px; text-transform:uppercase; background:#eee; padding:5px;}
        </style>
        </head><body>
            <div class="header"><h1>RabeloTour - ORDEM DE SERVIÇO</h1></div>
            
            <h3>Dados da Viagem</h3>
            <div class="row"><span class="label">Destino:</span><span class="value">${booking.destination}</span></div>
            <div class="row"><span class="label">Saída:</span><span class="value">${sStart} - ${booking.departureLocation}</span></div>
            <div class="row"><span class="label">Apresentação:</span><span class="value">${sPres} (Garagem)</span></div>
            <div class="row"><span class="label">Previsão Retorno:</span><span class="value">${sEnd}</span></div>
            
            <h3>Cliente</h3>
            <div class="row"><span class="label">Nome:</span><span class="value">${booking.clientName}</span></div>
            <div class="row"><span class="label">Telefone:</span><span class="value">${booking.clientPhone || '-'}</span></div>
            
            <h3>Veículo e Motorista</h3>
            <div class="row"><span class="label">Veículo:</span><span class="value">${bus?.plate} - ${bus?.model}</span></div>
            <div class="row"><span class="label">Motorista:</span><span class="value">${driver?.name || '__________________'}</span></div>
            
            <h3>Observações / Instruções</h3>
            <div class="obs-box">
                ${booking.observations ? booking.observations.replace(/\n/g, '<br>') : 'Nenhuma observação registrada.'}
            </div>

            <div class="box">
                <strong>CONTROLE DE QUILOMETRAGEM</strong><br/><br/>
                <div style="display:flex; justify-content:space-between">
                    <span>KM Inicial: _______________</span>
                    <span>KM Final: _______________</span>
                    <span>Total Percorrido: _______________</span>
                </div>
                <br/><br/>
                Assinatura do Motorista: _____________________________________________
            </div>
            
            <script>window.print();</script>
        </body></html>`;
      const win = window.open('', '', 'width=800,height=600');
      if (win) { win.document.write(printContent); win.document.close(); }
  };

  // --- FILTER LOGIC ---
  const filteredBookings = bookings.filter(b => {
      const matchClient = filters.client ? b.clientName.toLowerCase().includes(filters.client.toLowerCase()) : true;
      const matchBus = filters.busId ? b.busId === filters.busId : true;
      const matchStatus = filters.status ? b.status === filters.status : true;
      
      let matchDate = true;
      if (filters.date) {
          // Compare simple string YYYY-MM-DD
          const bookingDate = b.startTime.split('T')[0];
          matchDate = bookingDate === filters.date;
      }

      return matchClient && matchBus && matchDate && matchStatus;
  }).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in relative">
      {/* CONFLICT MODAL */}
      {showConflictModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                  <h3 className="text-xl font-bold text-red-600 mb-2">Conflito de Horário!</h3>
                  <p className="text-slate-600 mb-4">{conflictDetails}</p>
                  <button onClick={() => setShowConflictModal(false)} className="w-full bg-slate-800 text-white py-2 rounded">Fechar</button>
              </div>
          </div>
      )}

      {/* BUS DETAILS MODAL */}
      {selectedBus && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedBus(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedBus.plate}</h2>
                <p className="text-slate-600 mb-4">{selectedBus.model} - {selectedBus.capacity} Lugares</p>
                <div className="bg-slate-50 p-3 rounded mb-4 max-h-40 overflow-y-auto">
                    <h4 className="font-bold text-xs uppercase mb-2">Próximas Viagens</h4>
                    {bookings.filter(b => b.busId === selectedBus.id && b.status === 'CONFIRMED').map(b => (
                        <div key={b.id} className="text-sm border-b py-1">{safeDate(b.startTime)} - {b.destination}</div>
                    ))}
                </div>
                <button onClick={() => setSelectedBus(null)} className="w-full bg-slate-200 text-slate-800 py-2 rounded">Fechar</button>
            </div>
        </div>
      )}

      {/* LIST SECTION (LEFT) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* FILTERS BAR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 uppercase mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filtrar Viagens
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input 
                    type="date" 
                    value={filters.date} 
                    onChange={e => setFilters({...filters, date: e.target.value})}
                    className="border p-2 rounded text-sm w-full"
                />
                <select 
                    value={filters.busId} 
                    onChange={e => setFilters({...filters, busId: e.target.value})}
                    className="border p-2 rounded text-sm w-full"
                >
                    <option value="">Todos Veículos</option>
                    {buses.map(b => <option key={b.id} value={b.id}>{b.plate}</option>)}
                </select>
                <input 
                    type="text" 
                    placeholder="Nome do Cliente"
                    value={filters.client} 
                    onChange={e => setFilters({...filters, client: e.target.value})}
                    className="border p-2 rounded text-sm w-full"
                />
                <button 
                    onClick={() => setFilters({client: '', busId: '', date: '', status: ''})}
                    className="text-xs text-blue-600 hover:underline text-center flex items-center justify-center"
                >
                    Limpar Filtros
                </button>
            </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800">
            Locações Encontradas ({filteredBookings.length})
        </h2>
        
        <div className="grid gap-4">
          {filteredBookings.map(booking => {
            const bus = buses.find(b => b.id === booking.busId);
            const driver = users.find(u => u.id === booking.driverId);
            const isEditing = editingBookingId === booking.id;
            
            return (
              <div key={booking.id} className={`bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start gap-4 ${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {booking.status}
                    </span>
                    <h3 className="font-semibold text-lg text-slate-900">{booking.destination}</h3>
                  </div>
                  <p className="text-slate-600 text-sm">Cliente: <strong>{booking.clientName}</strong></p>
                  
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        📅 {safeDate(booking.startTime)}
                    </div>
                    <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        ⏰ {safeTime(booking.startTime)} - {safeTime(booking.endTime)}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-slate-500">
                      📍 Saída: {booking.departureLocation || 'N/A'}
                  </div>

                  <div className="mt-3 text-sm grid grid-cols-2 gap-2">
                    <div>
                        <span className="font-medium text-slate-700 block">Veículo</span> 
                        {bus ? (
                            <button onClick={() => setSelectedBus(bus)} className="text-blue-600 hover:underline font-semibold">{bus.model} ({bus.plate})</button>
                        ) : <span className="text-slate-400">Não atribuído</span>}
                    </div>
                    <div>
                        <span className="font-medium text-slate-700 block">Motorista</span> 
                        <span className="text-slate-600">{driver ? driver.name : <span className="text-red-500 font-bold">Sem Motorista</span>}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 min-w-[150px]">
                  <p className="text-lg font-bold text-blue-600">R$ {booking.value.toLocaleString('pt-BR')}</p>
                  
                  <div className="mt-2 text-xs mb-3">
                     {booking.paymentStatus === 'PAID' ? (
                         <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Pago: {safeDate(booking.paymentDate)}</span>
                     ) : booking.paymentStatus === 'SCHEDULED' ? (
                         <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Vence: {safeDate(booking.paymentDate)}</span>
                     ) : (
                         <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Pendente</span>
                     )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                      <button onClick={() => handlePrintOS(booking)} className="bg-slate-800 text-white text-xs py-2 rounded font-bold hover:bg-slate-700">🖨️ Imprimir OS</button>
                      <button onClick={() => handleEdit(booking)} className="bg-blue-100 text-blue-700 text-xs py-2 rounded font-bold hover:bg-blue-200">✏️ Editar</button>
                      {booking.status === 'CONFIRMED' && (
                          <button onClick={() => updateBookingStatus(booking.id, 'CANCELLED')} className="text-red-500 text-xs hover:underline">Cancelar Viagem</button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredBookings.length === 0 && (
            <div className="text-center text-slate-500 py-10 bg-white rounded-lg border border-dashed border-slate-300">
                Nenhuma locação encontrada com estes filtros.
            </div>
          )}
        </div>
      </div>

      {/* FORM SECTION (RIGHT) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit sticky top-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800">{editingBookingId ? 'Editar Locação' : 'Nova Locação'}</h3>
            {editingBookingId && <button onClick={handleCancelEdit} className="text-xs text-red-500 underline">Cancelar</button>}
        </div>
        
        {msg && <div className={`p-3 rounded mb-4 text-sm ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{msg.text}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Dados do Cliente</label>
                <input name="clientName" value={formData.clientName} onChange={handleChange} placeholder="Nome do Cliente" className="w-full border p-2 rounded mt-1" required />
                <input name="clientPhone" value={formData.clientPhone} onChange={handleChange} placeholder="Telefone" className="w-full border p-2 rounded mt-2" />
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Detalhes da Viagem</label>
                <input name="destination" value={formData.destination} onChange={handleChange} placeholder="Destino" className="w-full border p-2 rounded mt-1" required />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-bold">Início</label><input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full border p-2 rounded" required /></div>
                <div><label className="text-xs font-bold">Fim</label><input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full border p-2 rounded" required /></div>
            </div>

            <input name="departureLocation" value={formData.departureLocation} onChange={handleChange} placeholder="Local de Saída" className="w-full border p-2 rounded" required />
            <div><label className="text-xs font-bold">Apresentação (Garagem)</label><input type="datetime-local" name="presentationTime" value={formData.presentationTime} onChange={handleChange} className="w-full border p-2 rounded" /></div>

            <select name="busId" value={formData.busId} onChange={handleChange} className="w-full border p-2 rounded" required>
                <option value="">Selecione o Ônibus</option>
                {buses.map(b => (
                    <option key={b.id} value={b.id} disabled={b.status === 'MAINTENANCE' && b.id !== formData.busId}>{b.plate} - {b.model}</option>
                ))}
            </select>
            
            <select name="driverId" value={formData.driverId} onChange={handleChange} className="w-full border p-2 rounded">
                <option value="">Selecione o Motorista</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Observações (Para a OS)</label>
                <textarea 
                    name="observations" 
                    value={formData.observations} 
                    onChange={handleChange} 
                    placeholder="Ex: Pegar passageiros extra na praça; Levar água; Cliente VIP..." 
                    className="w-full border p-2 rounded mt-1 h-20 resize-none text-sm" 
                />
            </div>

            <div className="border-t pt-4">
                <label className="block text-sm font-bold mb-2">Financeiro</label>
                <input type="number" name="value" value={formData.value} onChange={handleChange} className="w-full border p-2 rounded mb-2" placeholder="Valor R$" />
                <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className="w-full border p-2 rounded mb-2">
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Pago</option>
                    <option value="SCHEDULED">Agendado</option>
                </select>
                {formData.paymentStatus !== 'PENDING' && (
                    <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className="w-full border p-2 rounded" required />
                )}
            </div>

            <button type="submit" className={`w-full py-2 rounded text-white font-bold ${editingBookingId ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                {editingBookingId ? 'Salvar Alterações' : 'Agendar'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default BookingsView;