
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Booking, TimeOff, CharterContract } from '../types';

interface CalendarViewProps {
  onEventClick?: (booking: Booking) => void;
}

// Helper Type for the Generic Modal
type GenericEventType = {
    type: 'TIMEOFF' | 'CHARTER';
    data: any;
    title: string;
    colorClass: string;
};

const CalendarView: React.FC<CalendarViewProps> = ({ onEventClick }) => {
  const { bookings, timeOffs, users, currentUser, addTimeOff, updateTimeOffStatus, deleteTimeOff, buses, charterContracts, scheduleConfirmations } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  
  // Manager "Add Time Off" State
  const [newTimeOff, setNewTimeOff] = useState({ 
      driverId: '', 
      date: new Date().toISOString().split('T')[0], // Default to today
      endDate: '',
      type: 'FOLGA',
      startTime: '',
      endTime: '' 
  });

  // Booking Details Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // NEW: Generic Event Details Modal State (TimeOff / Charter)
  const [selectedGenericEvent, setSelectedGenericEvent] = useState<GenericEventType | null>(null);

  const drivers = users.filter(u => u.role === UserRole.DRIVER);
  const canManage = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER;
  const isAux = currentUser.role === UserRole.GARAGE_AUX;
  
  // Permission helper: Manager OR Garage Aux can see full schedule
  const canViewAllSchedule = canManage || isAux;
  
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
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
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
    
    if (!newTimeOff.driverId || !newTimeOff.date) {
        alert("Por favor, selecione um motorista e a data.");
        return;
    }

    // Build payload dynamically to avoid passing undefined values to Firestore
    const payload: any = {
        driverId: newTimeOff.driverId,
        date: newTimeOff.date,
        type: newTimeOff.type
    };

    if (newTimeOff.type === 'FERIAS' && newTimeOff.endDate) {
        payload.endDate = newTimeOff.endDate;
    }

    if (newTimeOff.type === 'PLANTAO') {
        if (newTimeOff.startTime) payload.startTime = newTimeOff.startTime;
        if (newTimeOff.endTime) payload.endTime = newTimeOff.endTime;
    }

    addTimeOff(payload);
    setShowModal(false);
    // Reset only some fields, keep date for convenience
    setNewTimeOff(prev => ({ ...prev, driverId: canManage ? '' : currentUser.id, type: 'FOLGA', startTime: '', endTime: '', endDate: '' }));
    alert(canManage ? "Evento lançado com sucesso!" : "Solicitação enviada com sucesso!");
  };

  const handleDeleteTimeOff = (id: string, name: string) => {
      if (window.confirm(`Tem certeza que deseja excluir este evento de ${name}?`)) {
          deleteTimeOff(id);
          setSelectedGenericEvent(null); // Close modal if open
      }
  };

  const setShift = (start: string, end: string) => {
      setNewTimeOff({ ...newTimeOff, startTime: start, endTime: end });
  };

  // NEW: Handle day click to open modal
  const handleDayClick = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // If regular user, pre-fill their ID
      const initialDriverId = canManage ? '' : currentUser.id;
      
      setNewTimeOff(prev => ({ 
          ...prev, 
          date: dateStr, 
          endDate: '', 
          driverId: initialDriverId,
          type: 'FOLGA'
      }));
      setShowModal(true);
  };

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
                // Format string for simple comparisons (YYYY-MM-DD)
                const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const cellDateObj = new Date(year, month, day, 12, 0, 0);
                const cellDayOfWeek = cellDateObj.getDay();

                // 1. FILTER BOOKINGS
                const dayBookings = bookings.filter(b => {
                   if (b.status === 'CANCELLED') return false;
                   const start = new Date(b.startTime);
                   const end = new Date(b.endTime);
                   start.setHours(0,0,0,0);
                   end.setHours(23,59,59,999);
                   return cellDateObj >= start && cellDateObj <= end;
                });

                // 2. FILTER TIME OFFS
                const dayTimeOffs = timeOffs.filter(t => {
                    const isOwner = t.driverId === currentUser.id;
                    if (!canManage && !isOwner) return false;
                    if (t.status === 'REJECTED') return false;

                    if (t.date === cellDateStr) return true;
                    if (t.endDate && t.endDate >= t.date) {
                        return cellDateStr >= t.date && cellDateStr <= t.endDate;
                    }
                    return false;
                });

                // 3. FILTER CHARTERS (NEW)
                const dayCharters = charterContracts.filter(c => {
                    // Check date range
                    if (cellDateStr < c.startDate || cellDateStr > c.endDate) return false;
                    // Check day of week
                    if (!c.weekDays.includes(cellDayOfWeek)) return false;
                    // Check status
                    if (c.status !== 'ACTIVE') return false;
                    
                    // Privacy Check (Manager/Aux sees all, Driver sees own)
                    const isOwner = c.driverId === currentUser.id;
                    if (!canViewAllSchedule && !isOwner) return false;

                    return true;
                });

                // Privacy for bookings (Manager/Aux sees all, Driver sees own)
                const visibleBookings = canViewAllSchedule ? dayBookings : dayBookings.filter(b => b.driverId === currentUser.id);

                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                return (
                    <div 
                        key={day} 
                        onClick={() => handleDayClick(day)}
                        className={`bg-white min-h-[100px] p-2 transition-colors cursor-pointer hover:bg-blue-50 ${isToday ? 'bg-blue-50/30' : ''}`}
                    >
                        <span className={`text-sm font-semibold ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm' : 'text-slate-700'}`}>
                            {day}
                        </span>
                        
                        <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                            {dayTimeOffs.map(t => {
                                const driver = users.find(u => u.id === t.driverId);
                                const isVacation = t.type === 'FERIAS';
                                const isStandby = t.type === 'PLANTAO';
                                const isPending = t.status === 'PENDING';
                                
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
                                    label = t.startTime ? `${t.startTime} - ${t.endTime}` : 'Plantão';
                                }

                                if (isPending) {
                                    styleClass = 'bg-gray-50 text-gray-500 border-dashed border-gray-300';
                                    label += ' (Pendente)';
                                }

                                return (
                                    <div 
                                        key={t.id} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedGenericEvent({
                                                type: 'TIMEOFF',
                                                data: t,
                                                title: isVacation ? 'Férias' : isStandby ? 'Plantão' : 'Folga',
                                                colorClass: styleClass.replace('border', '').split(' ')[0] // Extract bg color
                                            });
                                        }}
                                        className={`group text-[10px] px-1 py-0.5 rounded truncate font-medium border cursor-pointer hover:shadow-sm ${styleClass} flex justify-between items-center`} 
                                        title={`${t.type} - ${driver?.name}`}
                                    >
                                        <div className="truncate">
                                            {icon} <strong>{driver?.name?.split(' ')[0] || '...'}</strong> {label}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* CHARTER EVENTS */}
                            {dayCharters.map(c => {
                                const driver = users.find(u => u.id === c.driverId);
                                const driverName = driver ? driver.name : c.freelanceDriverName ? `${c.freelanceDriverName} (F)` : 'S/ Mot';
                                
                                // Check confirmation for Charter
                                const isConfirmed = scheduleConfirmations.some(conf => 
                                    conf.referenceId === c.id && 
                                    conf.type === 'CHARTER' &&
                                    conf.date === cellDateStr &&
                                    conf.driverId === c.driverId
                                );

                                return (
                                    <div 
                                        key={`charter-${c.id}-${day}`} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedGenericEvent({
                                                type: 'CHARTER',
                                                data: { ...c, currentDate: cellDateStr },
                                                title: 'Fretamento',
                                                colorClass: 'bg-orange-100'
                                            });
                                        }}
                                        className="text-[10px] px-2 py-1 rounded truncate font-medium border bg-orange-100 text-orange-900 border-orange-300 cursor-pointer hover:bg-orange-200" 
                                        title={`Fretamento: ${c.clientName}`}
                                    >
                                        🏭 {canViewAllSchedule ? `${c.route.substring(0,12)}.. (${driverName.split(' ')[0]})` : c.route}
                                        {isConfirmed && <span className="ml-1 text-green-600 font-bold" title="Motorista Confirmou">✓</span>}
                                    </div>
                                )
                            })}

                            {visibleBookings.map(b => {
                                const driver = users.find(u => u.id === b.driverId);
                                
                                // Check confirmation for Booking
                                const isConfirmed = scheduleConfirmations.some(conf => 
                                    conf.referenceId === b.id && 
                                    conf.type === 'BOOKING'
                                );

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
                                        🚌 {canViewAllSchedule ? `${b.destination} (${driver?.name?.split(' ')[0] || '?'})` : b.destination}
                                        {isConfirmed && <span className="ml-1 font-bold" title="Motorista Confirmou">✓</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* GENERIC EVENT MODAL (Folga, Férias, Plantão, Fretamento) */}
      {selectedGenericEvent && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={() => setSelectedGenericEvent(null)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in relative z-[101]" onClick={e => e.stopPropagation()}>
                  <div className={`p-4 flex justify-between items-center text-slate-800 ${selectedGenericEvent.colorClass} bg-opacity-50`}>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                          {selectedGenericEvent.type === 'TIMEOFF' ? (
                              selectedGenericEvent.data.type === 'FERIAS' ? '🏖️ Férias' : 
                              selectedGenericEvent.data.type === 'PLANTAO' ? '🚨 Plantão' : '🚫 Folga'
                          ) : '🏭 Fretamento'}
                      </h3>
                      <button onClick={() => setSelectedGenericEvent(null)} className="text-slate-500 hover:text-slate-900 font-bold text-xl">&times;</button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* TIMEOFF CONTENT */}
                      {selectedGenericEvent.type === 'TIMEOFF' && (
                          <>
                              {(() => {
                                  const t = selectedGenericEvent.data as TimeOff;
                                  const driver = users.find(u => u.id === t.driverId);
                                  return (
                                      <div className="space-y-3">
                                          <div>
                                              <p className="text-xs text-slate-500 font-bold uppercase">Motorista</p>
                                              <p className="text-lg font-bold text-slate-800">{driver?.name}</p>
                                          </div>
                                          <div>
                                              <p className="text-xs text-slate-500 font-bold uppercase">Data</p>
                                              <p className="text-slate-700">
                                                  {formatDateString(t.date)}
                                                  {t.endDate && ` até ${formatDateString(t.endDate)}`}
                                              </p>
                                          </div>
                                          {t.type === 'PLANTAO' && (
                                              <div>
                                                  <p className="text-xs text-slate-500 font-bold uppercase">Horário</p>
                                                  <p className="text-slate-700 font-medium bg-purple-50 p-2 rounded border border-purple-100 inline-block">
                                                      {t.startTime} - {t.endTime}
                                                  </p>
                                              </div>
                                          )}
                                          <div>
                                              <p className="text-xs text-slate-500 font-bold uppercase">Status</p>
                                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                  t.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                                                  t.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                              }`}>
                                                  {t.status === 'APPROVED' ? 'Aprovado' : t.status === 'REJECTED' ? 'Recusado' : 'Pendente'}
                                              </span>
                                          </div>

                                          {canManage && (
                                              <button 
                                                  onClick={() => handleDeleteTimeOff(t.id, driver?.name || 'Motorista')}
                                                  className="w-full mt-4 border border-red-200 text-red-600 py-2 rounded hover:bg-red-50 text-sm font-bold"
                                              >
                                                  Excluir Evento
                                              </button>
                                          )}
                                      </div>
                                  );
                              })()}
                          </>
                      )}

                      {/* CHARTER CONTENT */}
                      {selectedGenericEvent.type === 'CHARTER' && (
                          <>
                              {(() => {
                                  const c = selectedGenericEvent.data;
                                  const bus = buses.find(b => b.id === c.busId);
                                  const driver = users.find(u => u.id === c.driverId);
                                  const driverDisplay = c.driverId ? driver?.name : c.freelanceDriverName ? `${c.freelanceDriverName} (Freelance)` : 'Não atribuído';
                                  
                                  return (
                                      <div className="space-y-3">
                                          <div>
                                              <p className="text-xs text-slate-500 font-bold uppercase">Rota / Linha</p>
                                              <p className="text-lg font-bold text-slate-800">{c.route}</p>
                                          </div>
                                          <div>
                                              <p className="text-xs text-slate-500 font-bold uppercase">Cliente</p>
                                              <p className="text-slate-700">{c.clientName}</p>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                  <p className="text-xs text-slate-500 font-bold uppercase">Data</p>
                                                  <p className="text-slate-700 font-medium">{formatDateString(c.currentDate)}</p>
                                              </div>
                                              <div>
                                                  <p className="text-xs text-slate-500 font-bold uppercase">Horários</p>
                                                  <p className="text-slate-700 text-sm">{c.morningDeparture} / {c.afternoonDeparture}</p>
                                              </div>
                                          </div>
                                          <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                              <div className="mb-2">
                                                  <p className="text-xs text-slate-500 font-bold uppercase">Motorista</p>
                                                  <p className="text-sm font-medium text-slate-800">{driverDisplay}</p>
                                              </div>
                                              <div>
                                                  <p className="text-xs text-slate-500 font-bold uppercase">Veículo</p>
                                                  <p className="text-sm font-medium text-slate-800">{bus?.plate} - {bus?.model}</p>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })()}
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

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

      {/* Modal for adding Time Off / Shift / Vacation (Managers & Drivers) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl relative z-[101]">
                <h3 className="text-xl font-bold mb-4 text-slate-800">
                    {canManage ? 'Lançar Evento na Escala' : 'Solicitar Evento / Folga'}
                </h3>
                <form onSubmit={handleAddFolga} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Evento</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setNewTimeOff({...newTimeOff, type: 'FOLGA'})} className={`flex-1 py-2 text-sm font-bold rounded border ${newTimeOff.type === 'FOLGA' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white border-slate-200 text-slate-500'}`}>Folga</button>
                            
                            {/* Plantão might be Manager only, but let's allow it if desired, or restrict it visually if needed. Assuming everyone for now or just restrict behavior. */}
                            {canManage && (
                                <button type="button" onClick={() => setNewTimeOff({...newTimeOff, type: 'PLANTAO'})} className={`flex-1 py-2 text-sm font-bold rounded border ${newTimeOff.type === 'PLANTAO' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-white border-slate-200 text-slate-500'}`}>Plantão</button>
                            )}
                            
                            <button type="button" onClick={() => setNewTimeOff({...newTimeOff, type: 'FERIAS'})} className={`flex-1 py-2 text-sm font-bold rounded border ${newTimeOff.type === 'FERIAS' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white border-slate-200 text-slate-500'}`}>Férias</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Motorista</label>
                        <select 
                            className={`w-full border p-2 rounded ${!canManage ? 'bg-slate-100' : ''}`}
                            value={newTimeOff.driverId}
                            onChange={(e) => setNewTimeOff({...newTimeOff, driverId: e.target.value})}
                            required
                            disabled={!canManage} // Disable for non-managers
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
                                <button type="button" onClick={() => setShift('08:00', '16:20')} className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 shadow-sm">08:00 - 16:20</button>
                                <button type="button" onClick={() => setShift('14:00', '22:00')} className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 shadow-sm">14:00 - 22:00</button>
                                <button type="button" onClick={() => setShift('22:00', '06:00')} className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 shadow-sm">22:00 - 06:00</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-purple-700 block mb-1">Início (Personalizado)</label>
                                    <input type="time" className="w-full border p-1 rounded text-sm" value={newTimeOff.startTime} onChange={e => setNewTimeOff({...newTimeOff, startTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-purple-700 block mb-1">Fim (Personalizado)</label>
                                    <input type="time" className="w-full border p-1 rounded text-sm" value={newTimeOff.endTime} onChange={e => setNewTimeOff({...newTimeOff, endTime: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 font-medium">Cancelar</button>
                        <button type="submit" className="flex-1 bg-slate-800 text-white py-2 rounded hover:bg-slate-700 font-bold">
                            {canManage ? 'Salvar Evento' : 'Enviar Solicitação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
