
import React, { useState } from 'react';
import { useStore } from '../services/store';
import CalendarView from './CalendarView';
import { Booking, UserRole } from '../types';
import { Logo } from './Logo';

const DriverPortal: React.FC = () => {
  const { currentUser, bookings, timeOffs, addTimeOff, documents, buses, addMaintenanceReport, maintenanceReports, addFuelRecord, driverLiabilities, charterContracts, driverFees, fuelRecords, users, scheduleConfirmations, confirmTrip } = useStore();
  
  const isAux = currentUser.role === UserRole.GARAGE_AUX;

  const [activeTab, setActiveTab] = useState<'schedule' | 'documents' | 'requests' | 'report' | 'fuel' | 'finance'>('schedule');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const getTodayLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const scheduleFilter = (b: Booking) => {
      if (b.status === 'CANCELLED') return false;
      if (isAux) return true;
      // Aparecer para o motorista se ele for o 1º OU o 2º motorista da viagem
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

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-gradient-to-r from-blue-700 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="z-10">
          <h1 className="text-3xl font-bold mb-2">Portal {isAux ? 'da Garagem' : 'do Motorista'}</h1>
          <p className="opacity-80">Olá, {currentUser.name}.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-300 space-x-4 overflow-x-auto">
        <button onClick={() => setActiveTab('schedule')} className={`pb-2 px-1 font-medium text-sm ${activeTab === 'schedule' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>📅 Minha Escala</button>
        <button onClick={() => setActiveTab('finance')} className={`pb-2 px-1 font-medium text-sm ${activeTab === 'finance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>💰 Financeiro</button>
        <button onClick={() => setActiveTab('report')} className={`pb-2 px-1 font-medium text-sm ${activeTab === 'report' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500'}`}>⚠️ Reportar Defeito</button>
      </div>

      <div className="mt-6">
        {activeTab === 'schedule' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                     <CalendarView onEventClick={(b) => setSelectedBooking(b)} />
                </div>
                <div className="space-y-4">
                    <h2 className="text-lg font-bold">Próximas Viagens</h2>
                    <div className="space-y-3">
                        {combinedSchedule.slice(0, 10).map((booking: any) => (
                            <div key={booking.id} onClick={() => setSelectedBooking(booking)} className="p-4 rounded-xl border-l-4 border-l-blue-500 bg-white shadow-sm cursor-pointer hover:bg-slate-50">
                                <h3 className="font-bold text-slate-800">{booking.destination}</h3>
                                <p className="text-xs text-slate-600">📅 {new Date(booking.startTime).toLocaleDateString()} {new Date(booking.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                {booking.driver2Id === currentUser.id && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 rounded font-bold">2º MOTORISTA</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DriverPortal;
