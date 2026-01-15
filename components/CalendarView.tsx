
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Booking } from '../types';

interface CalendarViewProps {
  onEventClick?: (booking: Booking) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onEventClick }) => {
  const { bookings, timeOffs, users, currentUser, addTimeOff, updateTimeOffStatus, buses } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  
  // Manager "Add Time Off" State
  const [newTimeOff, setNewTimeOff] = useState({ 
      driverId: '', 
      date: '', 
      endDate: '',
      type: 'FOLGA',
      startTime: '',
      endTime: '' 
  });

  // Booking Details Modal State (For Managers when no external handler is passed)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const drivers = users.filter(u => u.role === UserRole.DRIVER);
  
  // Get pending time offs
  const pendingTimeOffs = timeOffs.filter(t => t.status === 'PENDING').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, (_, i) => i);

  // HELPER: Format date string YYYY-MM-DD to DD/MM/YYYY manually to avoid timezone bugs
  const formatDateString = (dateStr: string) => {
    if(!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper for DateTime display in Modal
  const formatDateTime = (isoString: string) => {
      if (!isoString) return 'N/A';
      try {
          const d = new Date(isoString);
          return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch (e) { return isoString; }
  };

  const handleAddFolga = (e: React.FormEvent) => {
    e.preventDefault();
    if(newTimeOff.driverId && newTimeOff.date) {
        addTimeOff({
            driverId: newTimeOff.driverId,
            date: newTimeOff.date,
            endDate: newTimeOff.type === 'FERIAS' ? newTimeOff.endDate : undefined,
            type: newTimeOff.type as any,
            startTime: newTimeOff.type === 'PLANTAO' ? newTimeOff.startTime : undefined,
            endTime: newTimeOff.type === 'PLANTAO' ? newTimeOff.endTime : undefined,
        });
        setShowModal(false);
        setNewTimeOff({ driverId: '', date: '', endDate: '', type: 'FOLGA', startTime: '', endTime: '' });
    }
  };

  const setShift = (start: string, end: string) => {
      setNewTimeOff({ ...newTimeOff, startTime: start, endTime: end });
  };

  const canManage = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📅 Calendário de Escala
        </h2>
        
        {canManage && (
            <button 
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
                + Lançar Evento
            </button>
        )}
      </div>

      {/* PENDING REQUESTS PANEL (Manager/Dev Only) */}
      {canManage && pendingTimeOffs.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Solicitações Pendentes ({pendingTimeOffs.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingTimeOffs.map(t => {
                      const driver = users.find(u => u.id === t.driverId);
                      return (
                          <div key={t.id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-100 flex justify-between items-center">
                              <div>
                                  <p className="font-bold text-slate-800">{driver?.name}</p>
                                  <p className="text-sm text-slate-600">
                                      {t.type} • {formatDateString(t.date)}
                                      {t.endDate && ` até ${formatDateString(t.endDate)}`}
                                  </p>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => updateTimeOffStatus(t.id, 'APPROVED')}
                                    className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200" title="Aprovar"
                                  >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  </button>
                                  <button 
                                    onClick={() => updateTimeOffStatus(t.id, 'REJECTED')}
                                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200" title="Rejeitar"
                                  >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-200 rounded-full text-slate-600">
                &lt; Anterior
            </button>
            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
                {monthNames[month]} {year}
            </h3>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-200 rounded-full text-slate-600">
                Próximo &gt;
            </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase text-center py-2">
            <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-px border-b border-slate-200">
            {padding.map((_, i) => (
                <div key={`pad-${i}`} className="bg-white min-h-[100px]"></div>
            ))}
            
            {days.map(day => {
                // IMPORTANT: Create date using local year, month, day to correspond to calendar visual
                const cellDate = new Date(year, month, day, 12, 0, 0); 
                // Format string for simple comparisons (YYYY-MM-DD)
                const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                // Filter Events
                const dayBookings = bookings.filter(b => {
                   if (b.status === 'CANCELLED') return false;
                   const start = new Date(b.startTime);
                   const end = new Date(b.endTime);
                   start.setHours(0,0,0,0);
                   end.setHours(23,59,59,999);
                   return cellDate >= start && cellDate <= end;
                });

                const dayTimeOffs = timeOffs.filter(t => {
                    if (t.status !== 'APPROVED') return false;
                    
                    // Logic for Vacation Ranges
                    if (t.type === 'FERIAS' && t.endDate) {
                        return cellDateStr >= t.date && cellDateStr <= t.endDate;
                    }
                    
                    // Logic for Single Day Events (Folga / Plantão)
                    return t.date === cellDateStr;
                });

                // For drivers, filter only their own events
                const visibleBookings = currentUser.role === UserRole.DRIVER 
                    ? dayBookings.filter(b => b.driverId === currentUser.id) 
                    : dayBookings;

                const visibleTimeOffs = currentUser.role === UserRole.DRIVER 
                    ? dayTimeOffs.filter(t => t.driverId === currentUser.id) 
                    : dayTimeOffs;

                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                return (
                    <div key={day} className={`bg-white min-h-[100px] p-2 hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
                        <span className={`text-sm font-semibold ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm' : 'text-slate-700'}`}>
                            {day}
                        </span>
                        
                        <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                            {visibleTimeOffs.map(t => {
                                const driver = users.find(u => u.id === t.driverId);
                                const isVacation = t.type === 'FERIAS';
                                const isStandby = t.type === 'PLANTAO';
                                
                                let styleClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                                let icon = '🚫';
                                let label = 'Folga';

                                if (isVacation) {
                                    styleClass = 'bg-green-100 text-green-800 border-green-200';
                                    icon = '🏖️';
                                    label = 'Férias';
                                } else if (isStandby) {
                                    styleClass = 'bg-purple-100 text-purple-800 border-purple-200';
                                    icon = '🚨';
                                    label = t.startTime ? `${t.startTime}-${t.endTime}` : 'Plantão';
                                }

                                return (
                                    <div key={t.id} className={`text-[10px] px-1 py-0.5 rounded truncate font-medium border ${styleClass}`} title={`${t.type} - ${driver?.name}`}>
                                        {icon} {canManage ? driver?.name.split(' ')[0] : ''} {label}
                                    </div>
                                );
                            })}
                            {visibleBookings.map(b => {
                                const driver = users.find(u => u.id === b.driverId);
                                return (
                                    <div 
                                        key={b.id} 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (onEventClick) {
                                                onEventClick(b);
                                            } else {
                                                setSelectedBooking(b);
                                            }
                                        }}
                                        className={`relative z-10 text-[10px] px-2 py-1 rounded truncate font-medium border cursor-pointer hover:opacity-80 transition-opacity hover:scale-[1.02] transform transition-transform ${
                                            b.driverId === currentUser.id && currentUser.role === UserRole.DRIVER 
                                            ? 'bg-blue-600 text-white border-blue-700' // Highlight own trips
                                            : 'bg-blue-100 text-blue-800 border-blue-200'
                                        }`} 
                                        title={`${b.destination} - ${driver?.name || 'S/ Motorista'}`}
                                    >
                                        🚌 {canManage ? `${b.destination} (${driver?.name.split(' ')[0] || '?'})` : b.destination}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* TRIP DETAILS MODAL (Pop-up igual ao do Motorista) */}
      {selectedBooking && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={() => setSelectedBooking(null)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in relative z-[101]" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                        <h3 className="font-bold text-lg">Detalhes da Viagem</h3>
                        <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-white font-bold text-xl">&times;</button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-4 mb-2">
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <span className="text-2xl">🚌</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{selectedBooking.destination}</h2>
                                {(() => {
                                    const bus = buses.find(b => b.id === selectedBooking.busId);
                                    return bus ? <p className="text-slate-600 font-medium">{bus.plate} - {bus.model}</p> : null;
                                })()}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Saída</p>
                                <p className="text-sm font-semibold text-slate-800">{formatDateTime(selectedBooking.startTime)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Retorno</p>
                                <p className="text-sm font-semibold text-slate-800">{formatDateTime(selectedBooking.endTime)}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-slate-500 font-bold uppercase">Local de Apresentação</p>
                                <p className="text-sm text-slate-800">{selectedBooking.presentationTime ? formatDateTime(selectedBooking.presentationTime) : formatDateTime(selectedBooking.startTime)} - {selectedBooking.departureLocation || 'Garagem'}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Cliente / Contratante</p>
                                    <p className="text-sm font-medium">{selectedBooking.clientName}</p>
                                    {selectedBooking.clientPhone && <p className="text-sm text-blue-600">{selectedBooking.clientPhone}</p>}
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Motorista</p>
                                    <p className="text-sm font-medium">
                                        {selectedBooking.driverId 
                                            ? users.find(u => u.id === selectedBooking.driverId)?.name 
                                            : selectedBooking.freelanceDriverName 
                                                ? `${selectedBooking.freelanceDriverName} (Freelance)` 
                                                : 'Não atribuído'}
                                    </p>
                                </div>
                            </div>
                            
                            {selectedBooking.observations && (
                                <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                                    <p className="text-xs text-yellow-700 font-bold uppercase mb-1">Observações / Instruções</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedBooking.observations}</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => setSelectedBooking(null)}
                            className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 mt-2"
                        >
                            Fechar Detalhes
                        </button>
                    </div>
                </div>
            </div>
      )}

      {/* Modal for adding Time Off / Shift / Vacation (Manager Only) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl relative z-[101]">
                <h3 className="text-xl font-bold mb-4 text-slate-800">Lançar Evento na Escala</h3>
                <form onSubmit={handleAddFolga} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Evento</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setNewTimeOff({...newTimeOff, type: 'FOLGA'})} className={`flex-1 py-2 text-sm font-bold rounded border ${newTimeOff.type === 'FOLGA' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white border-slate-200 text-slate-500'}`}>Folga</button>
                            <button type="button" onClick={() => setNewTimeOff({...newTimeOff, type: 'PLANTAO'})} className={`flex-1 py-2 text-sm font-bold rounded border ${newTimeOff.type === 'PLANTAO' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-white border-slate-200 text-slate-500'}`}>Plantão</button>
                            <button type="button" onClick={() => setNewTimeOff({...newTimeOff, type: 'FERIAS'})} className={`flex-1 py-2 text-sm font-bold rounded border ${newTimeOff.type === 'FERIAS' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white border-slate-200 text-slate-500'}`}>Férias</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Motorista</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={newTimeOff.driverId}
                            onChange={(e) => setNewTimeOff({...newTimeOff, driverId: e.target.value})}
                            required
                        >
                            <option value="">Selecione...</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Logic */}
                    {newTimeOff.type === 'FERIAS' ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                                <input 
                                    type="date" 
                                    className="w-full border p-2 rounded"
                                    value={newTimeOff.date}
                                    onChange={(e) => setNewTimeOff({...newTimeOff, date: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
                                <input 
                                    type="date" 
                                    className="w-full border p-2 rounded"
                                    value={newTimeOff.endDate}
                                    onChange={(e) => setNewTimeOff({...newTimeOff, endDate: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input 
                                type="date" 
                                className="w-full border p-2 rounded"
                                value={newTimeOff.date}
                                onChange={(e) => setNewTimeOff({...newTimeOff, date: e.target.value})}
                                required
                            />
                        </div>
                    )}

                    {/* Shift Logic for Plantão */}
                    {newTimeOff.type === 'PLANTAO' && (
                        <div className="bg-purple-50 p-3 rounded border border-purple-100">
                            <label className="block text-xs font-bold text-purple-800 uppercase mb-2">Horário do Plantão</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <button type="button" onClick={() => setShift('08:00', '16:20')} className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">08:00 - 16:20</button>
                                <button type="button" onClick={() => setShift('14:00', '22:00')} className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">14:00 - 22:00</button>
                                <button type="button" onClick={() => setShift('22:00', '06:00')} className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">22:00 - 06:00</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="time" className="border p-1 rounded text-sm" value={newTimeOff.startTime} onChange={e => setNewTimeOff({...newTimeOff, startTime: e.target.value})} />
                                <input type="time" className="border p-1 rounded text-sm" value={newTimeOff.endTime} onChange={e => setNewTimeOff({...newTimeOff, endTime: e.target.value})} />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">Cancelar</button>
                        <button type="submit" className="flex-1 bg-slate-800 text-white py-2 rounded hover:bg-slate-700">Salvar Evento</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
