import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, Bus, Booking } from '../types';

const BookingsView: React.FC = () => {
  const { bookings, buses, users, updateBooking, updateBookingStatus } = useStore();
  
  // --- FILTER STATE ---
  const [filters, setFilters] = useState({
      client: '',
      busId: '',
      date: '',
      status: ''
  });

  // --- EDIT MODAL STATE ---
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState('');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const drivers = users.filter(u => u.role === UserRole.DRIVER);

  // --- SAFE HELPERS ---
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

  // --- ACTIONS ---

  const handleEditClick = (booking: Booking) => {
    const safeStart = booking.startTime && booking.startTime.length >= 16 ? booking.startTime.slice(0, 16) : '';
    const safeEnd = booking.endTime && booking.endTime.length >= 16 ? booking.endTime.slice(0, 16) : '';
    const safePresentation = booking.presentationTime && booking.presentationTime.length >= 16 ? booking.presentationTime.slice(0, 16) : '';
    const safePaymentDate = booking.paymentDate ? booking.paymentDate.split('T')[0] : '';
    
    // Determine if freelance
    const isFreelance = !booking.driverId && !!booking.freelanceDriverName;

    setEditForm({
      busId: booking.busId,
      driverId: booking.driverId || '',
      freelanceDriverName: booking.freelanceDriverName || '',
      isFreelance: isFreelance,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone || '',
      destination: booking.destination,
      startTime: safeStart,
      endTime: safeEnd,
      value: booking.value,
      paymentStatus: booking.paymentStatus,
      paymentDate: safePaymentDate,
      departureLocation: booking.departureLocation || '',
      presentationTime: safePresentation,
      observations: booking.observations || ''
    });
    setEditingBooking(booking);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'paymentStatus' && value === 'PENDING') {
         setEditForm((prev: any) => ({ ...prev, [name]: value, paymentDate: '' }));
    } else if (name === 'isFreelance') {
         const isChecked = (e.target as HTMLInputElement).checked;
         setEditForm((prev: any) => ({ ...prev, isFreelance: isChecked, driverId: '', freelanceDriverName: '' }));
    } else {
        setEditForm((prev: any) => ({ ...prev, [name]: name === 'value' ? parseFloat(value) : value }));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    const payload = {
        ...editForm,
        driverId: editForm.isFreelance ? null : editForm.driverId,
        freelanceDriverName: editForm.isFreelance ? editForm.freelanceDriverName : null,
        paymentDate: editForm.paymentDate || null,
        presentationTime: editForm.presentationTime || editForm.startTime
    };
    // remove temp field
    delete payload.isFreelance;

    const result = await updateBooking(editingBooking.id, payload);

    if (result.success) {
      setMsg({ type: 'success', text: result.message });
      setTimeout(() => {
          setMsg(null);
          setEditingBooking(null);
      }, 1500);
    } else {
      if (result.message.includes('Conflito')) {
        setConflictDetails(result.message);
        setShowConflictModal(true);
      } else {
        setMsg({ type: 'error', text: result.message });
      }
    }
  };

  const getDriverName = (booking: Booking) => {
      if (booking.driverId) {
          const d = users.find(u => u.id === booking.driverId);
          return d ? d.name : 'Motorista Excluído';
      }
      if (booking.freelanceDriverName) {
          return `${booking.freelanceDriverName} (Freelance)`;
      }
      return 'Sem Motorista';
  };

  const handlePrintOS = (booking: Booking) => {
      const bus = buses.find(b => b.id === booking.busId);
      const driverName = getDriverName(booking);
      const sStart = safeDate(booking.startTime) + ' ' + safeTime(booking.startTime);
      const sEnd = safeDate(booking.endTime) + ' ' + safeTime(booking.endTime);
      const sPres = safeDate(booking.presentationTime) + ' ' + safeTime(booking.presentationTime);

      const printContent = `
        <html><head><title>OS - ${booking.destination}</title>
        <style>
            body{font-family:Arial,sans-serif;padding:20px;color:#000}
            .header{text-align:center;border-bottom:2px solid #000;margin-bottom:20px;padding-bottom:10px}
            .row{display:flex;margin-bottom:8px;border-bottom:1px dotted #ccc;padding-bottom:2px}
            .label{font-weight:bold;width:160px;display:inline-block}
            .value{flex:1;font-weight:normal}
            .box{border:2px solid #000;padding:10px;margin-top:20px}
            .obs-box{background:#f0f0f0;padding:10px;margin-top:20px;border:1px solid #ccc;min-height:60px}
            h3 {margin: 15px 0 5px 0; font-size: 16px; text-transform:uppercase; background:#eee; padding:5px;}
        </style>
        </head><body>
            <div class="header"><h1>RabeloTour - ORDEM DE SERVIÇO</h1></div>
            
            <h3>Dados da Viagem</h3>
            <div class="row"><span class="label">Destino:</span><span class="value">${booking.destination}</span></div>
            <div class="row"><span class="label">Saída:</span><span class="value">${sStart} - ${booking.departureLocation}</span></div>
            <div class="row"><span class="label">Apresentação:</span><span class="value">${sPres} (Garagem)</span></div>
            <div class="row"><span class="label">Previsão Retorno:</span><span class="value">${sEnd}</span></div>
            
            <h3>Cliente</h3>
            <div class="row"><span class="label">Nome:</span><span class="value">${booking.clientName}</span></div>
            <div class="row"><span class="label">Telefone:</span><span class="value">${booking.clientPhone || '-'}</span></div>
            
            <h3>Veículo e Motorista</h3>
            <div class="row"><span class="label">Veículo:</span><span class="value">${bus?.plate} - ${bus?.model}</span></div>
            <div class="row"><span class="label">Motorista:</span><span class="value">${driverName}</span></div>
            
            <h3>Observações / Instruções</h3>
            <div class="obs-box">
                ${booking.observations ? booking.observations.replace(/\n/g, '<br>') : 'Nenhuma observação registrada.'}
            </div>

            <div class="box">
                <strong>CONTROLE DE QUILOMETRAGEM</strong><br/><br/>
                <div style="display:flex; justify-content:space-between">
                    <span>KM Inicial: _______________</span>
                    <span>KM Final: _______________</span>
                    <span>Total Percorrido: _______________</span>
                </div>
                <br/><br/>
                Assinatura do Motorista: _____________________________________________
            </div>
            
            <script>window.print();</script>
        </body></html>`;
      const win = window.open('', '', 'width=800,height=600');
      if (win) { win.document.write(printContent); win.document.close(); }
  };

  const handlePrintContract = (booking: Booking) => {
    const bus = buses.find(b => b.id === booking.busId);
    
    const companyInfo = {
        name: "VIAGENS RABELO TOUR",
        cnpj: "04.828.057/0001-34",
        address: "Estrada do Gentio, 30, Bairro Itaipava, Petrópolis RJ",
        phones: "24 2237-4990 / 24 98824-9204",
        email: "rabelovt@ig.com.br"
    };

    const sStart = safeDate(booking.startTime) + ' as ' + safeTime(booking.startTime);
    const sEnd = safeDate(booking.endTime) + ' as ' + safeTime(booking.endTime);

    const printContent = `
      <html>
      <head>
          <title>Contrato - ${booking.id}</title>
          <style>
              body { font-family: 'Times New Roman', serif; font-size: 11px; padding: 20px; line-height: 1.2; color: #000; }
              .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 10px; padding-bottom: 5px; }
              .header h1 { margin: 0; font-size: 24px; font-weight: bold; font-style: italic; color: #1e3a8a; } /* Blueish similar to logo */
              .header span { font-size: 10px; }
              
              .top-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
              .top-table td { border: 1px solid #000; padding: 4px; vertical-align: top; }
              .label { font-weight: bold; font-size: 10px; display: block; margin-bottom: 2px; }
              
              .section-title { background: #eee; font-weight: bold; border: 1px solid #000; padding: 2px 5px; margin-top: 10px; font-size: 11px; }
              
              .info-box { border: 1px solid #000; padding: 5px; border-top: none; }
              .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
              
              .clauses { font-size: 9px; text-align: justify; margin-top: 10px; line-height: 1.1; }
              .clauses p { margin-bottom: 6px; }
              
              .signatures { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
              .sig-line { border-top: 1px solid #000; width: 45%; padding-top: 5px; font-size: 10px; }
              
              .footer { font-size: 9px; text-align: center; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 5px; }
          </style>
      </head>
      <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
             <div>
                <h1 style="margin:0; font-family: sans-serif; font-style: italic; color: #000; font-size: 22px;">VIAGENS<br/>Rabelo Tour</h1>
                <div style="background: #000; color: #fff; display: inline-block; padding: 1px 4px; font-weight: bold; font-size: 10px;">DESDE 1992</div>
             </div>
             <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 16px;">CONTRATO DE TRANSPORTE</h2>
                <div style="border: 1px solid #000; padding: 2px 10px; display: inline-block; margin-top: 5px;">
                    Número: <strong>${booking.id.slice(0, 6).toUpperCase()}</strong>
                </div>
                 <div style="border: 1px solid #000; padding: 2px 10px; display: inline-block; margin-left: 5px;">
                    Valor: <strong>R$ ${booking.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                </div>
             </div>
          </div>

          <div class="section-title">CONTRATANTE</div>
          <div class="info-box">
              <div class="row">
                  <div style="width: 70%"><strong>Nome:</strong> ${booking.clientName}</div>
                  <div style="width: 30%"><strong>Fantasia:</strong> _______________________</div>
              </div>
              <div class="row">
                  <div style="width: 40%"><strong>CPF/CNPJ:</strong> ______________________</div>
                  <div style="width: 30%"><strong>Insc. Estadual:</strong> ____________</div>
                  <div style="width: 30%"><strong>Documento:</strong> ____________</div>
              </div>
              <div class="row">
                  <div style="width: 100%"><strong>Endereço:</strong> __________________________________________________________________</div>
              </div>
              <div class="row">
                  <div style="width: 40%"><strong>Telefone:</strong> ${booking.clientPhone || '________________'}</div>
                  <div style="width: 40%"><strong>Email:</strong> ______________________</div>
                  <div style="width: 20%"><input type="checkbox"/> Jurídica <input type="checkbox"/> Física</div>
              </div>
          </div>

          <div class="section-title">CONTRATADA</div>
          <div class="info-box">
              <strong>${companyInfo.name}</strong> - CNPJ ${companyInfo.cnpj} <br/>
              ${companyInfo.address}
          </div>

          <div class="section-title">VIAGEM / ITINERÁRIO</div>
          <div class="info-box">
              <div class="row">
                  <div style="width: 50%"><strong>Origem:</strong> ${booking.departureLocation}</div>
                  <div style="width: 50%"><strong>Destino:</strong> ${booking.destination}</div>
              </div>
              <div class="row">
                  <div style="width: 50%"><strong>Saída:</strong> ${sStart}</div>
                  <div style="width: 50%"><strong>Retorno:</strong> ${sEnd}</div>
              </div>
              <div class="row" style="margin-top: 5px;">
                  <div style="width: 100%"><strong>Itinerário:</strong> SERVIÇO DE TRANSPORTE DE PASSAGEIROS</div>
              </div>
              <div class="row" style="margin-top: 5px; border-top: 1px dotted #ccc; padding-top: 5px;">
                  <div style="width: 60%"><strong>VEÍCULO/TIPO:</strong> ${bus?.model || 'EXECUTIVO'} (${bus?.capacity || 46} Lugares)</div>
                  <div style="width: 40%; font-size: 9px;">${bus?.features?.join(', ') || 'Ar condicionado, Som, WC'}</div>
              </div>
          </div>
          
          <div style="margin-top: 10px; font-weight: bold; font-size: 10px;">OBS GERAIS: ${booking.observations || ''}</div>

          <div class="section-title">CONDIÇÕES GERAIS / CLÁUSULAS</div>
          <div class="clauses">
              <p><strong>1.1</strong> O número de passageiros permitido será de acordo com a capacidade de poltronas do(s) veículo(s) contratado(s), conforme legislações vigentes do transporte rodoviário de passageiros.</p>
              
              <p><strong>1.2</strong> Para as viagens de âmbito Interestadual, o Contratante deverá entregar a Contratada a lista de passageiros, constando os dados dos passageiros (nome completo, carteira de identidade, data e órgão emissor) e ainda cópia de carteira de identidade e certidão de nascimento de menores à serem transportados. Estes documentos deverão ser entregues à Contratada no prazo máximo de 5 (cinco) dias úteis que antecede a data prevista de saída, sob pena de não ser realizada a viagem, motivado pela falta de tempo hábil da emissão de autorização junto ao órgão governamental competente. Após a emissão de Autorização de Viagem, poderão ser incluídos ou alterados no máximo 4 (quatro) passageiros por determinação do órgão emissor. O contratante se responsabilizará pela exatidão das informações prestadas a vista dos originais dos documentos, sob pena de aplicação do disposto no art. 64 da Lei 8333 de 30/12/1991.</p>
              
              <p><strong>1.3</strong> Os passageiros de menor idade, à partir de 12 anos deverão encaminhar previamente a Contratada, cópia de documento com foto e fé pública em todo território nacional, e apresentar o original para conferência no embarque, afim de cumprir o previsto na Resolução No. 4.308 de 10/04/2014.</p>
              
              <p><strong>1.4</strong> O Contratante poderá cancelar ou adiar a viagem, desde que comunique a Contratada com antecedência mínima de dez dias, tendo o valor pago, reembolso de 50% (cinquenta por cento).</p>
              
              <p><strong>1.5</strong> Caso haja atraso na chegada do(s) veículo(s) no local de origem ou destino, comprovadamente causando pela Contratada, este tempo poderá à exclusivo critério do contratante, ser compensado no retorno da viagem, sem ônus para o mesmo.</p>
              
              <p><strong>1.6</strong> O serviço à ser realizado através do presente contrato, permite no máximo 3 (três) locais para embarques e 3 (três) para desembarques, respeitando a quilometragem estipulada.</p>
              
              <p><strong>1.7</strong> Quaisquer taxas e/ou estacionamentos, cobrados nas cidades a serem visitadas pelo grupo, correrão exclusivamente por conta do Contratante, bem como, será o único e exclusivo responsável pelas autorizações prévias de acesso aos locais das respectivas visitas.</p>
              
              <p><strong>1.8</strong> O Contratante se responsabilizará pela hospedagem e alimentação do(s) motorista(s), arcando com seus custos.</p>
              
              <p><strong>1.9</strong> A quilometragem prevista no respectivo contrato deverá ser respeitada. Caso exceda, o Contratante assumirá o pagamento à Contratada no valor correspondente a 60% (sessenta por cento) o valor do km rodado/contratado.</p>
              
              <p><strong>1.10</strong> É expressamente proibido trafegar por estradas de TERRA ou em vias que comprometem a trafegabilidade do(s) veículos, colocando em risco a segurança dos passageiros.</p>
              
              <p><strong>1.11</strong> Por motivo de força maior ou pela indisponibilidade, a Contratada poderá utilizar veículo(s) das empresas associadas, com as mesmas características daquelas previstas no respectivo contrato, inclusive os opcionais, sem custo adicional para o contratante.</p>
              
              <p><strong>1.12</strong> O Contratante se responsabilizará pelos danos causados ao(s) veículo(s), eventualmente e comprovadamente causados pelos usuários transportados, assumindo as despesas de reparo, cabendo-lhe o direito de regressão contra o causados dos danos e conformidade a lei civil.</p>
              
              <p><strong>1.13</strong> A Contratada não se responsabilizará por objetos deixados no interior e bagageiro do(s) veiculo(s), cabendo o Contratante, vistoriá-lo(s) ao término do serviço, nos locais de origem e destino.</p>
              
              <p><strong>1.14</strong> No preço ajustado e contratado estão contempladas todas as despesas operacionais do serviço, tais como: combustível, salário(s) e encargos trabalhistas do(s) motorista(s), manutenção e limpeza do(s) veículo(s), impostos e outras.</p>
              
              <p><strong>1.15</strong> O serviço será realizado, mediante a constatação do pagamento integral do mesmo.</p>
          </div>

          <div style="margin-top: 20px; text-align: center; font-style: italic;">
              E, por estarem assim justos e acordados, firmamos o presente em 2 vias de igual teor e para um só fim.
              <br/><br/>
              Petrópolis - RJ, ${new Date().toLocaleDateString('pt-BR')}
          </div>

          <div class="signatures">
              <div class="sig-line">
                  <strong>CONTRATANTE</strong><br/>
                  ${booking.clientName}
              </div>
              <div class="sig-line">
                  <strong>CONTRATADA</strong><br/>
                  ${companyInfo.name}
              </div>
          </div>
          
          <div class="signatures" style="margin-top: 30px;">
              <div class="sig-line" style="width: 30%;">Testemunha 1</div>
              <div class="sig-line" style="width: 30%;">Testemunha 2</div>
          </div>

          <div class="footer">
              ${companyInfo.email} // ${companyInfo.phones} - ${companyInfo.address}
          </div>
          <script>window.print();</script>
      </body>
      </html>
    `;
    const win = window.open('', '', 'width=800,height=600');
    if (win) { win.document.write(printContent); win.document.close(); }
  };

  // --- FILTER LOGIC ---
  const filteredBookings = bookings.filter(b => {
      const matchClient = filters.client ? b.clientName.toLowerCase().includes(filters.client.toLowerCase()) : true;
      const matchBus = filters.busId ? b.busId === filters.busId : true;
      const matchStatus = filters.status ? b.status === filters.status : true;
      
      let matchDate = true;
      if (filters.date) {
          const bookingDate = b.startTime.split('T')[0];
          matchDate = bookingDate === filters.date;
      }

      return matchClient && matchBus && matchDate && matchStatus;
  }).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="animate-fade-in relative">
      {/* CONFLICT MODAL */}
      {showConflictModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                  <h3 className="text-xl font-bold text-red-600 mb-2">Conflito de Horário!</h3>
                  <p className="text-slate-600 mb-4">{conflictDetails}</p>
                  <button onClick={() => setShowConflictModal(false)} className="w-full bg-slate-800 text-white py-2 rounded">Fechar</button>
              </div>
          </div>
      )}

      {/* EDIT MODAL */}
      {editingBooking && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800">Editar Locação</h3>
                      <button onClick={() => setEditingBooking(null)} className="text-slate-400 hover:text-slate-800 text-xl font-bold">&times;</button>
                  </div>
                  
                  {msg && <div className={`p-3 rounded mb-4 text-sm ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{msg.text}</div>}
                  
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <input name="clientName" value={editForm.clientName} onChange={handleEditChange} placeholder="Cliente" className="w-full border p-2 rounded" required />
                          <input name="clientPhone" value={editForm.clientPhone} onChange={handleEditChange} placeholder="Telefone" className="w-full border p-2 rounded" />
                      </div>
                      <input name="destination" value={editForm.destination} onChange={handleEditChange} placeholder="Destino" className="w-full border p-2 rounded" required />
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold">Início</label><input type="datetime-local" name="startTime" value={editForm.startTime} onChange={handleEditChange} className="w-full border p-2 rounded" required /></div>
                        <div><label className="text-xs font-bold">Fim</label><input type="datetime-local" name="endTime" value={editForm.endTime} onChange={handleEditChange} className="w-full border p-2 rounded" required /></div>
                      </div>
                      <input name="departureLocation" value={editForm.departureLocation} onChange={handleEditChange} placeholder="Local de Saída" className="w-full border p-2 rounded" required />
                      <div><label className="text-xs font-bold">Apresentação</label><input type="datetime-local" name="presentationTime" value={editForm.presentationTime} onChange={handleEditChange} className="w-full border p-2 rounded" /></div>

                      <select name="busId" value={editForm.busId} onChange={handleEditChange} className="w-full border p-2 rounded" required>
                          <option value="">Selecione o Ônibus</option>
                          {buses.map(b => (
                              <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                          ))}
                      </select>

                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <label className="flex items-center space-x-2 text-sm cursor-pointer mb-2">
                            <input 
                                type="checkbox" 
                                name="isFreelance" 
                                checked={editForm.isFreelance} 
                                onChange={handleEditChange} 
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-blue-700">Motorista Freelance?</span>
                        </label>
                        {editForm.isFreelance ? (
                            <input name="freelanceDriverName" value={editForm.freelanceDriverName} onChange={handleEditChange} placeholder="Nome do Freelance" className="w-full border p-2 rounded" />
                        ) : (
                            <select name="driverId" value={editForm.driverId} onChange={handleEditChange} className="w-full border p-2 rounded">
                                <option value="">Selecione o Motorista</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        )}
                      </div>

                      <textarea name="observations" value={editForm.observations} onChange={handleEditChange} placeholder="Observações..." className="w-full border p-2 rounded h-20" />

                      <div className="border-t pt-4 grid grid-cols-2 gap-4">
                          <input type="number" name="value" value={editForm.value} onChange={handleEditChange} className="w-full border p-2 rounded" placeholder="Valor R$" />
                          <select name="paymentStatus" value={editForm.paymentStatus} onChange={handleEditChange} className="w-full border p-2 rounded">
                              <option value="PENDING">Pendente</option>
                              <option value="PAID">Pago</option>
                              <option value="SCHEDULED">Agendado</option>
                          </select>
                          {editForm.paymentStatus !== 'PENDING' && (
                              <input type="date" name="paymentDate" value={editForm.paymentDate} onChange={handleEditChange} className="w-full border p-2 rounded col-span-2" />
                          )}
                      </div>
                      <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700">Salvar Alterações</button>
                  </form>
              </div>
          </div>
      )}

      {/* BUS DETAILS MODAL */}
      {selectedBus && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedBus(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedBus.plate}</h2>
                <p className="text-slate-600 mb-4">{selectedBus.model} - {selectedBus.capacity} Lugares</p>
                <div className="bg-slate-50 p-3 rounded mb-4 max-h-40 overflow-y-auto">
                    <h4 className="font-bold text-xs uppercase mb-2">Próximas Viagens</h4>
                    {bookings.filter(b => b.busId === selectedBus.id && b.status === 'CONFIRMED').map(b => (
                        <div key={b.id} className="text-sm border-b py-1">{safeDate(b.startTime)} - {b.destination}</div>
                    ))}
                </div>
                <button onClick={() => setSelectedBus(null)} className="w-full bg-slate-200 text-slate-800 py-2 rounded">Fechar</button>
            </div>
        </div>
      )}

      <div className="space-y-6">
        {/* FILTERS BAR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 uppercase mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filtrar Viagens
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input 
                    type="date" 
                    value={filters.date} 
                    onChange={e => setFilters({...filters, date: e.target.value})}
                    className="border p-2 rounded text-sm w-full"
                />
                <select 
                    value={filters.busId} 
                    onChange={e => setFilters({...filters, busId: e.target.value})}
                    className="border p-2 rounded text-sm w-full"
                >
                    <option value="">Todos Veículos</option>
                    {buses.map(b => <option key={b.id} value={b.id}>{b.plate}</option>)}
                </select>
                <input 
                    type="text" 
                    placeholder="Nome do Cliente"
                    value={filters.client} 
                    onChange={e => setFilters({...filters, client: e.target.value})}
                    className="border p-2 rounded text-sm w-full"
                />
                <button 
                    onClick={() => setFilters({client: '', busId: '', date: '', status: ''})}
                    className="text-xs text-blue-600 hover:underline text-center flex items-center justify-center"
                >
                    Limpar Filtros
                </button>
            </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800">
            Listagem de Locações ({filteredBookings.length})
        </h2>
        
        <div className="grid gap-4">
          {filteredBookings.map(booking => {
            const bus = buses.find(b => b.id === booking.busId);
            const driverName = getDriverName(booking);
            
            return (
              <div key={booking.id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {booking.status}
                    </span>
                    <h3 className="font-semibold text-lg text-slate-900">{booking.destination}</h3>
                  </div>
                  <p className="text-slate-600 text-sm">Cliente: <strong>{booking.clientName}</strong></p>
                  
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        📅 {safeDate(booking.startTime)}
                    </div>
                    <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        ⏰ {safeTime(booking.startTime)} - {safeTime(booking.endTime)}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-slate-500">
                      📍 Saída: {booking.departureLocation || 'N/A'}
                  </div>

                  <div className="mt-3 text-sm grid grid-cols-2 gap-2">
                    <div>
                        <span className="font-medium text-slate-700 block">Veículo</span> 
                        {bus ? (
                            <button onClick={() => setSelectedBus(bus)} className="text-blue-600 hover:underline font-semibold">{bus.model} ({bus.plate})</button>
                        ) : <span className="text-slate-400">Não atribuído</span>}
                    </div>
                    <div>
                        <span className="font-medium text-slate-700 block">Motorista</span> 
                        <span className={`font-medium ${booking.driverId ? 'text-slate-600' : booking.freelanceDriverName ? 'text-purple-600' : 'text-red-500'}`}>
                            {driverName}
                        </span>
                    </div>
                  </div>
                </div>

                <div className="text-right border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 min-w-[150px]">
                  <p className="text-lg font-bold text-blue-600">R$ {booking.value.toLocaleString('pt-BR')}</p>
                  
                  <div className="mt-2 text-xs mb-3">
                     {booking.paymentStatus === 'PAID' ? (
                         <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Pago: {safeDate(booking.paymentDate)}</span>
                     ) : booking.paymentStatus === 'SCHEDULED' ? (
                         <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Vence: {safeDate(booking.paymentDate)}</span>
                     ) : (
                         <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Pendente</span>
                     )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                      <button onClick={() => handlePrintOS(booking)} className="bg-slate-800 text-white text-xs py-2 rounded font-bold hover:bg-slate-700">🖨️ Imprimir OS</button>
                      <button onClick={() => handlePrintContract(booking)} className="bg-purple-600 text-white text-xs py-2 rounded font-bold hover:bg-purple-700">🖨️ Imprimir Contrato</button>
                      <button onClick={() => handleEditClick(booking)} className="bg-blue-100 text-blue-700 text-xs py-2 rounded font-bold hover:bg-blue-200">✏️ Editar</button>
                      {booking.status === 'CONFIRMED' && (
                          <button onClick={() => updateBookingStatus(booking.id, 'CANCELLED')} className="text-red-500 text-xs hover:underline">Cancelar Viagem</button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredBookings.length === 0 && (
            <div className="text-center text-slate-500 py-10 bg-white rounded-lg border border-dashed border-slate-300">
                Nenhuma locação encontrada com estes filtros.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingsView;