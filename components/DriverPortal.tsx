
import React, { useState } from 'react';
import { useStore } from '../services/store';
import CalendarView from './CalendarView';
import { Booking, UserRole } from '../types';

interface DriverPortalProps {
    view?: 'schedule' | 'finance' | 'report';
}

const DriverPortal: React.FC<DriverPortalProps> = ({ view = 'schedule' }) => {
  const { currentUser, bookings, buses, addMaintenanceReport, driverLiabilities, charterContracts, driverFees, scheduleConfirmations, confirmTrip, users } = useStore();
  
  const isAux = currentUser.role === UserRole.GARAGE_AUX;
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Finance Filters
  const [financeStartDate, setFinanceStartDate] = useState('');
  const [financeEndDate, setFinanceEndDate] = useState('');

  // Maintenance Report Form State
  const [reportForm, setReportForm] = useState({
    busId: '',
    type: 'MECANICA',
    description: ''
  });
  const [reportLoading, setReportLoading] = useState(false);

  const scheduleFilter = (b: Booking) => {
      if (b.status === 'CANCELLED') return false;
      if (isAux) return true;
      return b.driverId === currentUser.id || b.driver2Id === currentUser.id;
  };

  const myRegularBookings = bookings
    .filter(scheduleFilter)
    .map(b => ({ ...b, isCharter: false, sortTime: new Date(b.startTime).getTime() }));

  const myCharterOccurrences: any[] = [];
  const myContracts = charterContracts.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      if (isAux) return true;
      return c.driverId === currentUser.id;
  });
  
  if (myContracts.length > 0) {
      const today = new Date();
      today.setHours(0,0,0,0);
      for (let i = 0; i < 15; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const dStr = d.toISOString().split('T')[0];
          const dayOfWeek = d.getDay();
          myContracts.forEach(c => {
              if (dStr >= c.startDate && dStr <= c.endDate && c.weekDays.includes(dayOfWeek)) {
                  myCharterOccurrences.push({
                      id: `${c.id}_${dStr}`,
                      destination: `${c.clientName} (Fretamento)`,
                      clientName: c.clientName,
                      startTime: `${dStr}T${c.morningDeparture}`,
                      endTime: `${dStr}T${c.afternoonDeparture}`,
                      busId: c.busId,
                      driverId: c.driverId || 'Freelance',
                      status: 'CONFIRMED',
                      isCharter: true,
                      observations: `Rota: ${c.route}`,
                      sortTime: new Date(`${dStr}T${c.morningDeparture}`).getTime(),
                      originalContractId: c.id,
                      occurenceDate: dStr
                  });
              }
          });
      }
  }

  const combinedSchedule = [...myRegularBookings, ...myCharterOccurrences].sort((a, b) => a.sortTime - b.sortTime);

  const handleConfirmAction = async (e: React.MouseEvent, type: 'BOOKING' | 'CHARTER', refId: string, date?: string) => {
      e.stopPropagation();
      setConfirming(refId);
      try {
          await confirmTrip(type, refId, date || new Date().toISOString().split('T')[0]);
      } catch (err) {
          alert("Erro ao confirmar.");
      } finally {
          setConfirming(null);
      }
  };

  const isConfirmed = (type: 'BOOKING' | 'CHARTER', refId: string, date?: string) => {
      return scheduleConfirmations.some(c => 
          c.type === type && 
          c.referenceId === refId && 
          c.driverId === currentUser.id &&
          (!date || c.date === date)
      );
  };

  const myFees = driverFees.filter(f => {
      const matchDriver = f.driverId === currentUser.id;
      const matchStart = financeStartDate ? f.date >= financeStartDate : true;
      const matchEnd = financeEndDate ? f.date <= financeEndDate : true;
      return matchDriver && matchStart && matchEnd;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const myLiabilities = driverLiabilities.filter(l => {
      const matchDriver = l.driverId === currentUser.id;
      const matchStart = financeStartDate ? l.date >= financeStartDate : true;
      const matchEnd = financeEndDate ? l.date <= financeEndDate : true;
      return matchDriver && matchStart && matchEnd;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalFeesPending = myFees.filter(f => f.status === 'PENDING').reduce((acc, f) => acc + f.amount, 0);
  const totalLiabilitiesPending = myLiabilities.reduce((acc, l) => acc + (l.totalAmount - l.paidAmount), 0);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.busId || !reportForm.description) {
      alert("Por favor, selecione o ônibus e descreva o defeito.");
      return;
    }
    setReportLoading(true);
    try {
      await addMaintenanceReport({
        busId: reportForm.busId,
        driverId: currentUser.id,
        type: reportForm.type,
        description: reportForm.description,
        date: new Date().toISOString()
      });
      alert("Defeito reportado com sucesso! A manutenção será notificada.");
      setReportForm({ busId: '', type: 'MECANICA', description: '' });
    } catch (err) {
      alert("Erro ao enviar reporte. Tente novamente.");
    } finally {
      setReportLoading(false);
    }
  };

  const formatDateTime = (iso: string) => {
      try { return new Date(iso).toLocaleString('pt-BR'); } catch(e) { return iso; }
  };

  return (
    <div className="animate-fade-in pb-20">
      {/* SCHEDULE VIEW */}
      {view === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                   <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <CalendarView onEventClick={(b) => setSelectedBooking(b)} />
                   </div>
              </div>
              <div className="space-y-4">
                  <h2 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2 px-1">
                    <span>🚌</span> Próximas Viagens
                  </h2>
                  <div className="space-y-3">
                      {combinedSchedule.length === 0 ? (
                          <p className="text-sm text-slate-500 italic bg-white p-6 rounded-xl border border-dashed text-center">Nenhuma viagem agendada para os próximos 15 dias.</p>
                      ) : (
                          combinedSchedule.slice(0, 10).map((booking: any) => {
                              const confirmed = isConfirmed(booking.isCharter ? 'CHARTER' : 'BOOKING', booking.isCharter ? (booking.originalContractId || booking.id.split('_')[0]) : booking.id, booking.occurenceDate);
                              return (
                                <div key={booking.id} onClick={() => setSelectedBooking(booking)} className={`p-4 rounded-xl border-l-4 ${confirmed ? 'border-l-emerald-500 bg-emerald-50/30' : 'border-l-blue-600 bg-white'} shadow-sm cursor-pointer hover:bg-slate-50 transition-colors border border-slate-200`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm uppercase">{booking.destination}</h3>
                                            <p className="text-[10px] text-slate-500 mt-1 font-bold">📅 {new Date(booking.startTime).toLocaleDateString()} às {new Date(booking.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                        </div>
                                        {confirmed ? (
                                            <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-200 uppercase">Ciente ✅</span>
                                        ) : (
                                            <button 
                                                onClick={(e) => handleConfirmAction(e, booking.isCharter ? 'CHARTER' : 'BOOKING', booking.isCharter ? (booking.originalContractId || booking.id.split('_')[0]) : booking.id, booking.occurenceDate)}
                                                disabled={confirming === booking.id}
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-[8px] font-black px-2 py-1 rounded shadow-sm transition-all uppercase"
                                            >
                                                {confirming === booking.id ? '...' : 'Confirmar'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                              );
                          })
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* FINANCE & REPORT VIEWS (Mantidos como estavam) */}
      {view === 'finance' && (
          <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-800 uppercase">Meu Financeiro</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-3">Filtro Período</label>
                      <div className="flex gap-2 items-center">
                          <input type="date" value={financeStartDate} onChange={e => setFinanceStartDate(e.target.value)} className="flex-1 border p-2 rounded-lg text-sm font-bold" />
                          <input type="date" value={financeEndDate} onChange={e => setFinanceEndDate(e.target.value)} className="flex-1 border p-2 rounded-lg text-sm font-bold" />
                      </div>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center shadow-sm">
                      <p className="text-[10px] font-black text-emerald-600 uppercase">Diárias a Receber</p>
                      <p className="text-2xl font-black text-emerald-800">R$ {totalFeesPending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center shadow-sm">
                      <p className="text-[10px] font-black text-red-600 uppercase">Débitos Pendentes</p>
                      <p className="text-2xl font-black text-red-800">R$ {totalLiabilitiesPending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-slate-800 p-4 text-white flex justify-between items-center"><h3 className="font-black text-xs uppercase">Extrato de Diárias</h3></div>
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b">
                              <tr><th className="p-3">Data</th><th className="p-3">Descrição</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Status</th></tr>
                          </thead>
                          <tbody className="divide-y font-bold">
                              {myFees.map(fee => (
                                  <tr key={fee.id}>
                                      <td className="p-3 text-slate-500">{new Date(fee.date).toLocaleDateString()}</td>
                                      <td className="p-3 text-slate-700">{fee.description}</td>
                                      <td className="p-3 text-right text-emerald-600">R$ {fee.amount.toLocaleString()}</td>
                                      <td className="p-3 text-center"><span className={`text-[9px] px-2 py-0.5 rounded font-black ${fee.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{fee.status === 'PAID' ? 'PAGO' : 'PENDENTE'}</span></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="bg-red-800 p-4 text-white flex justify-between items-center"><h3 className="font-black text-xs uppercase">Avarias e Multas</h3></div>
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b">
                              <tr><th className="p-3">Data</th><th className="p-3">Desc.</th><th className="p-3 text-right">Saldo</th><th className="p-3 text-center">Status</th></tr>
                          </thead>
                          <tbody className="divide-y font-bold">
                              {myLiabilities.map(l => (
                                  <tr key={l.id}>
                                      <td className="p-3 text-slate-500">{new Date(l.date).toLocaleDateString()}</td>
                                      <td className="p-3 text-slate-700">{l.description}</td>
                                      <td className="p-3 text-right text-red-600">R$ {(l.totalAmount - l.paidAmount).toLocaleString()}</td>
                                      <td className="p-3 text-center"><span className={`text-[9px] px-2 py-0.5 rounded font-black ${l.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.status === 'PAID' ? 'OK' : 'DEVE'}</span></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {view === 'report' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-red-600 p-6 text-white text-center">
                <h3 className="text-xl font-black uppercase">Reportar Defeito</h3>
                <p className="text-red-100 text-[10px] font-bold uppercase mt-1">Sua mensagem vai direto para a mecânica</p>
              </div>
              <form onSubmit={handleReportSubmit} className="p-8 space-y-5">
                <select 
                  required value={reportForm.busId} 
                  onChange={e => setReportForm({...reportForm, busId: e.target.value})}
                  className="w-full border p-4 rounded-xl font-bold bg-slate-50"
                >
                  <option value="">Selecione o ônibus...</option>
                  {buses.map(b => <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>)}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  {['MECANICA', 'ELETRICA', 'LIMPEZA', 'PNEUS'].map(type => (
                    <button key={type} type="button" onClick={() => setReportForm({...reportForm, type})} className={`py-3 rounded-xl text-[10px] font-black border uppercase ${reportForm.type === type ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-white text-slate-400'}`}>{type}</button>
                  ))}
                </div>

                <textarea
                  required value={reportForm.description}
                  onChange={e => setReportForm({...reportForm, description: e.target.value})}
                  placeholder="O que está acontecendo com o carro?"
                  className="w-full border p-4 rounded-2xl bg-slate-50 h-32 font-medium"
                ></textarea>

                <button type="submit" disabled={reportLoading} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl disabled:opacity-50 uppercase text-xs">
                  {reportLoading ? 'ENVIANDO...' : 'ENVIAR REPORTE'}
                </button>
              </form>
            </div>
          </div>
      )}

      {/* TRIP DETAILS MODAL */}
      {selectedBooking && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={() => setSelectedBooking(null)}>
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in relative z-[101]" onClick={e => e.stopPropagation()}>
                  <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                      <h3 className="font-black uppercase text-sm">Detalhes da Viagem</h3>
                      <button onClick={() => setSelectedBooking(null)} className="font-black text-xl">&times;</button>
                  </div>
                  <div className="p-8 space-y-6">
                      {(() => {
                          const type = selectedBooking.isCharter ? 'CHARTER' : 'BOOKING';
                          const refId = selectedBooking.isCharter ? (selectedBooking.originalContractId || selectedBooking.id.split('_')[0]) : selectedBooking.id;
                          const confirmed = isConfirmed(type, refId, selectedBooking.occurenceDate);
                          return (
                            <div className="text-center">
                                <h2 className="text-2xl font-black text-slate-800 uppercase leading-tight">{selectedBooking.destination}</h2>
                                {confirmed ? (
                                    <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase mt-2 border border-emerald-100">
                                        <span>Você confirmou ciência ✅</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={(e) => handleConfirmAction(e, type, refId, selectedBooking.occurenceDate)}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-full font-black text-xs mt-3 shadow-lg uppercase active:scale-95 transition-transform"
                                    >
                                        Confirmar Ciência Agora
                                    </button>
                                )}
                            </div>
                          );
                      })()}

                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div><p className="text-[9px] font-black text-slate-400 uppercase">Saída</p><p className="text-xs font-black text-slate-800">{formatDateTime(selectedBooking.startTime)}</p></div>
                          <div><p className="text-[9px] font-black text-slate-400 uppercase">Retorno</p><p className="text-xs font-black text-slate-800">{formatDateTime(selectedBooking.endTime)}</p></div>
                      </div>

                      <div className="space-y-4">
                          <div><p className="text-[9px] font-black text-slate-400 uppercase">Apresentação</p><p className="text-sm font-bold text-slate-800">{selectedBooking.departureLocation || 'Garagem'}</p></div>
                          <div className="grid grid-cols-2 gap-4">
                              <div><p className="text-[9px] font-black text-slate-400 uppercase">Cliente</p><p className="text-sm font-bold">{selectedBooking.clientName}</p></div>
                              <div><p className="text-[9px] font-black text-slate-400 uppercase">Telefone</p><p className="text-sm font-bold text-blue-600">{selectedBooking.clientPhone || 'N/A'}</p></div>
                          </div>
                          {selectedBooking.observations && (
                              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                  <p className="text-[9px] font-black text-yellow-700 uppercase mb-1">Observações</p>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap font-medium">{selectedBooking.observations}</p>
                              </div>
                          )}
                      </div>
                      <button onClick={() => setSelectedBooking(null)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Fechar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DriverPortal;
