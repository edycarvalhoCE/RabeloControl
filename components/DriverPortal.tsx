
import React, { useState } from 'react';
import { useStore } from '../services/store';
import CalendarView from './CalendarView';
import { Booking, UserRole } from '../types';
import { Logo } from './Logo';

const DriverPortal: React.FC = () => {
  const { currentUser, bookings, timeOffs, addTimeOff, documents, buses, addMaintenanceReport, maintenanceReports, addFuelRecord, driverLiabilities, charterContracts, driverFees, fuelRecords, users } = useStore();
  
  const isAux = currentUser.role === UserRole.GARAGE_AUX;

  const [requestType, setRequestType] = useState<'FOLGA' | 'FERIAS'>('FOLGA');
  const [requestDate, setRequestDate] = useState('');
  const [requestEndDate, setRequestEndDate] = useState('');

  const [activeTab, setActiveTab] = useState<'schedule' | 'documents' | 'requests' | 'report' | 'fuel' | 'finance'>('schedule');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [feeStartDate, setFeeStartDate] = useState('');
  const [feeEndDate, setFeeEndDate] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const getTodayLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [reportForm, setReportForm] = useState({ busId: '', type: 'MECANICA', description: '', date: getTodayLocal() });

  const [fuelForm, setFuelForm] = useState({
      date: getTodayLocal(),
      busId: '',
      dieselLiters: 0,
      hasArla: false,
      arlaLiters: 0,
      location: 'STREET' as 'GARAGE' | 'STREET',
      cost: 0,
      arlaCost: 0,
      stationName: '',
      kmStart: 0,
      kmEnd: 0
  });

  // Force Reload Function
  const forceUpdate = () => {
      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(let registration of registrations) {
                  registration.unregister();
              }
          });
      }
      window.location.reload();
  };

  const scheduleFilter = (b: Booking) => {
      if (b.status === 'CANCELLED') return false;
      if (isAux) return true;
      return b.driverId === currentUser.id;
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
                      sortTime: new Date(`${dStr}T${c.morningDeparture}`).getTime()
                  });
              }
          });
      }
  }

  const combinedSchedule = [...myRegularBookings, ...myCharterOccurrences].sort((a, b) => a.sortTime - b.sortTime);

  const myTimeOffs = timeOffs.filter(t => t.driverId === currentUser.id);
  const myDocuments = documents.filter(d => d.driverId === currentUser.id);
  const myReports = maintenanceReports.filter(r => r.driverId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const myLiabilities = driverLiabilities.filter(l => l.driverId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const myFees = driverFees.filter(f => f.driverId === currentUser.id);
  const filteredFees = myFees.filter(f => {
      if (feeStartDate && f.date < feeStartDate) return false;
      if (feeEndDate && f.date > feeEndDate) return false;
      return true;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPendingInPeriod = filteredFees.filter(f => f.status === 'PENDING').reduce((acc, f) => acc + f.amount, 0);

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestDate) {
        addTimeOff({
            driverId: currentUser.id,
            date: requestDate,
            endDate: requestType === 'FERIAS' ? requestEndDate : undefined,
            type: requestType
        });
        setRequestDate('');
        setRequestEndDate('');
        alert('Solicitação enviada!');
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(reportForm.busId && reportForm.description) {
          addMaintenanceReport({
              ...reportForm,
              driverId: currentUser.id
          });
          alert('Problema reportado ao mecânico!');
          setReportForm({ ...reportForm, description: '', busId: '' });
      }
  };

  const handleBusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedBusId = e.target.value;
      let lastKm = 0;

      if (selectedBusId) {
          const busRecords = fuelRecords.filter(r => r.busId === selectedBusId);
          if (busRecords.length > 0) {
              busRecords.sort((a, b) => (b.kmEnd || 0) - (a.kmEnd || 0));
              lastKm = busRecords[0].kmEnd || 0;
          }
      }

      setFuelForm(prev => ({
          ...prev,
          busId: selectedBusId,
          kmStart: lastKm,
          kmEnd: 0
      }));
  };

  const handleFuelSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!fuelForm.busId || fuelForm.dieselLiters <= 0) {
          alert('Por favor, selecione o ônibus e informe a quantidade de Diesel.');
          return;
      }

      if (fuelForm.hasArla && (fuelForm.arlaLiters <= 0 || isNaN(fuelForm.arlaLiters))) {
          alert('⚠️ Atenção: Você marcou que abasteceu Arla.\nÉ obrigatório informar a quantidade de litros de Arla.');
          return;
      }

      if (fuelForm.kmEnd <= fuelForm.kmStart) {
          alert("⚠️ Erro de Quilometragem: O KM Final deve ser MAIOR que o KM Inicial.");
          return;
      }

      const distance = fuelForm.kmEnd - fuelForm.kmStart;
      const average = distance / fuelForm.dieselLiters;
      const totalCost = fuelForm.location === 'STREET' ? (fuelForm.cost + (fuelForm.hasArla ? fuelForm.arlaCost : 0)) : 0;

      addFuelRecord({
          ...fuelForm,
          arlaLiters: fuelForm.hasArla ? fuelForm.arlaLiters : 0,
          cost: totalCost,
          arlaCost: fuelForm.hasArla && fuelForm.location === 'STREET' ? fuelForm.arlaCost : 0,
          stationName: fuelForm.location === 'STREET' ? fuelForm.stationName : '',
          loggedBy: currentUser.id,
          kmStart: fuelForm.kmStart,
          kmEnd: fuelForm.kmEnd,
          averageConsumption: average
      });
      
      alert(`Abastecimento registrado!\nMédia calculada: ${average.toFixed(2)} km/L`);
      setFuelForm({
        date: getTodayLocal(),
        busId: '',
        dieselLiters: 0,
        hasArla: false,
        arlaLiters: 0,
        location: 'STREET',
        cost: 0,
        arlaCost: 0,
        stationName: '',
        kmStart: 0,
        kmEnd: 0
      });
  };

  const handleBookingClick = (booking: Booking) => {
      setSelectedBooking(booking);
  };

  const formatDateString = (dateStr: string) => {
      if(!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
  };

  const formatDateTime = (isoString: string) => {
      if (!isoString) return 'N/A';
      try {
          const d = new Date(isoString);
          return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch (e) { return isoString; }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'APPROVED': return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Aprovado</span>;
        case 'REJECTED': return <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">Rejeitado</span>;
        case 'RESOLVED': return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Resolvido</span>;
        case 'IN_PROGRESS': return <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">Em Análise</span>;
        default: return <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700">Pendente</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-32 md:pb-0">
      
      {/* BOTÃO DE EMERGÊNCIA PARA LIMPAR CACHE - VISÍVEL APENAS NO MOBILE */}
      <button 
        onClick={forceUpdate}
        className="md:hidden w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2 mb-4 animate-pulse"
      >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          ↻ CLIQUE AQUI PARA ATUALIZAR O APP
      </button>

      {/* HEADER: Hidden on Mobile */}
      <div className="hidden md:flex justify-between items-center bg-gradient-to-r from-blue-700 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="z-10 relative">
          <h1 className="text-3xl font-bold mb-2">Portal {isAux ? 'da Garagem' : 'do Motorista'}</h1>
          <p className="opacity-80">Bem-vindo, {currentUser.name}. {isAux ? 'Acompanhe a escala da frota.' : 'Gerencie sua escala e documentos.'}</p>
        </div>
        <div className="hidden md:block bg-white/10 p-2 rounded-lg z-10 relative backdrop-blur-sm">
             <Logo variant="light" size="sm" showGlobe={false} />
        </div>
      </div>

      {/* DESKTOP TABS (Hidden on Mobile) */}
      <div className="hidden md:flex border-b border-slate-300 space-x-4 overflow-x-auto">
        <button onClick={() => setActiveTab('schedule')} className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>📅 {isAux ? 'Escala Geral' : 'Minha Escala'}</button>
        {!isAux && <button onClick={() => setActiveTab('fuel')} className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'fuel' ? 'border-b-2 border-green-600 text-green-600' : 'text-slate-500 hover:text-slate-700'}`}>⛽ Abastecer</button>}
        {!isAux && <button onClick={() => setActiveTab('finance')} className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'finance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>💰 Diárias e Descontos</button>}
        <button onClick={() => setActiveTab('documents')} className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'documents' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>📂 Documentos</button>
        <button onClick={() => setActiveTab('requests')} className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'requests' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>📝 Folgas</button>
        <button onClick={() => setActiveTab('report')} className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'report' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-700'}`}>⚠️ Reportar Defeito</button>
      </div>

      <div className="mt-4">
        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                     {/* Calendar View - Explicitly visible on mobile with z-index checks */}
                     <div className="block w-full mb-4 relative z-0">
                        <CalendarView onEventClick={handleBookingClick} />
                     </div>
                </div>
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-2 md:px-0">
                        <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-sm">🚌</span>
                        {isAux ? 'Escala Geral' : 'Minha Escala'}
                    </h2>
                    <div className="space-y-3 max-h-[75vh] md:max-h-[600px] overflow-y-auto px-2 md:px-0 pb-20 md:pb-0">
                        {combinedSchedule.length === 0 ? (
                            <p className="text-slate-500 italic text-center mt-10">Nenhuma viagem agendada para os próximos 15 dias.</p>
                        ) : (
                            combinedSchedule.slice(0, 15).map((booking: any) => {
                                const bus = buses.find(b => b.id === booking.busId);
                                return (
                                    <div 
                                        key={booking.id} 
                                        onClick={() => handleBookingClick(booking)}
                                        className={`p-4 rounded-xl shadow-sm border cursor-pointer active:scale-95 transition-all relative overflow-hidden ${
                                            booking.isCharter 
                                            ? 'bg-orange-50 border-orange-200 border-l-4 border-l-orange-500' 
                                            : 'bg-white border-slate-200 border-l-4 border-l-blue-600'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-base text-slate-900">{booking.destination}</h3>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${booking.isCharter ? 'bg-orange-200 text-orange-900' : 'bg-blue-100 text-blue-800'}`}>
                                                {booking.isCharter ? 'FRETAMENTO' : 'LOCAÇÃO'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-700 space-y-1">
                                            {isAux && (
                                                <p className="font-bold text-slate-800 bg-slate-200 p-1 rounded inline-block mb-1 text-xs">
                                                    {bus?.plate} - {bus?.model}
                                                </p>
                                            )}
                                            <p className="font-semibold flex items-center gap-2">
                                                <span>📅 {new Date(booking.startTime).toLocaleDateString()}</span>
                                                <span>⏰ {new Date(booking.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </p>
                                            {!booking.isCharter && <p className="text-xs text-slate-500">Retorno: {new Date(booking.endTime).toLocaleDateString()}</p>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* FUEL TAB */}
        {activeTab === 'fuel' && !isAux && (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span className="bg-green-100 text-green-600 p-2 rounded-lg">⛽</span>
                    Registrar Abastecimento
                </h2>
                
                <form onSubmit={handleFuelSubmit} className="space-y-5">
                    {/* Location Toggle */}
                    <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-lg mb-4">
                          <button
                            type="button"
                            onClick={() => setFuelForm({...fuelForm, location: 'GARAGE'})}
                            className={`py-3 text-sm font-bold rounded-md transition-all ${fuelForm.location === 'GARAGE' ? 'bg-white shadow-md text-blue-700 ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                              🏢 Na Garagem
                          </button>
                          <button
                            type="button"
                            onClick={() => setFuelForm({...fuelForm, location: 'STREET'})}
                            className={`py-3 text-sm font-bold rounded-md transition-all ${fuelForm.location === 'STREET' ? 'bg-white shadow-md text-orange-600 ring-1 ring-orange-100' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                              🛣️ Na Rua (Posto)
                          </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Veículo</label>
                            <select 
                                required value={fuelForm.busId}
                                onChange={handleBusChange} 
                                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-slate-50"
                            >
                                <option value="">Selecione o ônibus...</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input 
                                type="date" required 
                                value={fuelForm.date} onChange={e => setFuelForm({...fuelForm, date: e.target.value})}
                                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-slate-50"
                            />
                        </div>
                    </div>

                    {/* KM CONTROL FIELDS */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-100 rounded-lg border border-slate-200">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">KM Inicial</label>
                            <input 
                                type="number" min="0" required
                                value={fuelForm.kmStart || ''}
                                onChange={e => setFuelForm({...fuelForm, kmStart: parseInt(e.target.value)})}
                                className="w-full border p-2 rounded text-sm text-center font-bold text-slate-600"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">KM Final (Atual)</label>
                            <input 
                                type="number" min="0" required
                                value={fuelForm.kmEnd || ''}
                                onChange={e => setFuelForm({...fuelForm, kmEnd: parseInt(e.target.value)})}
                                className="w-full border p-2 rounded text-sm text-center font-bold text-slate-800"
                                placeholder="0"
                            />
                        </div>
                        {fuelForm.kmEnd > fuelForm.kmStart && (
                            <div className="col-span-2 text-center text-xs text-slate-500">
                                Rodado: <strong>{fuelForm.kmEnd - fuelForm.kmStart} km</strong>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="block text-sm font-bold text-slate-800 mb-2">Quantidade Diesel (Litros)</label>
                        <input 
                            type="number" step="0.1" min="0" required
                            value={fuelForm.dieselLiters || ''} 
                            onChange={e => setFuelForm({...fuelForm, dieselLiters: parseFloat(e.target.value)})}
                            className="w-full border p-3 rounded-lg text-lg font-bold outline-none"
                            placeholder="0.0 L"
                        />
                    </div>

                    {fuelForm.location === 'STREET' && (
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-3 animate-fade-in">
                            <h4 className="text-sm font-bold text-orange-800 uppercase tracking-wide">Detalhes do Posto</h4>
                            <div>
                                <label className="block text-xs font-bold text-orange-700 mb-1">
                                    {fuelForm.hasArla ? 'Valor Diesel (R$)' : 'Valor Pago (R$)'}
                                </label>
                                <input 
                                type="number" step="0.01"
                                value={fuelForm.cost || ''} onChange={e => setFuelForm({...fuelForm, cost: parseFloat(e.target.value)})}
                                className="w-full border border-orange-200 p-2 rounded text-sm" placeholder="0.00"
                                />
                            </div>

                            {fuelForm.hasArla && (
                                <div>
                                    <label className="block text-xs font-bold text-blue-800 mb-1">
                                        Valor Arla (R$)
                                    </label>
                                    <input 
                                    type="number" step="0.01"
                                    value={fuelForm.arlaCost || ''} onChange={e => setFuelForm({...fuelForm, arlaCost: parseFloat(e.target.value)})}
                                    className="w-full border border-blue-300 p-2 rounded text-sm text-blue-900 font-bold" placeholder="0.00"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-orange-700 mb-1">Nome do Posto</label>
                                <input 
                                value={fuelForm.stationName} onChange={e => setFuelForm({...fuelForm, stationName: e.target.value})}
                                className="w-full border border-orange-200 p-2 rounded text-sm" placeholder="Ex: Posto Shell"
                                />
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 transition-all">
                        <label className="flex items-center justify-between cursor-pointer select-none">
                            <span className="font-bold text-blue-800 text-sm">Abasteceu Arla 32?</span>
                            <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${fuelForm.hasArla ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={fuelForm.hasArla}
                                    onChange={e => setFuelForm({...fuelForm, hasArla: e.target.checked})}
                                />
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${fuelForm.hasArla ? 'translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                        
                        {fuelForm.hasArla && (
                            <div className="mt-4 animate-fade-in">
                                <label className="block text-xs font-bold text-blue-700 mb-1 uppercase">Quantidade Obrigatória (Litros)</label>
                                <div className="flex items-center border-2 border-blue-200 rounded-lg overflow-hidden bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                                    <input 
                                        type="number" step="0.1" min="0" required
                                        value={fuelForm.arlaLiters || ''} 
                                        onChange={e => setFuelForm({...fuelForm, arlaLiters: parseFloat(e.target.value)})}
                                        className="w-full p-2 outline-none text-blue-900 font-bold text-lg"
                                        placeholder="0.0"
                                    />
                                    <span className="bg-blue-100 text-blue-700 px-4 py-3 font-bold border-l border-blue-200 text-sm">L</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 shadow-lg transform active:scale-95 transition-all">
                        Confirmar Abastecimento
                    </button>
                </form>
            </div>
        )}

        {/* FINANCE / LIABILITIES TAB */}
        {activeTab === 'finance' && !isAux && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 p-1.5 rounded text-sm">💰</span>
                        Diárias a Receber
                    </h3>
                    
                    <div className="flex gap-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500">De</label>
                            <input 
                                type="date" 
                                value={feeStartDate} 
                                onChange={e => setFeeStartDate(e.target.value)}
                                className="w-full border p-1 rounded text-sm bg-white"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500">Até</label>
                            <input 
                                type="date" 
                                value={feeEndDate} 
                                onChange={e => setFeeEndDate(e.target.value)}
                                className="w-full border p-1 rounded text-sm bg-white"
                            />
                        </div>
                        {(feeStartDate || feeEndDate) && (
                            <button 
                                onClick={() => { setFeeStartDate(''); setFeeEndDate(''); }}
                                className="self-end mb-1 text-xs text-red-500 hover:underline font-medium"
                            >
                                Limpar
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
                        <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                            <span className="text-sm font-bold text-blue-900">Total Pendente</span>
                            <span className="text-lg font-bold text-blue-700">
                                R$ {totalPendingInPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                            {filteredFees.length === 0 ? (
                                <p className="p-6 text-center text-slate-500 text-sm">Nenhuma diária encontrada para o período.</p>
                            ) : (
                                filteredFees.map(fee => (
                                    <div key={fee.id} className="p-4 hover:bg-slate-50">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-800">{fee.description}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${fee.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {fee.status === 'PAID' ? 'PAGO' : 'PENDENTE'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>{formatDateString(fee.date)}</span>
                                            <span className="font-bold">R$ {fee.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        {fee.paymentDate && (
                                            <p className="text-xs text-green-600 mt-1 text-right">Recebido em: {formatDateString(fee.paymentDate)}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="bg-red-100 text-red-700 p-1.5 rounded text-sm">📉</span>
                        Débitos (Avarias/Multas)
                    </h3>
                    <div className="space-y-4">
                        {myLiabilities.length === 0 ? (
                            <div className="p-10 bg-white rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-500">
                                <p>Nenhuma pendência registrada em seu nome.</p>
                            </div>
                        ) : (
                            myLiabilities.map(liability => {
                                const progress = (liability.paidAmount / liability.totalAmount) * 100;
                                return (
                                    <div key={liability.id} className="bg-white p-5 rounded-xl shadow-sm border border-red-100 flex flex-col justify-between relative overflow-hidden">
                                        {liability.status === 'PAID' && (
                                            <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">QUITADO</div>
                                        )}
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${liability.type === 'AVARIA' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                    {liability.type}
                                                </span>
                                                <span className="text-sm text-slate-500">{formatDateString(liability.date)}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 mb-1">{liability.description}</h4>
                                            <p className="text-2xl font-bold text-red-600 mb-2">
                                                R$ {liability.totalAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                <span>Pago: R$ {liability.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                                <span>{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                                                <div className="bg-green-500 h-2.5 rounded-full" style={{width: `${progress}%`}}></div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded border border-slate-200 mt-2">
                                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Plano de Pagamento</p>
                                            <div className="flex justify-between items-center text-sm">
                                                <span>Desconto em Folha:</span>
                                                <span className="font-bold">{liability.installments}x</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm mt-1">
                                                <span>Valor Parcela:</span>
                                                <span className="font-bold">R$ {(liability.totalAmount / liability.installments).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Meus Documentos</h3>
                {myDocuments.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-10">Nenhum documento arquivado.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myDocuments.map(doc => (
                            <div key={doc.id} className="border p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-700">{doc.title}</p>
                                    <p className="text-xs text-slate-500">{new Date(doc.uploadDate).toLocaleDateString()}</p>
                                </div>
                                <a 
                                    href={doc.fileContent} 
                                    download={doc.fileName}
                                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold hover:bg-blue-200"
                                >
                                    Baixar
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">Solicitar Folga / Férias</h3>
                    <form onSubmit={handleRequest} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                            <select 
                                value={requestType} 
                                onChange={(e) => setRequestType(e.target.value as any)}
                                className="w-full border p-2 rounded"
                            >
                                <option value="FOLGA">Folga</option>
                                <option value="FERIAS">Férias</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                            <input 
                                type="date" required 
                                value={requestDate} 
                                onChange={(e) => setRequestDate(e.target.value)}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        {requestType === 'FERIAS' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
                                <input 
                                    type="date" required 
                                    value={requestEndDate} 
                                    onChange={(e) => setRequestEndDate(e.target.value)}
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                        )}
                        <button type="submit" className="w-full bg-slate-800 text-white font-bold py-2 rounded hover:bg-slate-700">
                            Enviar Solicitação
                        </button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">Minhas Solicitações</h3>
                    <div className="space-y-3">
                        {myTimeOffs.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-4">Nenhuma solicitação.</p>
                        ) : (
                            myTimeOffs.map(req => (
                                <div key={req.id} className="border p-3 rounded-lg flex justify-between items-center">
                                    <div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${req.type === 'FERIAS' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {req.type}
                                        </span>
                                        <p className="text-sm font-medium mt-1">
                                            {formatDateString(req.date)}
                                            {req.endDate && ` até ${formatDateString(req.endDate)}`}
                                        </p>
                                    </div>
                                    <div>
                                        {getStatusBadge(req.status)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* REPORT TAB */}
        {activeTab === 'report' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">Reportar Problema no Veículo</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Encontrou algo errado durante a limpeza ou vistoria? Relate aqui.
                    </p>
                    <form onSubmit={handleReportSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Veículo</label>
                            <select 
                                required 
                                value={reportForm.busId} 
                                onChange={(e) => setReportForm({...reportForm, busId: e.target.value})}
                                className="w-full border p-2 rounded"
                            >
                                <option value="">Selecione...</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Problema</label>
                            <textarea 
                                required 
                                value={reportForm.description} 
                                onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                                className="w-full border p-2 rounded h-24"
                                placeholder="Ex: Banco rasgado, chiclete no chão, luz queimada..."
                            />
                        </div>
                        <button type="submit" className="w-full bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">
                            Reportar Defeito
                        </button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">Meus Reportes</h3>
                    <div className="space-y-3">
                        {myReports.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-4">Nenhum reporte recente.</p>
                        ) : (
                            myReports.map(rep => {
                                const bus = buses.find(b => b.id === rep.busId);
                                return (
                                    <div key={rep.id} className="border p-3 rounded-lg">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-bold text-slate-700">{bus?.plate}</span>
                                            {getStatusBadge(rep.status)}
                                        </div>
                                        <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{rep.description}</p>
                                        <p className="text-xs text-slate-400 mt-2 text-right">{new Date(rep.date).toLocaleDateString()}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>

      {/* MOBILE BOTTOM NAVIGATION - FORCED TO BE VISIBLE AND FIXED - Z-INDEX 9999 */}
      <div className="md:hidden !fixed !bottom-0 !left-0 !right-0 bg-white border-t border-slate-200 z-[9999] pb-safe h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex justify-around items-center">
          <button 
              onClick={() => { setActiveTab('schedule'); setShowMoreMenu(false); }}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-400'}`}
          >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-[10px] font-bold">Escala</span>
          </button>
          
          {!isAux && (
              <button 
                  onClick={() => { setActiveTab('fuel'); setShowMoreMenu(false); }}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'fuel' ? 'text-green-600' : 'text-slate-400'}`}
              >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  <span className="text-[10px] font-bold">Abastecer</span>
              </button>
          )}

          <button 
              onClick={() => { setActiveTab('report'); setShowMoreMenu(false); }}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'report' ? 'text-red-600' : 'text-slate-400'}`}
          >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span className="text-[10px] font-bold">Defeito</span>
          </button>

          <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${showMoreMenu ? 'text-slate-800' : 'text-slate-400'}`}
          >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
              <span className="text-[10px] font-bold">Mais</span>
          </button>
      </div>

      {/* MOBILE MORE MENU (DRAWER) */}
      {showMoreMenu && (
          <div className="md:hidden fixed inset-0 z-[9998] bg-black/50" onClick={() => setShowMoreMenu(false)}>
              <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-xl overflow-hidden p-4 space-y-2 animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
                  <button 
                      onClick={() => { setActiveTab('documents'); setShowMoreMenu(false); }}
                      className="w-full text-left p-3 rounded-lg hover:bg-slate-50 flex items-center gap-3 text-slate-700 font-medium"
                  >
                      <span className="bg-blue-100 p-2 rounded text-blue-600">📂</span> Meus Documentos
                  </button>
                  <button 
                      onClick={() => { setActiveTab('requests'); setShowMoreMenu(false); }}
                      className="w-full text-left p-3 rounded-lg hover:bg-slate-50 flex items-center gap-3 text-slate-700 font-medium"
                  >
                      <span className="bg-purple-100 p-2 rounded text-purple-600">📝</span> Folgas e Férias
                  </button>
                  {!isAux && (
                      <button 
                          onClick={() => { setActiveTab('finance'); setShowMoreMenu(false); }}
                          className="w-full text-left p-3 rounded-lg hover:bg-slate-50 flex items-center gap-3 text-slate-700 font-medium"
                      >
                          <span className="bg-green-100 p-2 rounded text-green-600">💰</span> Diárias e Finanças
                      </button>
                  )}
                  <div className="border-t border-slate-100 my-2"></div>
                  <button 
                      onClick={() => setShowMoreMenu(false)}
                      className="w-full text-center p-3 text-slate-500 font-bold"
                  >
                      Fechar
                  </button>
              </div>
          </div>
      )}

      {/* TRIP DETAILS MODAL - For Cards Click */}
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
    </div>
  );
};

export default DriverPortal;
