
import React, { useState } from 'react';
import { useStore } from '../services/store';
import CalendarView from './CalendarView';
import { Booking, UserRole, DriverFee, DriverLiability } from '../types';
import { Logo } from './Logo';

const DriverPortal: React.FC = () => {
  const { currentUser, bookings, timeOffs, addTimeOff, documents, buses, addMaintenanceReport, maintenanceReports, addFuelRecord, driverLiabilities, charterContracts, driverFees, fuelRecords, users, scheduleConfirmations, confirmTrip } = useStore();
  
  const isAux = currentUser.role === UserRole.GARAGE_AUX;

  const [activeTab, setActiveTab] = useState<'schedule' | 'finance' | 'report'>('schedule');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const getTodayLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

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
                      originalContractId: c.id
                  });
              }
          });
      }
  }

  const combinedSchedule = [...myRegularBookings, ...myCharterOccurrences].sort((a, b) => a.sortTime - b.sortTime);

  // --- FINANCE LOGIC FOR DRIVER ---
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
      setActiveTab('schedule');
    } catch (err) {
      alert("Erro ao enviar reporte. Tente novamente.");
    } finally {
      setReportLoading(false);
    }
  };

  const navItems = [
    { id: 'schedule', label: 'MINHA ESCALA', icon: '📅', color: 'blue' },
    { id: 'finance', label: 'FINANCEIRO', icon: '💰', color: 'emerald' },
    { id: 'report', label: 'REPORTAR DEFEITO', icon: '⚠️', color: 'red' },
  ];

  const handleTabChange = (id: any) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 -m-4 md:m-0 pb-20">
      {/* MOBILE HEADER CON MENU */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
          <span className="font-bold text-sm tracking-tight uppercase">Portal do Colaborador</span>
        </div>
        <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-white/20" alt="" />
      </div>

      {/* MOBILE DRAWER MENU */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-2xl p-6 animate-fade-in-right">
            <div className="flex justify-between items-center mb-8">
              <Logo variant="light" size="sm" />
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400">&times;</button>
            </div>
            <div className="space-y-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as any)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl font-bold text-sm transition-all ${
                    activeTab === item.id 
                    ? `bg-${item.color}-600 text-white shadow-lg` 
                    : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP HEADER */}
      <div className="hidden md:flex justify-between items-center bg-gradient-to-r from-blue-700 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden mb-6">
        <div className="z-10">
          <h1 className="text-3xl font-bold mb-2">Portal {isAux ? 'da Garagem' : 'do Motorista'}</h1>
          <div className="flex items-center gap-3">
              <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-white/20" alt="" />
              <p className="opacity-80 font-medium">Olá, {currentUser.name}.</p>
          </div>
        </div>
        <div className="hidden lg:block z-10 opacity-20">
             <Logo variant="light" size="xl" />
        </div>
      </div>

      {/* DESKTOP TABS */}
      <div className="hidden md:flex border-b border-slate-300 space-x-4 overflow-x-auto bg-white px-4 rounded-t-xl mb-6">
        {navItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id as any)} 
            className={`py-4 px-2 font-bold text-sm transition-all border-b-4 ${
              activeTab === item.id 
              ? `border-${item.color}-600 text-${item.color}-600` 
              : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="p-4 md:p-0">
        {activeTab === 'schedule' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                <div className="lg:col-span-2">
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <CalendarView onEventClick={(b) => setSelectedBooking(b)} />
                     </div>
                </div>
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-1">
                      <span>🚌</span> Minhas Próximas Viagens
                    </h2>
                    <div className="space-y-3">
                        {combinedSchedule.length === 0 ? (
                            <p className="text-sm text-slate-500 italic bg-white p-6 rounded-xl border border-dashed text-center">Nenhuma viagem agendada para os próximos 15 dias.</p>
                        ) : (
                            combinedSchedule.slice(0, 10).map((booking: any) => (
                                <div key={booking.id} onClick={() => setSelectedBooking(booking)} className="p-4 rounded-xl border-l-4 border-l-blue-500 bg-white shadow-sm cursor-pointer hover:bg-slate-50 transition-colors group border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{booking.destination}</h3>
                                        {booking.driver2Id === currentUser.id && <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold border border-purple-200">2º MOTORISTA</span>}
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">📅 {new Date(booking.startTime).toLocaleDateString()} às {new Date(booking.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'finance' && (
            <div className="space-y-6 animate-fade-in">
                {/* FILTROS E RESUMO */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2">Filtrar Período</label>
                        <div className="flex gap-2 items-center">
                            <input type="date" value={financeStartDate} onChange={e => setFinanceStartDate(e.target.value)} className="flex-1 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                            <span className="text-slate-400">até</span>
                            <input type="date" value={financeEndDate} onChange={e => setFinanceEndDate(e.target.value)} className="flex-1 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                            {(financeStartDate || financeEndDate) && (
                                <button onClick={() => { setFinanceStartDate(''); setFinanceEndDate(''); }} className="text-red-500 hover:text-red-700 text-xs font-bold px-2">Limpar</button>
                            )}
                        </div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100 text-center">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Diárias a Receber</p>
                        <p className="text-2xl font-bold text-emerald-800">R$ {totalFeesPending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100 text-center">
                        <p className="text-[10px] font-bold text-red-600 uppercase">Dívidas (Avarias/Multas)</p>
                        <p className="text-2xl font-bold text-red-800">R$ {totalLiabilitiesPending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LISTA DE DIÁRIAS */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <span>💸</span> Minhas Diárias
                            </h3>
                            <span className="text-xs bg-slate-700 px-2 py-1 rounded">{myFees.length} registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase border-b">
                                    <tr>
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Descrição</th>
                                        <th className="p-3 text-right">Valor</th>
                                        <th className="p-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {myFees.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">Nenhuma diária encontrada.</td></tr>
                                    ) : (
                                        myFees.map(fee => (
                                            <tr key={fee.id} className="hover:bg-slate-50">
                                                <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(fee.date).toLocaleDateString()}</td>
                                                <td className="p-3 font-medium text-slate-700">{fee.description}</td>
                                                <td className="p-3 text-right font-bold text-emerald-600">R$ {fee.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold ${fee.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {fee.status === 'PAID' ? 'PAGO' : 'PENDENTE'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* LISTA DE AVARIAS / MULTAS */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-red-800 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <span>⚠️</span> Avarias e Multas
                            </h3>
                            <span className="text-xs bg-red-700 px-2 py-1 rounded">{myLiabilities.length} registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase border-b">
                                    <tr>
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Tipo/Desc</th>
                                        <th className="p-3 text-right">Total</th>
                                        <th className="p-3 text-right">Saldo</th>
                                        <th className="p-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {myLiabilities.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Nenhum registro de avaria ou multa.</td></tr>
                                    ) : (
                                        myLiabilities.map(l => (
                                            <tr key={l.id} className="hover:bg-slate-50">
                                                <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(l.date).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                    <span className={`text-[10px] font-bold block ${l.type === 'MULTA' ? 'text-red-600' : 'text-orange-600'}`}>{l.type}</span>
                                                    <span className="text-xs text-slate-600 truncate inline-block max-w-[120px]">{l.description}</span>
                                                </td>
                                                <td className="p-3 text-right text-slate-400 text-xs">R$ {l.totalAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-right font-bold text-red-600">R$ {(l.totalAmount - l.paidAmount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold ${l.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {l.status === 'PAID' ? 'QUITADO' : 'EM ABERTO'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'report' && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-red-600 p-6 text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span>🛠️</span> Reportar Defeito no Veículo
                  </h3>
                  <p className="text-red-100 text-sm mt-1">Sua mensagem será enviada diretamente para a equipe de manutenção.</p>
                </div>
                <form onSubmit={handleReportSubmit} className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Veículo com Defeito *</label>
                    <select 
                      required 
                      value={reportForm.busId} 
                      onChange={e => setReportForm({...reportForm, busId: e.target.value})}
                      className="w-full border border-slate-300 p-3 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                    >
                      <option value="">Selecione o ônibus...</option>
                      {buses.map(b => (
                        <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Problema</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['MECANICA', 'ELETRICA', 'LIMPEZA', 'PNEUS', 'OUTROS'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setReportForm({...reportForm, type})}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                            reportForm.type === type 
                            ? 'bg-red-50 border-red-500 text-red-700' 
                            : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição do Defeito *</label>
                    <textarea
                      required
                      value={reportForm.description}
                      onChange={e => setReportForm({...reportForm, description: e.target.value})}
                      placeholder="Descreva detalhadamente o que está acontecendo..."
                      className="w-full border border-slate-300 p-3 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all h-40"
                    ></textarea>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex gap-3">
                    <span className="text-yellow-600 text-xl">💡</span>
                    <p className="text-xs text-yellow-800 leading-relaxed">
                      <strong>Dica:</strong> Seja específico. Informe se o problema ocorre em movimento, parado, ou em situações específicas (ex: chuva, subida).
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={reportLoading}
                    className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-red-200 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {reportLoading ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : 'Enviar Reporte para Manutenção'}
                  </button>
                </form>
              </div>
            </div>
        )}

        {/* MODAL DETALHES VIAGEM (SELECIONADA) */}
        {selectedBooking && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={() => setSelectedBooking(null)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in relative z-[101]" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                        <h3 className="font-bold text-lg">Detalhes da Viagem</h3>
                        <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-white font-bold text-xl">&times;</button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-4 mb-2">
                            <div className="bg-blue-100 p-3 rounded-lg"><span className="text-2xl">🚌</span></div>
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
                                <p className="text-sm font-semibold text-slate-800">{new Date(selectedBooking.startTime).toLocaleString('pt-BR')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Retorno</p>
                                <p className="text-sm font-semibold text-slate-800">{new Date(selectedBooking.endTime).toLocaleString('pt-BR')}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Local de Apresentação</p>
                                <p className="text-sm text-slate-800">{selectedBooking.departureLocation || 'Garagem'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Cliente</p>
                                    <p className="text-sm font-medium">{selectedBooking.clientName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Telefone Cliente</p>
                                    <p className="text-sm font-medium text-blue-600">{selectedBooking.clientPhone || 'N/A'}</p>
                                </div>
                            </div>
                            {selectedBooking.observations && (
                                <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                                    <p className="text-xs text-yellow-700 font-bold uppercase mb-1">Observações / Instruções</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedBooking.observations}</p>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setSelectedBooking(null)} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 mt-2">Fechar Detalhes</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DriverPortal;
