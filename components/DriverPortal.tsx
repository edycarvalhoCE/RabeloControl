import React, { useState } from 'react';
import { useStore } from '../services/store';
import CalendarView from './CalendarView';
import { Booking } from '../types';

const DriverPortal: React.FC = () => {
  const { currentUser, bookings, timeOffs, addTimeOff, documents, buses, addMaintenanceReport, maintenanceReports } = useStore();
  const [requestDate, setRequestDate] = useState('');
  const [requestType, setRequestType] = useState<'FOLGA' | 'FERIAS'>('FOLGA');
  const [activeTab, setActiveTab] = useState<'schedule' | 'documents' | 'requests' | 'report'>('schedule');

  // Trip Details Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Maintenance Report State
  const [reportForm, setReportForm] = useState({ busId: '', type: 'MECANICA', description: '', date: new Date().toISOString().split('T')[0] });

  const myBookings = bookings
    .filter(b => b.driverId === currentUser.id && b.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const myTimeOffs = timeOffs.filter(t => t.driverId === currentUser.id);
  const myDocuments = documents.filter(d => d.driverId === currentUser.id);
  const myReports = maintenanceReports.filter(r => r.driverId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestDate) {
        addTimeOff({
            driverId: currentUser.id,
            date: requestDate,
            type: requestType
        });
        setRequestDate('');
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
             <span className="text-white font-extrabold text-2xl tracking-tighter">
                Rabelo<span className="text-blue-300">Tour</span>
            </span>
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
                        Próximas Viagens
                    </h2>
                    <div className="space-y-3">
                        {myBookings.length === 0 ? (
                            <p className="text-slate-500 italic">Nenhuma viagem agendada no momento.</p>
                        ) : (
                            myBookings.slice(0, 3).map(booking => (
                                <div 
                                    key={booking.id} 
                                    onClick={() => handleBookingClick(booking)}
                                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-base">{booking.destination}</h3>
                                        <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded">Ver Detalhes</span>
                                    </div>
                                    <div className="text-xs text-slate-600 space-y-1">
                                        <p>📅 {new Date(booking.startTime).toLocaleDateString()} - {new Date(booking.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                        <p>🏁 Retorno: {new Date(booking.endTime).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input 
                                type="date" required 
                                value={requestDate} onChange={e => setRequestDate(e.target.value)}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                            <select 
                                value={requestType} 
                                onChange={e => setRequestType(e.target.value as any)}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="FOLGA">Folga</option>
                                <option value="FERIAS">Férias</option>
                            </select>
                        </div>
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
                                    {/* Use format function to fix date display */}
                                    <span className="text-slate-500">{formatDateString(t.date)}</span>
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