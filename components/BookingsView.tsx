import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Bus, Booking } from '../types';

const BookingsView: React.FC = () => {
  const { bookings, buses, users, addBooking, updateBooking, updateBookingStatus, transactions } = useStore();
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
    presentationTime: ''
  });
  
  // State for Editing
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Conflict Popup State
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState('');

  // Bus Details Modal State
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const drivers = users.filter(u => u.role === UserRole.DRIVER);

  const handleEdit = (booking: Booking) => {
    // Safety check for date fields to prevent crash on old records
    const safeStart = booking.startTime ? booking.startTime.slice(0, 16) : '';
    const safeEnd = booking.endTime ? booking.endTime.slice(0, 16) : '';
    const safePresentation = booking.presentationTime ? booking.presentationTime.slice(0, 16) : '';
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
      presentationTime: safePresentation
    });
    setEditingBookingId(booking.id);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingBookingId(null);
    setFormData({ 
      busId: '', driverId: '', clientName: '', clientPhone: '', destination: '', startTime: '', endTime: '', value: 0,
      paymentStatus: 'PENDING', paymentDate: '',
      departureLocation: '', presentationTime: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.busId || !formData.startTime || !formData.endTime || !formData.departureLocation || !formData.presentationTime) {
        setMsg({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
        return;
    }

    if (formData.paymentStatus !== 'PENDING' && !formData.paymentDate) {
        setMsg({ type: 'error', text: 'Informe a data do pagamento.' });
        return;
    }

    let result;
    if (editingBookingId) {
        // UPDATE MODE
        result = await updateBooking(editingBookingId, {
            ...formData,
            driverId: formData.driverId || null,
            paymentDate: formData.paymentDate || null
        });
    } else {
        // CREATE MODE
        result = await addBooking({
            ...formData,
            driverId: formData.driverId || null,
            paymentDate: formData.paymentDate || null
        });
    }

    if (result.success) {
      setMsg({ type: 'success', text: result.message });
      handleCancelEdit(); // Reset form
      setTimeout(() => setMsg(null), 3000);
    } else {
      if (result.message.includes('Conflito')) {
        // Show Popup for conflict
        setConflictDetails(result.message);
        setShowConflictModal(true);
      } else {
        setMsg({ type: 'error', text: result.message });
        setTimeout(() => setMsg(null), 3000);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'paymentStatus' && value === 'PENDING') {
         setFormData(prev => ({
             ...prev,
             [name]: value as any,
             paymentDate: '' // Reset date if pending
         }));
    } else {
        setFormData(prev => ({
            ...prev,
            [name]: name === 'value' ? parseFloat(value) : value
        }));
    }
  };

  // Helper to find related maintenance
  const getBusMaintenanceHistory = (plate: string) => {
      if (!plate) return [];
      // Simple heuristic: check if transaction description contains the plate
      return transactions.filter(t => 
          t.type === 'EXPENSE' && 
          t.description.toLowerCase().includes(plate.toLowerCase())
      );
  };

  // PRINT SERVICE ORDER FUNCTION
  const handlePrintOS = (booking: Booking) => {
      const bus = buses.find(b => b.id === booking.busId);
      const driver = users.find(u => u.id === booking.driverId);
      
      const safeStart = booking.startTime ? new Date(booking.startTime).toLocaleString() : 'N/A';
      const safeEnd = booking.endTime ? new Date(booking.endTime).toLocaleString() : 'N/A';
      const safePresentation = booking.presentationTime ? new Date(booking.presentationTime).toLocaleString() : 'N/A';

      const printContent = `
        <html>
        <head>
            <title>Ordem de Serviço - ${booking.destination}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; }
                .header p { margin: 5px 0 0; }
                .section { margin-bottom: 20px; }
                .section h3 { background: #eee; padding: 5px; border-bottom: 1px solid #ccc; margin-bottom: 10px; font-size: 16px; text-transform: uppercase; }
                .row { display: flex; margin-bottom: 8px; }
                .label { font-weight: bold; width: 150px; }
                .value { flex: 1; border-bottom: 1px dotted #ccc; }
                .box { border: 2px solid #000; padding: 15px; margin-top: 30px; }
                .km-row { display: flex; justify-content: space-between; margin-top: 20px; }
                .km-field { width: 45%; border-bottom: 1px solid #000; padding-bottom: 5px; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; }
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>RabeloTour - ORDEM DE SERVIÇO</h1>
                <p>Transporte e Turismo</p>
            </div>

            <div class="section">
                <h3>Dados da Viagem</h3>
                <div class="row"><span class="label">Destino:</span><span class="value">${booking.destination}</span></div>
                <div class="row"><span class="label">Local de Saída:</span><span class="value">${booking.departureLocation || 'Não informado'}</span></div>
                <div class="row"><span class="label">Horário de Saída:</span><span class="value">${safeStart}</span></div>
                <div class="row"><span class="label">Apresentação:</span><span class="value">${safePresentation} (Garagem)</span></div>
                <div class="row"><span class="label">Retorno Previsto:</span><span class="value">${safeEnd}</span></div>
            </div>

            <div class="section">
                <h3>Cliente</h3>
                <div class="row"><span class="label">Nome:</span><span class="value">${booking.clientName}</span></div>
                <div class="row"><span class="label">Telefone:</span><span class="value">${booking.clientPhone || 'Não informado'}</span></div>
            </div>

            <div class="section">
                <h3>Equipe e Veículo</h3>
                <div class="row"><span class="label">Motorista:</span><span class="value">${driver?.name || '___________________________'}</span></div>
                <div class="row"><span class="label">Veículo:</span><span class="value">${bus?.model} - Placa: ${bus?.plate}</span></div>
            </div>

            <div class="box">
                <h3 style="border:none; background:none; padding:0; margin:0 10px 0;">CONTROLE DE QUILOMETRAGEM</h3>
                <div class="km-row">
                    <div class="km-field">KM INICIAL: </div>
                    <div class="km-field">KM FINAL: </div>
                </div>
                <div style="margin-top: 30px;">
                    <p>Observações do Motorista:</p>
                    <div style="height: 50px; border-bottom: 1px solid #ccc; margin-top: 10px;"></div>
                    <div style="height: 50px; border-bottom: 1px solid #ccc; margin-top: 10px;"></div>
                </div>
            </div>

            <div class="footer">
                <p>_____________________________________________</p>
                <p>Assinatura do Motorista</p>
            </div>
            
            <script>window.print();</script>
        </body>
        </html>
      `;

      const win = window.open('', '', 'width=800,height=600');
      if (win) {
          win.document.write(printContent);
          win.document.close();
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in relative">
      
      {/* CONFLICT POPUP MODAL */}
      {showConflictModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
                  <div className="bg-red-600 p-4 flex items-center gap-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      <h3 className="text-xl font-bold text-white">Veículo Indisponível!</h3>
                  </div>
                  <div className="p-6">
                      <p className="text-slate-700 font-medium text-lg mb-2">Atenção, Gerente:</p>
                      <p className="text-slate-600 mb-6 border-l-4 border-red-200 pl-4 py-2 bg-red-50 rounded-r">
                        {conflictDetails}
                      </p>
                      <p className="text-sm text-slate-500 mb-6">
                        Já existe uma locação confirmada para este ônibus no mesmo dia e horário. Por favor, selecione outro veículo ou altere o horário.
                      </p>
                      <button 
                        onClick={() => setShowConflictModal(false)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
                      >
                        Entendido, vou corrigir
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* BUS DETAILS MODAL */}
      {selectedBus && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedBus(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            🚌 {selectedBus.model}
                        </h2>
                        <span className="text-blue-200 font-mono text-lg">{selectedBus.plate}</span>
                    </div>
                    <button onClick={() => setSelectedBus(null)} className="text-slate-400 hover:text-white">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-xs font-bold text-slate-500 uppercase">Capacidade</span>
                            <p className="text-xl font-bold text-slate-800">{selectedBus.capacity} Passageiros</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <span className="text-xs font-bold text-slate-500 uppercase">Status Atual</span>
                            <p className={`text-xl font-bold ${selectedBus.status === 'AVAILABLE' ? 'text-green-600' : selectedBus.status === 'MAINTENANCE' ? 'text-red-60