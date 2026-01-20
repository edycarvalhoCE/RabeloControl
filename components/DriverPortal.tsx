
import React, { useState } from 'react';
import { useStore } from '../services/store';
import CalendarView from './CalendarView';
import { Booking } from '../types';
import { Logo } from './Logo';

const DriverPortal: React.FC = () => {
  const { currentUser, bookings, timeOffs, addTimeOff, documents, buses, addMaintenanceReport, maintenanceReports, addFuelRecord, driverLiabilities, charterContracts } = useStore();
  
  // Request State
  const [requestType, setRequestType] = useState<'FOLGA' | 'FERIAS'>('FOLGA');
  const [requestDate, setRequestDate] = useState('');
  const [requestEndDate, setRequestEndDate] = useState('');

  const [activeTab, setActiveTab] = useState<'schedule' | 'documents' | 'requests' | 'report' | 'fuel' | 'finance'>('schedule');

  // Trip Details Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Maintenance Report State
  const [reportForm, setReportForm] = useState({ busId: '', type: 'MECANICA', description: '', date: new Date().toISOString().split('T')[0] });

  // Fuel Form State
  const [fuelForm, setFuelForm] = useState({
      date: new Date().toISOString().split('T')[0],
      busId: '',
      dieselLiters: 0,
      hasArla: false,
      arlaLiters: 0,
      location: 'STREET' as 'GARAGE' | 'STREET',
      cost: 0,
      stationName: '',
      kmStart: 0,
      kmEnd: 0
  });

  // --- LOGIC TO MERGE BOOKINGS AND CHARTER SCHEDULE ---
  
  // 1. Regular Bookings
  const myRegularBookings = bookings
    .filter(b => b.driverId === currentUser.id && b.status !== 'CANCELLED')
    .map(b => ({ ...b, isCharter: false, sortTime: new Date(b.startTime).getTime() }));

  // 2. Generate Charter Occurrences for next 15 days
  const myCharterOccurrences: any[] = [];
  const myContracts = charterContracts.filter(c => c.driverId === currentUser.id && c.status === 'ACTIVE');
  
  if (myContracts.length > 0) {
      const today = new Date();
      today.setHours(0,0,0,0);

      // Look ahead 15 days
      for (let i = 0; i < 15; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          const dStr = d.toISOString().split('T')[0];
          const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon...

          myContracts.forEach(c => {
              // Check range and weekday
              if (dStr >= c.startDate && dStr <= c.endDate && c.weekDays.includes(dayOfWeek)) {
                  // Create a fake booking object for display
                  myCharterOccurrences.push({
                      id: `${c.id}_${dStr}`, // Unique temp ID
                      destination: `${c.clientName} (Fretamento)`, // Display Route/Client
                      clientName: c.clientName,
                      startTime: `${dStr}T${c.morningDeparture}`,
                      endTime: `${dStr}T${c.afternoonDeparture}`,
                      busId: c.busId,
                      driverId: currentUser.id,
                      status: 'CONFIRMED',
                      isCharter: true,
                      observations: `Rota: ${c.route}`,
                      sortTime: new Date(`${dStr}T${c.morningDeparture}`).getTime()
                  });
              }
          });
      }
  }

  // 3. Merge and Sort
  const combinedSchedule = [...myRegularBookings, ...myCharterOccurrences].sort((a, b) => a.sortTime - b.sortTime);

  const myTimeOffs = timeOffs.filter(t => t.driverId === currentUser.id);
  const myDocuments = documents.filter(d => d.driverId === currentUser.id);
  const myReports = maintenanceReports.filter(r => r.driverId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const myLiabilities = driverLiabilities.filter(l => l.driverId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- EARNINGS CALCULATION ---
  const myCompletedTrips = bookings.filter(b => b.driverId === currentUser.id && b.status === 'COMPLETED');
  const myTripsWithPay = myCompletedTrips.map(trip => {
      const start = new Date(trip.startTime);
      const end = new Date(trip.endTime);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 
      return { ...trip, days: diffDays, earnings: diffDays * (currentUser.dailyRate || 0) };
  });
  const totalEarnings = myTripsWithPay.reduce((acc, t) => acc + t.earnings, 0);

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

  const handleFuelSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!fuelForm.busId || fuelForm.dieselLiters <= 0) {
          alert('Preencha os dados de veículo e diesel corretamente.');
          return;
      }
      if (fuelForm.kmStart <= 0 || fuelForm.kmEnd <= 0) {
          alert("É obrigatório informar a KM Inicial e Final.");
          return;
      }
      if (fuelForm.kmEnd <= fuelForm.kmStart) {
          alert("KM Final deve ser maior que KM Inicial.");
          return;
      }
      if (fuelForm.hasArla && fuelForm.arlaLiters <= 0) {
          alert("Informe a quantidade de litros de Arla.");
          return;
      }
      
      addFuelRecord({
          ...fuelForm,
          cost: fuelForm.location === 'STREET' ? fuelForm.cost : 0,
          stationName: fuelForm.location === 'STREET' ? fuelForm.stationName : '',
          loggedBy: currentUser.id,
          kmStart: fuelForm.kmStart,
          kmEnd: fuelForm.kmEnd
      });
      
      alert('Abastecimento registrado!');
      setFuelForm({
        date: new Date().toISOString().split('T')[0],
        busId: '',
        dieselLiters: 0,
        hasArla: false,
        arlaLiters: 0,
        location: 'STREET',
        cost: 0,
        stationName: '',
        kmStart: 0,
        kmEnd: 0
      });
  };

  const handleBookingClick = (booking: Booking) => {
      setSelectedBooking(booking);
  };

  // HELPER: Format date string YYYY-MM-DD to DD/MM/YYYY manually to avoid timezone bugs
  const formatDateString = (dateStr: string) => {
      if(!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
  };

  // Helper for DateTime display
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
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-gradient-to-r from-blue-700 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="z-10 relative">
          <h1 className="text-3xl font-bold mb-2">Portal do Motorista</h1>
          <p className="opacity-80">Bem-vindo, {currentUser.name}. Gerencie sua escala e documentos.</p>
        </div>
        <div className="hidden md:block bg-white/10 p-2 rounded-lg z-10 relative backdrop-blur-sm">
             <Logo variant="light" size="sm" showGlobe={false} />
        </div>
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 opacity-20 rounded-full -ml-8 -mb-8"></div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-300 space-x-4 overflow-x-auto">
        <button 
            onClick={() => setActiveTab('schedule')}
            className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
            📅 Minha Escala
        </button>
        <button 
            onClick={() => setActiveTab('fuel')}
            className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'fuel' ? 'border-b-2 border-green-600 text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
            ⛽ Abastecer
        </button>
        <button 
            onClick={() => setActiveTab('finance')}
            className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'finance' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
            💸 Financeiro (Diárias/Multas)
        </button>
        <button 
            onClick={() => setActiveTab('documents')}
            className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'documents' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
            📂 Meus Documentos
        </button>
        <button 
            onClick={() => setActiveTab('requests')}
            className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'requests' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
            📝 Folgas e Férias
        </button>
        <button 
            onClick={() => setActiveTab('report')}
            className={`pb-2 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'report' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
            ⚠️ Reportar Defeito
        </button>
      </div>

      <div className="mt-6">
        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                     <CalendarView onEventClick={handleBookingClick} />
                </div>
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-sm">🚌</span>
                        Próximas Viagens e Fretamentos
                    </h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {combinedSchedule.length === 0 ? (
                            <p className="text-slate-500 italic">Nenhuma viagem agendada para os próximos 15 dias.</p>
                        ) : (
                            combinedSchedule.slice(0, 10).map((booking: any) => (
                                <div 
                                    key={booking.id} 
                                    onClick={() => handleBookingClick(booking)}
                                    className={`p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden ${
                                        booking.isCharter 
                                        ? 'bg-orange-50 border-orange-200 border-l-4 border-l-orange-500' 
                                        : 'bg-white border-slate-200 border-l-4 border-l-blue-500'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-base text-slate-800">{booking.destination}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${booking.isCharter ? 'bg-orange-200 text-orange-800' : 'bg-blue-100 text-blue-600'}`}>
                                            {booking.isCharter ? 'FRETAMENTO' : 'LOCAÇÃO'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-600 space-y-1">
                                        <p className="font-semibold">📅 {new Date(booking.startTime).toLocaleDateString()} • {new Date(booking.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                        {!booking.isCharter && <p>🏁 Retorno: {new Date(booking.endTime).toLocaleDateString()}</p>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* FUEL TAB */}
        {activeTab === 'fuel' && (
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
                                onChange={e => setFuelForm({...fuelForm, busId: e.target.value})}
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

                    {/* KM Fields */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1">KM Inicial *</label>
                            <input 
                                type="number" min="0" required
                                value={fuelForm.kmStart || ''} 
                                onChange={e => setFuelForm({...fuelForm, kmStart: parseInt(e.target.value)})}
                                className="w-full border p-2 rounded-lg outline-none text-lg font-semibold"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1">KM Final *</label>
                            <input 
                                type="number" min="0" required
                                value={fuelForm.kmEnd || ''} 
                                onChange={e => setFuelForm({...fuelForm, kmEnd: parseInt(e.target.value)})}
                                className="w-full border p-2 rounded-lg outline-none text-lg font-semibold"
                                placeholder="0"
                            />
                        </div>
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
                                <label className="block text-xs font-bold text-orange-700 mb-1">Valor Pago (R$)</label>
                                <input 
                                type="number" step="0.01"
                                value={fuelForm.cost || ''} onChange={e => setFuelForm({...fuelForm, cost: parseFloat(e.target.value)})}
                                className="w-full border border-orange-200 p-2 rounded text-sm" placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-orange-700 mb-1">Nome do Posto</label>
                                <input 
                                value={fuelForm.stationName} onChange={e => setFuelForm({...fuelForm, stationName: e.target.value})}
                                className="w-full border border-orange-200 p-2 rounded text-sm" placeholder="Ex: Posto Shell"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                        <input 
                            type="checkbox" 
                            id="driverHasArla"
                            checked={fuelForm.hasArla}
                            onChange={e => setFuelForm({...fuelForm, hasArla: e.target.checked})}
                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                        />
                        <label htmlFor="driverHasArla" className="text-sm font-medium text-slate-700">Abasteceu Arla 32 também?</label>
                    </div>

                    {fuelForm.hasArla && (
                        <div className="animate-fade-in pl-8">
                             <label className="block text-xs font-bold text-slate-600 mb-1">Qtd. Arla (Litros) *</label>
                             <input 
                                type="number" step="0.1" min="0" required={fuelForm.hasArla}
                                value={fuelForm.arlaLiters || ''} 
                                onChange={e => setFuelForm({...fuelForm, arlaLiters: parseFloat(e.target.value)})}
                                className="w-full border p-2 rounded outline-none"
                                placeholder="0.0 L"
                            />
                        </div>
                    )}

                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 shadow-lg transform active:scale-95 transition-all">
                        Confirmar Abastecimento
                    </button>
                </form>
            </div>
        )}

        {/* FINANCE / LIABILITIES TAB */}
        {activeTab === 'finance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* MY EARNINGS SECTION (NEW) */}
                <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-sm">
                        <h3 className="font-bold text-emerald-800 text-lg mb-1">Minhas Diárias (Estimado)</h3>
                        <p className="text-sm text-emerald-600 mb-3">Valor da Diária Cadastrado: <strong>R$ {currentUser.dailyRate?.toLocaleString('pt-BR') || '0,00'}</strong></p>
                        <p className="text-3xl font-bold text-emerald-700 mb-4">
                            R$ {totalEarnings.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                        <p className="text-xs text-slate-500 italic">
                            *Cálculo baseado apenas em viagens marcadas como 'CONCLUÍDAS' no sistema. O pagamento real depende do fechamento do caixa da empresa.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h4 className="font-bold text-slate-700 text-sm uppercase">Detalhamento de Viagens</h4>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {myTripsWithPay.length === 0 ? (
                                <p className="p-4 text-center text-slate-400 text-sm">Nenhuma viagem concluída contabilizada.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {myTripsWithPay.map(trip => (
                                        <li key={trip.id} className="p-3 hover:bg-slate-50">
                                            <div className="flex justify-between font-medium text-slate-800 text-sm">
                                                <span>{trip.destination}</span>
                                                <span className="text-emerald-600">R$ {trip.earnings.toLocaleString('pt-BR')}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                                <span>{new Date(trip.startTime).toLocaleDateString()}</span>
                                                <span>{trip.days} dia(s)</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* MY LIABILITIES SECTION */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">Débitos (Avarias e Multas)</h2>
                    {myLiabilities.length === 0 ? (
                        <div className="p-10 bg-white rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-500">
                            <p>Nenhuma pendência registrada em seu nome. Parabéns!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myLiabilities.map(liability => {
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
                                                <span className="text-sm text-slate-500">{new Date(liability.date).toLocaleDateString()}</span>
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
                            })}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TRIP DETAILS MODAL */}
        {selectedBooking && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBooking(null)}>
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
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

                        <div className="space-y-2">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Cliente / Contratante</p>
                                <p className="text-sm font-medium">{selectedBooking.clientName}</p>
                                {selectedBooking.clientPhone && <p className="text-sm text-blue-600">{selectedBooking.clientPhone}</p>}
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

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800">Documentos Disponíveis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myDocuments.length === 0 ? (
                        <p className="text-slate-500 col-span-2 text-center py-10 bg-white rounded-lg border border-dashed border-slate-300">
                            Nenhum documento disponível para você.
                        </p>
                    ) : (
                        myDocuments.map(doc => (
                            <div key={doc.id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-3 rounded text-blue-600">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{doc.title}</h3>
                                        <p className="text-xs text-slate-500">Upload: {new Date(doc.uploadDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <a 
                                    href={doc.fileContent} 
                                    download={doc.fileName}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Baixar
                                </a>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Solicitar Folga / Férias</h2>
                    <form onSubmit={handleRequest} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                            <select 
                                value={requestType} 
                                onChange={e => setRequestType(e.target.value as any)}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="FOLGA">Folga (Dia Único)</option>
                                <option value="FERIAS">Férias (Período)</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                            <input 
                                type="date" required 
                                value={requestDate} onChange={e => setRequestDate(e.target.value)}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {requestType === 'FERIAS' && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
                                <input 
                                    type="date" required 
                                    value={requestEndDate} onChange={e => setRequestEndDate(e.target.value)}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        )}

                        <button type="submit" className="w-full bg-slate-800 text-white font-medium py-2 rounded hover:bg-slate-700">
                            Enviar Solicitação
                        </button>
                    </form>
                </div>

                <div>
                    <h3 className="font-bold text-slate-700 mb-3">Histórico de Solicitações</h3>
                    <div className="space-y-2">
                        {myTimeOffs.map(t => (
                            <div key={t.id} className="bg-slate-50 p-3 rounded flex justify-between items-center text-sm border border-slate-200">
                                <div>
                                    <span className="font-semibold block text-slate-800">{t.type}</span>
                                    <span className="text-slate-500">
                                        {formatDateString(t.date)}
                                        {t.endDate && ` até ${formatDateString(t.endDate)}`}
                                    </span>
                                </div>
                                {getStatusBadge(t.status)}
                            </div>
                        ))}
                        {myTimeOffs.length === 0 && <p className="text-slate-400 text-sm">Nenhuma solicitação.</p>}
                    </div>
                </div>
            </div>
        )}

        {/* REPORT DEFECT TAB */}
        {activeTab === 'report' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit border-l-4 border-l-red-500">
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Reportar Problema no Veículo</h2>
                    <p className="text-sm text-slate-500 mb-4">Viu algo errado? Avise a oficina imediatamente.</p>
                    
                    <form onSubmit={handleReportSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Veículo</label>
                            <select 
                                required value={reportForm.busId}
                                onChange={e => setReportForm({...reportForm, busId: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
                            >
                                <option value="">Selecione o ônibus...</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                                <input 
                                    type="date" required 
                                    value={reportForm.date} onChange={e => setReportForm({...reportForm, date: e.target.value})}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Serviço</label>
                                <select 
                                    value={reportForm.type}
                                    onChange={e => setReportForm({...reportForm, type: e.target.value})}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
                                >
                                    <option value="MECANICA">Mecânica</option>
                                    <option value="ELETRICA">Elétrica</option>
                                    <option value="LIMPEZA">Limpeza</option>
                                    <option value="CARROCERIA">Carroceria</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Observação / Defeito</label>
                            <textarea 
                                required value={reportForm.description}
                                onChange={e => setReportForm({...reportForm, description: e.target.value})}
                                placeholder="Descreva o problema (ex: Freio fazendo barulho, Luz queimada...)"
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none"
                            />
                        </div>
                        <button type="submit" className="w-full bg-red-600 text-white font-medium py-2 rounded hover:bg-red-700">
                            Enviar Reporte
                        </button>
                    </form>
                </div>

                <div>
                    <h3 className="font-bold text-slate-700 mb-3">Meus Reportes Recentes</h3>
                    <div className="space-y-3">
                        {myReports.length === 0 ? (
                            <p className="text-slate-400 text-sm">Nenhum reporte enviado.</p>
                        ) : (
                            myReports.map(r => {
                                const bus = buses.find(b => b.id === r.busId);
                                return (
                                    <div key={r.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-slate-800">{bus?.plate}</span>
                                            {getStatusBadge(r.status)}
                                        </div>
                                        <p className="text-sm text-slate-600 mb-1">{r.description}</p>
                                        <p className="text-xs text-slate-400">
                                            {r.type} • {new Date(r.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default DriverPortal;
