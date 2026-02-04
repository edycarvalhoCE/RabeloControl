
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Bus, Booking } from '../types';

const BookingsView: React.FC = () => {
  const { bookings, buses, users, updateBooking, updateBookingStatus, scheduleConfirmations } = useStore();
  
  // --- FILTER STATE ---
  const [filters, setFilters] = useState({ client: '', busId: '', startDate: '', endDate: '', status: '' });

  // --- EDIT MODAL STATE ---
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState('');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const drivers = users.filter(u => u.role === UserRole.DRIVER);

  const getStatusLabel = (status: string) => {
      switch (status) {
          case 'CONFIRMED': return 'Confirmado';
          case 'PENDING': return 'Pendente';
          case 'COMPLETED': return 'Concluído';
          case 'CANCELLED': return 'Cancelado';
          default: return status;
      }
  };

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'CONFIRMED': return 'bg-green-100 text-green-700 border-green-200';
          case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'COMPLETED': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

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

  const handleEditClick = (booking: Booking) => {
    setEditForm({
      busId: booking.busId,
      driverId: booking.driverId || '',
      freelanceDriverName: booking.freelanceDriverName || '',
      isFreelance: !booking.driverId && !!booking.freelanceDriverName,
      driver2Id: booking.driver2Id || '',
      freelanceDriver2Name: booking.freelanceDriver2Name || '',
      isFreelance2: !booking.driver2Id && !!booking.freelanceDriver2Name,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone || '',
      destination: booking.destination,
      startTime: booking.startTime.slice(0, 16),
      endTime: booking.endTime.slice(0, 16),
      value: booking.value,
      paymentStatus: booking.paymentStatus,
      paymentDate: booking.paymentDate ? booking.paymentDate.split('T')[0] : '',
      departureLocation: booking.departureLocation || '',
      presentationTime: booking.presentationTime ? booking.presentationTime.slice(0, 16) : '',
      observations: booking.observations || ''
    });
    setEditingBooking(booking);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (name === 'isFreelance' || name === 'isFreelance2') {
        const isChecked = (e.target as HTMLInputElement).checked;
        setEditForm((prev: any) => ({ ...prev, [name]: isChecked }));
    } else {
        setEditForm((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleEditCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setEditForm((prev: any) => ({ ...prev, value: Number(value) / 100 }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    const result = await updateBooking(editingBooking.id, {
        ...editForm,
        driverId: editForm.isFreelance ? null : editForm.driverId,
        freelanceDriverName: editForm.isFreelance ? editForm.freelanceDriverName : null,
        driver2Id: editForm.driver2Id ? (editForm.isFreelance2 ? null : editForm.driver2Id) : null,
        freelanceDriver2Name: editForm.isFreelance2 ? editForm.freelanceDriver2Name : null,
    });
    if (result.success) {
      setMsg({ type: 'success', text: result.message });
      setTimeout(() => { setMsg(null); setEditingBooking(null); }, 1500);
    } else {
      setMsg({ type: 'error', text: result.message });
    }
  };

  const getDriverNames = (booking: Booking) => {
      const names = [];
      if (booking.driverId) names.push(users.find(u => u.id === booking.driverId)?.name || 'Motorista 1');
      else if (booking.freelanceDriverName) names.push(`${booking.freelanceDriverName} (F)`);
      
      if (booking.driver2Id) names.push(users.find(u => u.id === booking.driver2Id)?.name || 'Motorista 2');
      else if (booking.freelanceDriver2Name) names.push(`${booking.freelanceDriver2Name} (F)`);

      return names.length > 0 ? names.join(' e ') : 'Não atribuído';
  };

  const handlePrintOS = (booking: Booking) => {
      const bus = buses.find(b => b.id === booking.busId);
      const drivers = getDriverNames(booking);
      const printContent = `
        <html><head><title>OS - ${booking.destination}</title>
        <style>body{font-family:Arial,sans-serif;padding:20px;color:#000}.header{text-align:center;border-bottom:2px solid #000;margin-bottom:20px}.row{display:flex;margin-bottom:8px;border-bottom:1px dotted #ccc}.label{font-weight:bold;width:160px}h3{background:#eee;padding:5px;text-transform:uppercase}</style>
        </head><body><div class="header"><h1>RabeloTour - ORDEM DE SERVIÇO</h1></div>
            <h3>Dados da Viagem</h3>
            <div class="row"><span class="label">Destino:</span><span>${booking.destination}</span></div>
            <div class="row"><span class="label">Saída:</span><span>${safeDate(booking.startTime)} ${safeTime(booking.startTime)} - ${booking.departureLocation}</span></div>
            <div class="row"><span class="label">Motoristas:</span><span>${drivers}</span></div>
            <div class="row"><span class="label">Veículo:</span><span>${bus?.plate} - ${bus?.model}</span></div>
            <h3>Observações</h3><div style="background:#f9f9f9;padding:10px;border:1px solid #ccc">${booking.observations || 'N/A'}</div>
            <script>window.print();</script></body></html>`;
      const win = window.open('', '', 'width=800,height=600');
      if (win) { win.document.write(printContent); win.document.close(); }
  };

  const filteredBookings = bookings.filter(b => {
      const matchClient = filters.client ? b.clientName.toLowerCase().includes(filters.client.toLowerCase()) : true;
      const matchBus = filters.busId ? b.busId === filters.busId : true;
      const matchStatus = filters.status ? b.status === filters.status : true;
      return matchClient && matchBus && matchStatus;
  }).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="animate-fade-in relative">
      {editingBooking && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Editar Locação</h3>
                      <button onClick={() => setEditingBooking(null)} className="text-slate-400 hover:text-slate-800 text-xl font-bold">&times;</button>
                  </div>
                  {msg && <div className={`p-3 rounded mb-4 text-sm ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{msg.text}</div>}
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                      <input name="clientName" value={editForm.clientName} onChange={handleEditChange} placeholder="Cliente" className="w-full border p-2 rounded" required />
                      <input name="destination" value={editForm.destination} onChange={handleEditChange} placeholder="Destino" className="w-full border p-2 rounded" required />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="datetime-local" name="startTime" value={editForm.startTime} onChange={handleEditChange} className="w-full border p-2 rounded" required />
                        <input type="datetime-local" name="endTime" value={editForm.endTime} onChange={handleEditChange} className="w-full border p-2 rounded" required />
                      </div>
                      <select name="busId" value={editForm.busId} onChange={handleEditChange} className="w-full border p-2 rounded" required>
                          {buses.map(b => <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>)}
                      </select>
                      
                      {/* Edição de Motoristas */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-2 rounded border">
                              <label className="block text-xs font-bold mb-1">1º Motorista</label>
                              <select name="driverId" value={editForm.driverId} onChange={handleEditChange} className="w-full border p-1 rounded text-sm mb-1">
                                  <option value="">Selecione...</option>
                                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                              <input name="freelanceDriverName" value={editForm.freelanceDriverName} onChange={handleEditChange} placeholder="Freelance" className="w-full border p-1 rounded text-xs" />
                          </div>
                          <div className="bg-slate-50 p-2 rounded border">
                              <label className="block text-xs font-bold mb-1">2º Motorista</label>
                              <select name="driver2Id" value={editForm.driver2Id} onChange={handleEditChange} className="w-full border p-1 rounded text-sm mb-1">
                                  <option value="">Nenhum</option>
                                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                              <input name="freelanceDriver2Name" value={editForm.freelanceDriver2Name} onChange={handleEditChange} placeholder="Freelance" className="w-full border p-1 rounded text-xs" />
                          </div>
                      </div>

                      <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-bold">Salvar Alterações</button>
                  </form>
              </div>
          </div>
      )}

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800">Listagem de Locações ({filteredBookings.length})</h2>
        <div className="grid gap-4">
          {filteredBookings.map(booking => {
            const bus = buses.find(b => b.id === booking.busId);
            const driverNames = getDriverNames(booking);
            return (
              <div key={booking.id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status)}</span>
                    <h3 className="font-semibold text-lg text-slate-900">{booking.destination}</h3>
                  </div>
                  <p className="text-slate-600 text-sm">Cliente: <strong>{booking.clientName}</strong></p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="bg-slate-50 px-2 py-1 rounded border">📅 {safeDate(booking.startTime)} {safeTime(booking.startTime)}</div>
                    <div className="bg-slate-50 px-2 py-1 rounded border">🚌 {bus?.plate}</div>
                    <div className="bg-slate-50 px-2 py-1 rounded border">👤 {driverNames}</div>
                  </div>
                </div>
                <div className="text-right flex flex-col gap-2 min-w-[150px]">
                  <p className="text-lg font-bold text-blue-600">R$ {booking.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  <button onClick={() => handlePrintOS(booking)} className="bg-slate-800 text-white text-xs py-2 rounded font-bold">OS</button>
                  <button onClick={() => handleEditClick(booking)} className="bg-blue-100 text-blue-700 text-xs py-2 rounded font-bold">Editar</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BookingsView;
