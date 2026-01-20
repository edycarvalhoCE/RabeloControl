
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { PackagePassenger, TravelPackage, Client, PackageLead } from '../types';

const TravelPackagesView: React.FC = () => {
  const { travelPackages, packagePassengers, packagePayments, clients, addTravelPackage, registerPackageSale, updatePackagePassenger, deletePackagePassenger, addPackagePayment, currentUser, packageLeads, addPackageLead, updatePackageLead, deletePackageLead } = useStore();
  
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null);
  const [showNewPackageForm, setShowNewPackageForm] = useState(false);
  const [showCommissionReport, setShowCommissionReport] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  
  // Edit State
  const [editingPassenger, setEditingPassenger] = useState<PackagePassenger | null>(null);

  // Leads State
  const [newLead, setNewLead] = useState({ name: '', phone: '', packageId: '', notes: '', callbackDate: '' });

  // Create Package Form
  const [newPkg, setNewPkg] = useState({ title: '', date: '', adultPrice: 0, childPrice: 0, seniorPrice: 0 });

  // Sale/Passenger Form State
  const [saleForm, setSaleForm] = useState({
      saleType: 'DIRECT' as 'DIRECT' | 'AGENCY',
      agencyName: '',
      agencyPhone: '',
      paxList: '', // Text area for Agency PAX names
      cpf: '',
      name: '',
      rg: '',
      birthDate: '',
      phone: '',
      address: '',
      qtdAdult: 0,
      qtdChild: 0,
      qtdSenior: 0,
      discount: 0,
      paymentMethod: 'VISTA' as 'VISTA' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO',
      transactionSource: 'MACHINE' as 'MACHINE' | 'LINK',
      installments: 1, // Number of installments
      cardFeeRate: 0 // % auto-calculated
  });

  // Client History Modal
  const [viewHistoryClient, setViewHistoryClient] = useState<Client | null>(null);

  // Payment Modal
  const [selectedPassengerForPayment, setSelectedPassengerForPayment] = useState<PackagePassenger | null>(null);
  const [newPayment, setNewPayment] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'PIX', installments: 1, notes: '' });

  // --- AUTOMATIC RATE CALCULATION EFFECT ---
  useEffect(() => {
      // Rates based on provided table
      // Debit: 1.47%
      // Credit 1x: 2.44%
      // Credit 2x-6x: 2.72%
      // Credit 7x-12x: 3.13%
      
      let rate = 0;

      if (saleForm.paymentMethod === 'CARTAO_DEBITO') {
          rate = 1.47;
      } else if (saleForm.paymentMethod === 'CARTAO_CREDITO') {
          if (saleForm.installments === 1) {
              rate = 2.44;
          } else if (saleForm.installments >= 2 && saleForm.installments <= 6) {
              rate = 2.72;
          } else if (saleForm.installments >= 7 && saleForm.installments <= 12) {
              rate = 3.13;
          }
      }

      setSaleForm(prev => ({ ...prev, cardFeeRate: rate }));
  }, [saleForm.paymentMethod, saleForm.installments]);


  // --- Handlers ---

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if(newPkg.title && newPkg.date) {
        addTravelPackage(newPkg);
        setShowNewPackageForm(false);
        setNewPkg({ title: '', date: '', adultPrice: 0, childPrice: 0, seniorPrice: 0 });
    }
  };

  const handleAddLead = (e: React.FormEvent) => {
      e.preventDefault();
      if(newLead.name && newLead.packageId) {
          addPackageLead(newLead);
          setNewLead({ name: '', phone: '', packageId: '', notes: '', callbackDate: '' });
          alert("Interessado cadastrado com sucesso!");
      }
  };

  const getLeadStatusColor = (status: string) => {
      switch(status) {
          case 'CONTACTED': return 'bg-blue-100 text-blue-700';
          case 'CONVERTED': return 'bg-green-100 text-green-700';
          case 'LOST': return 'bg-red-100 text-red-700';
          default: return 'bg-yellow-100 text-yellow-700';
      }
  };

  // Check if callback date is today or passed for pending leads
  const isUrgent = (lead: PackageLead) => {
      if(lead.status !== 'PENDING' || !lead.callbackDate) return false;
      const today = new Date().toISOString().split('T')[0];
      return lead.callbackDate <= today;
  };

  const handleCpfBlur = () => {
      // Auto-fill client data if exists (only when not editing an existing sale to prevent overwrite of form if user is changing client)
      if (editingPassenger) return;

      const found = clients.find(c => c.cpf === saleForm.cpf);
      if (found) {
          setSaleForm(prev => ({
              ...prev,
              name: found.name,
              rg: found.rg,
              birthDate: found.birthDate,
              phone: found.phone,
              address: found.address
          }));
      }
  };

  const handleEditPassenger = (p: PackagePassenger) => {
      setEditingPassenger(p);
      setSaleForm({
          saleType: p.saleType || 'DIRECT',
          agencyName: p.agencyName || '',
          agencyPhone: p.agencyPhone || '',
          paxList: p.paxList || '',
          cpf: p.titularCpf,
          name: p.titularName,
          rg: '', // RG not stored in sale usually, client lookup required if needed, or leave blank
          birthDate: '', // Same for birthdate
          phone: '', // Same
          address: '', // Same
          qtdAdult: p.qtdAdult,
          qtdChild: p.qtdChild,
          qtdSenior: p.qtdSenior,
          discount: p.discount,
          paymentMethod: p.paymentMethod || 'VISTA',
          transactionSource: p.transactionSource || 'MACHINE',
          installments: p.installments || 1,
          cardFeeRate: p.cardFeeRate || 0
      });
      // Try to find client data to fill remaining fields
      const client = clients.find(c => c.id === p.clientId);
      if(client) {
          setSaleForm(prev => ({
              ...prev,
              rg: client.rg || '',
              birthDate: client.birthDate || '',
              phone: client.phone || '',
              address: client.address || ''
          }));
      }
      // Scroll to form
      const formEl = document.getElementById('sale-form-anchor');
      if(formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingPassenger(null);
      setSaleForm({ 
          saleType: 'DIRECT', agencyName: '', agencyPhone: '', paxList: '',
          cpf: '', name: '', rg: '', birthDate: '', phone: '', address: '', qtdAdult: 0, qtdChild: 0, qtdSenior: 0, discount: 0, 
          paymentMethod: 'VISTA', transactionSource: 'MACHINE', installments: 1, cardFeeRate: 0 
      });
  };

  const handleDeletePassenger = async (p: PackagePassenger) => {
      if(window.confirm(`Tem certeza que deseja excluir a venda para ${p.titularName}? Esta ação não pode ser desfeita.`)) {
          if (p.paidAmount > 0) {
              if(!window.confirm("Atenção: Existem pagamentos registrados para esta venda. Deseja excluir mesmo assim?")) return;
          }
          await deletePackagePassenger(p.id);
      }
  };

  // Currency Handlers
  const handlePkgPriceChange = (field: 'adultPrice' | 'childPrice' | 'seniorPrice', valueStr: string) => {
      const digits = valueStr.replace(/\D/g, "");
      const realValue = Number(digits) / 100;
      setNewPkg(prev => ({ ...prev, [field]: realValue }));
  };

  const handleDiscountChange = (valueStr: string) => {
      const digits = valueStr.replace(/\D/g, "");
      const realValue = Number(digits) / 100;
      setSaleForm(prev => ({ ...prev, discount: realValue }));
  };

  const handlePaymentAmountChange = (valueStr: string) => {
      const digits = valueStr.replace(/\D/g, "");
      const realValue = Number(digits) / 100;
      setNewPayment(prev => ({ ...prev, amount: realValue }));
  };

  const handleRegisterSale = async (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedPackage) {
          // 1. Calculate Total
          const total = (saleForm.qtdAdult * selectedPackage.adultPrice) + 
                        (saleForm.qtdChild * selectedPackage.childPrice) +
                        (saleForm.qtdSenior * selectedPackage.seniorPrice);
          
          if (total <= 0) {
              alert("Por favor, selecione pelo menos um passageiro.");
              return;
          }

          const finalPrice = Math.max(0, total - saleForm.discount);

          // Calculate Commission
          let commissionRate = saleForm.saleType === 'AGENCY' ? 0.12 : 0.01;
          let commissionValue = finalPrice * commissionRate;
          
          // Calculate Fee Value
          let cardFeeValue = 0;
          if (saleForm.paymentMethod !== 'VISTA') {
              cardFeeValue = finalPrice * (saleForm.cardFeeRate / 100);
          }

          if (editingPassenger) {
              // UPDATE EXISTING
              await updatePackagePassenger(editingPassenger.id, {
                  titularName: saleForm.name,
                  titularCpf: saleForm.cpf,
                  qtdAdult: saleForm.qtdAdult,
                  qtdChild: saleForm.qtdChild,
                  qtdSenior: saleForm.qtdSenior,
                  discount: saleForm.discount,
                  agreedPrice: finalPrice,
                  saleType: saleForm.saleType,
                  agencyName: saleForm.saleType === 'AGENCY' ? saleForm.agencyName : '',
                  agencyPhone: saleForm.saleType === 'AGENCY' ? saleForm.agencyPhone : '',
                  paxList: saleForm.saleType === 'AGENCY' ? saleForm.paxList : '',
                  commissionRate,
                  commissionValue,
                  paymentMethod: saleForm.paymentMethod,
                  transactionSource: saleForm.transactionSource,
                  installments: saleForm.installments,
                  cardFeeRate: saleForm.cardFeeRate,
                  cardFeeValue: cardFeeValue
              });
              alert("Venda atualizada com sucesso!");
              setEditingPassenger(null);
          } else {
              // 2. Check Discount Authorization (Only for new sales usually, but good to keep)
              if (saleForm.discount > 0) {
                  const authorized = window.confirm(
                      `ATENÇÃO: Você está aplicando um desconto de R$ ${saleForm.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}.\n\n` + 
                      `Todo desconto deve ser AUTORIZADO pelo gestor.\n` + 
                      `Confirma que você possui esta autorização?`
                  );
                  if (!authorized) return;
              }

              // 3. Register New
              registerPackageSale(
                  {
                      name: saleForm.name, // Will be Client Name OR Agency Contact Person
                      cpf: saleForm.cpf,
                      rg: saleForm.rg,
                      birthDate: saleForm.birthDate,
                      phone: saleForm.phone,
                      address: saleForm.address
                  },
                  {
                      packageId: selectedPackage.id,
                      qtdAdult: saleForm.qtdAdult,
                      qtdChild: saleForm.qtdChild,
                      qtdSenior: saleForm.qtdSenior,
                      discount: saleForm.discount,
                      agreedPrice: finalPrice,
                      saleType: saleForm.saleType,
                      agencyName: saleForm.saleType === 'AGENCY' ? saleForm.agencyName : undefined,
                      agencyPhone: saleForm.saleType === 'AGENCY' ? saleForm.agencyPhone : undefined,
                      paxList: saleForm.saleType === 'AGENCY' ? saleForm.paxList : undefined,
                      paymentMethod: saleForm.paymentMethod,
                      transactionSource: saleForm.transactionSource,
                      installments: saleForm.installments,
                      cardFeeRate: saleForm.cardFeeRate,
                      cardFeeValue: cardFeeValue
                  }
              );
              alert("Venda registrada com sucesso!");
          }

          // Reset
          setSaleForm({ 
              saleType: 'DIRECT', agencyName: '', agencyPhone: '', paxList: '',
              cpf: '', name: '', rg: '', birthDate: '', phone: '', address: '', qtdAdult: 0, qtdChild: 0, qtdSenior: 0, discount: 0, 
              paymentMethod: 'VISTA', transactionSource: 'MACHINE', installments: 1, cardFeeRate: 0 
          });
      }
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedPassengerForPayment && newPayment.amount > 0) {
          addPackagePayment({
              passengerId: selectedPassengerForPayment.id,
              amount: newPayment.amount,
              date: newPayment.date,
              method: newPayment.method as any,
              installments: newPayment.installments,
              notes: newPayment.notes
          });
          setSelectedPassengerForPayment(null);
          setNewPayment({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'PIX', installments: 1, notes: '' });
          alert('Pagamento registrado com sucesso!');
      }
  };

  const getPaymentProgress = (paid: number, total: number) => {
      if(total === 0) return 0;
      return Math.min(100, (paid / total) * 100);
  };

  // ... [PRINT FUNCTIONS OMITTED FOR BREVITY, SAME AS BEFORE] ...
  const handlePrintReceipt = (passenger: PackagePassenger) => { /* ... */ };
  const handlePrintContract = (passenger: PackagePassenger) => { /* ... */ };

  if (selectedPackage) {
      // DETAILS VIEW
      const passengers = packagePassengers.filter(p => p.packageId === selectedPackage.id);
      const totalRevenuePotential = passengers.reduce((sum, p) => sum + p.agreedPrice, 0);
      const totalRevenueCollected = passengers.reduce((sum, p) => sum + p.paidAmount, 0);
      const totalCommission = passengers.reduce((sum, p) => sum + (p.commissionValue || 0), 0);

      // Calculations for the current form state (Preview)
      const currentTotal = (saleForm.qtdAdult * selectedPackage.adultPrice) + 
                           (saleForm.qtdChild * selectedPackage.childPrice) + 
                           (saleForm.qtdSenior * selectedPackage.seniorPrice);
      const currentFinal = Math.max(0, currentTotal - saleForm.discount);
      const estimatedCommission = currentFinal * (saleForm.saleType === 'AGENCY' ? 0.12 : 0.01);
      
      const estimatedCardFee = (saleForm.paymentMethod !== 'VISTA') 
          ? currentFinal * (saleForm.cardFeeRate / 100)
          : 0;

      return (
          <div className="space-y-6 animate-fade-in">
              <button 
                onClick={() => setSelectedPackage(null)}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium mb-4"
              >
                  &larr; Voltar para Pacotes
              </button>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-emerald-600 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                          <h2 className="text-3xl font-bold">{selectedPackage.title}</h2>
                          <p className="opacity-90 mt-1">📅 Saída: {new Date(selectedPackage.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right text-xs md:text-sm bg-white/10 p-3 rounded-lg backdrop-blur-sm space-y-1">
                          <p>Adulto: <span className="font-bold">R$ {selectedPackage.adultPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                          <p>Criança: <span className="font-bold">R$ {selectedPackage.childPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                          <p>Melhor Idade: <span className="font-bold">R$ {selectedPackage.seniorPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                      </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                          <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center">
                              Vendas Realizadas ({passengers.length})
                          </h3>
                          
                          {/* REGISTER SALE FORM */}
                          <div className={`p-5 rounded-xl border mb-8 shadow-sm transition-colors ${editingPassenger ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`} id="sale-form-anchor">
                              <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                                  <h4 className={`font-bold ${editingPassenger ? 'text-blue-700' : 'text-slate-700'}`}>
                                      {editingPassenger ? '✏️ Editando Venda Existente' : '➕ Nova Venda / Reserva'}
                                  </h4>
                                  {editingPassenger && (
                                      <button onClick={handleCancelEdit} className="text-xs text-red-500 font-bold hover:underline">
                                          Cancelar Edição
                                      </button>
                                  )}
                              </div>
                              <form onSubmit={handleRegisterSale}>
                                  
                                  {/* TYPE OF SALE & PAYMENT METHOD SELECTION */}
                                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-white p-3 rounded border border-slate-200">
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Canal de Venda</label>
                                          <div className="flex gap-4">
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                  <input 
                                                    type="radio" name="saleType" value="DIRECT"
                                                    checked={saleForm.saleType === 'DIRECT'}
                                                    onChange={() => setSaleForm({...saleForm, saleType: 'DIRECT'})}
                                                    className="text-emerald-600 focus:ring-emerald-500"
                                                  />
                                                  <span className="text-sm font-medium">Venda Direta</span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                  <input 
                                                    type="radio" name="saleType" value="AGENCY"
                                                    checked={saleForm.saleType === 'AGENCY'}
                                                    onChange={() => setSaleForm({...saleForm, saleType: 'AGENCY'})}
                                                    className="text-emerald-600 focus:ring-emerald-500"
                                                  />
                                                  <span className="text-sm font-medium">Agência</span>
                                              </label>
                                          </div>
                                      </div>

                                      <div className="bg-white p-3 rounded border border-slate-200">
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Método de Pagamento</label>
                                          <div className="flex flex-col gap-2">
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                  <input 
                                                    type="radio" name="paymentMethod" value="VISTA"
                                                    checked={saleForm.paymentMethod === 'VISTA'}
                                                    onChange={() => {
                                                        setSaleForm({...saleForm, paymentMethod: 'VISTA', cardFeeRate: 0, installments: 1});
                                                    }}
                                                    className="text-emerald-600 focus:ring-emerald-500"
                                                  />
                                                  <span className="text-sm font-medium">À Vista (Din/Pix)</span>
                                              </label>
                                              <div className="flex gap-4">
                                                  <label className="flex items-center gap-2 cursor-pointer">
                                                      <input 
                                                        type="radio" name="paymentMethod" value="CARTAO_DEBITO"
                                                        checked={saleForm.paymentMethod === 'CARTAO_DEBITO'}
                                                        onChange={() => {
                                                            setSaleForm({...saleForm, paymentMethod: 'CARTAO_DEBITO', discount: 0, installments: 1});
                                                        }}
                                                        className="text-emerald-600 focus:ring-emerald-500"
                                                      />
                                                      <span className="text-sm font-medium">Débito</span>
                                                  </label>
                                                  <label className="flex items-center gap-2 cursor-pointer">
                                                      <input 
                                                        type="radio" name="paymentMethod" value="CARTAO_CREDITO"
                                                        checked={saleForm.paymentMethod === 'CARTAO_CREDITO'}
                                                        onChange={() => {
                                                            setSaleForm({...saleForm, paymentMethod: 'CARTAO_CREDITO', discount: 0, installments: 1});
                                                        }}
                                                        className="text-emerald-600 focus:ring-emerald-500"
                                                      />
                                                      <span className="text-sm font-medium">Crédito</span>
                                                  </label>
                                              </div>
                                          </div>
                                          
                                          {/* Payment Details Sub-section */}
                                          {saleForm.paymentMethod !== 'VISTA' && (
                                              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 animate-fade-in">
                                                  <div>
                                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Origem</label>
                                                      <select 
                                                          value={saleForm.transactionSource}
                                                          onChange={e => setSaleForm({...saleForm, transactionSource: e.target.value as any})}
                                                          className="w-full border p-1 rounded text-xs bg-slate-50"
                                                      >
                                                          <option value="MACHINE">Maquininha</option>
                                                          <option value="LINK">Link Pagto</option>
                                                      </select>
                                                  </div>
                                                  {saleForm.paymentMethod === 'CARTAO_CREDITO' && (
                                                      <div>
                                                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Parcelas</label>
                                                          <select 
                                                              value={saleForm.installments}
                                                              onChange={e => setSaleForm({...saleForm, installments: parseInt(e.target.value)})}
                                                              className="w-full border p-1 rounded text-xs bg-slate-50"
                                                          >
                                                              {Array.from({length: 12}, (_, i) => i + 1).map(num => (
                                                                  <option key={num} value={num}>{num}x</option>
                                                              ))}
                                                          </select>
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">CPF / CNPJ (Contratante)</label>
                                          <input 
                                            value={saleForm.cpf} onChange={e => setSaleForm({...saleForm, cpf: e.target.value})}
                                            onBlur={handleCpfBlur}
                                            className="w-full border p-2 rounded text-sm" placeholder="Documento" required
                                          />
                                      </div>
                                      <div className="md:col-span-2">
                                          <label className="text-xs font-bold text-slate-500">{saleForm.saleType === 'AGENCY' ? 'Nome do Contato na Agência' : 'Nome Completo Cliente'}</label>
                                          <input 
                                            value={saleForm.name} onChange={e => setSaleForm({...saleForm, name: e.target.value})}
                                            className="w-full border p-2 rounded text-sm" required
                                          />
                                      </div>
                                      
                                      {/* AGENCY SPECIFIC FIELDS */}
                                      {saleForm.saleType === 'AGENCY' && (
                                          <>
                                              <div className="md:col-span-2">
                                                  <label className="text-xs font-bold text-slate-500">Nome da Agência</label>
                                                  <input 
                                                    value={saleForm.agencyName} onChange={e => setSaleForm({...saleForm, agencyName: e.target.value})}
                                                    className="w-full border p-2 rounded text-sm" required
                                                  />
                                              </div>
                                              <div>
                                                  <label className="text-xs font-bold text-slate-500">Telefone Agência</label>
                                                  <input 
                                                    value={saleForm.agencyPhone} onChange={e => setSaleForm({...saleForm, agencyPhone: e.target.value})}
                                                    className="w-full border p-2 rounded text-sm"
                                                  />
                                              </div>
                                              <div className="md:col-span-3">
                                                  <label className="text-xs font-bold text-slate-500">Lista de Passageiros (Nome e Telefone)</label>
                                                  <textarea 
                                                    value={saleForm.paxList} onChange={e => setSaleForm({...saleForm, paxList: e.target.value})}
                                                    className="w-full border p-2 rounded text-sm h-20"
                                                    placeholder="Ex: João Silva - (24) 99999-9999&#10;Maria Souza - (24) 88888-8888"
                                                  />
                                              </div>
                                          </>
                                      )}

                                      {/* COMMON FIELDS */}
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">RG (Responsável)</label>
                                          <input 
                                            value={saleForm.rg} onChange={e => setSaleForm({...saleForm, rg: e.target.value})}
                                            className="w-full border p-2 rounded text-sm"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">Data Nasc.</label>
                                          <input 
                                            type="date"
                                            value={saleForm.birthDate} onChange={e => setSaleForm({...saleForm, birthDate: e.target.value})}
                                            className="w-full border p-2 rounded text-sm" required
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">Telefone</label>
                                          <input 
                                            value={saleForm.phone} onChange={e => setSaleForm({...saleForm, phone: e.target.value})}
                                            className="w-full border p-2 rounded text-sm" placeholder="(00) 00000-0000"
                                          />
                                      </div>
                                      <div className="md:col-span-3">
                                          <label className="text-xs font-bold text-slate-500">Endereço Completo</label>
                                          <input 
                                            value={saleForm.address} onChange={e => setSaleForm({...saleForm, address: e.target.value})}
                                            className="w-full border p-2 rounded text-sm"
                                          />
                                      </div>
                                  </div>

                                  <div className="bg-white p-3 rounded border border-slate-200 mb-4">
                                      <h5 className="text-xs font-bold text-slate-500 mb-2 uppercase">Quantidades e Valores</h5>
                                      <div className="grid grid-cols-3 gap-4 mb-3">
                                          <div className="text-center">
                                              <label className="block text-xs text-slate-500">Adultos</label>
                                              <input type="number" min="0" className="border p-1 rounded w-full text-center" 
                                                value={saleForm.qtdAdult} onChange={e => setSaleForm({...saleForm, qtdAdult: parseInt(e.target.value) || 0})}
                                              />
                                          </div>
                                          <div className="text-center">
                                              <label className="block text-xs text-slate-500">Crianças</label>
                                              <input type="number" min="0" className="border p-1 rounded w-full text-center" 
                                                value={saleForm.qtdChild} onChange={e => setSaleForm({...saleForm, qtdChild: parseInt(e.target.value) || 0})}
                                              />
                                          </div>
                                          <div className="text-center">
                                              <label className="block text-xs text-slate-500">Melhor Idade</label>
                                              <input type="number" min="0" className="border p-1 rounded w-full text-center" 
                                                value={saleForm.qtdSenior} onChange={e => setSaleForm({...saleForm, qtdSenior: parseInt(e.target.value) || 0})}
                                              />
                                          </div>
                                      </div>
                                      
                                      <div className="flex justify-between items-center border-t border-slate-100 pt-2 gap-4">
                                          <div className="flex-1">
                                              {saleForm.paymentMethod === 'VISTA' ? (
                                                  <div className="flex flex-col">
                                                      <label className="text-xs font-bold text-green-600 mr-2">Desconto à Vista (R$)</label>
                                                      <div className="flex items-center border border-green-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-green-500">
                                                          <span className="bg-green-100 text-green-600 px-2 py-1 font-bold border-r border-green-300 text-xs">R$</span>
                                                          <input 
                                                            type="text" 
                                                            inputMode="numeric"
                                                            className="p-1 outline-none text-right font-medium text-green-700 w-full" 
                                                            value={saleForm.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                            onChange={e => handleDiscountChange(e.target.value)}
                                                            placeholder="0,00"
                                                          />
                                                      </div>
                                                  </div>
                                              ) : (
                                                  <div className="flex flex-col bg-red-50 p-2 rounded border border-red-100">
                                                      <div className="flex justify-between items-center mb-1">
                                                          <label className="text-xs font-bold text-red-600">Taxa Calculada</label>
                                                          <span className="text-xs font-bold text-red-800">{saleForm.cardFeeRate}%</span>
                                                      </div>
                                                      {estimatedCardFee > 0 && (
                                                          <p className="text-[10px] text-red-500 mt-1 font-bold">
                                                              Custo da Taxa: R$ {estimatedCardFee.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                          </p>
                                                      )}
                                                  </div>
                                              )}
                                          </div>

                                          <div className="text-right">
                                              <span className="text-xs text-slate-500 block">Total a Pagar</span>
                                              <span className="text-lg font-bold text-emerald-600">R$ {currentFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                              <span className="text-xs text-slate-400 block mt-1">Comissão Estimada: R$ {estimatedCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                          </div>
                                      </div>
                                  </div>

                                  <button type="submit" className={`w-full text-white px-4 py-3 rounded font-bold text-sm shadow-md transition-colors ${editingPassenger ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                                      {editingPassenger ? 'Salvar Alterações' : 'Registrar Venda'}
                                  </button>
                              </form>
                          </div>

                          {/* LIST OF SALES */}
                          <div className="space-y-3">
                              {passengers.map(p => {
                                  const progress = getPaymentProgress(p.paidAmount, p.agreedPrice);
                                  const client = clients.find(c => c.id === p.clientId);
                                  return (
                                      <div key={p.id} className={`bg-white border p-4 rounded-lg hover:shadow-md transition-shadow relative ${editingPassenger?.id === p.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                                          <div className="absolute top-2 right-2 flex gap-1">
                                              {p.saleType === 'AGENCY' && (
                                                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold uppercase border border-purple-200">
                                                      Agência
                                                  </span>
                                              )}
                                              {p.paymentMethod === 'CARTAO_CREDITO' || p.paymentMethod === 'CARTAO_DEBITO' ? (
                                                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold uppercase border border-orange-200">
                                                      {p.paymentMethod === 'CARTAO_CREDITO' ? `Crédito ${p.installments}x` : 'Débito'}
                                                  </span>
                                              ) : (
                                                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase border border-green-200">
                                                      À Vista
                                                  </span>
                                              )}
                                          </div>

                                          <div className="flex justify-between items-start mb-2">
                                              <div>
                                                  <div className="flex items-center gap-2">
                                                      <span className="font-bold text-slate-800 text-lg">{p.titularName}</span>
                                                      <button 
                                                        onClick={() => client && setViewHistoryClient(client)}
                                                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
                                                        title="Ver histórico de viagens"
                                                      >
                                                          📜 Histórico
                                                      </button>
                                                  </div>
                                                  <p className="text-xs text-slate-500">CPF: {p.titularCpf}</p>
                                                  <div className="mt-1 flex gap-2 text-xs font-medium text-slate-600">
                                                      {p.qtdAdult > 0 && <span className="bg-slate-100 px-2 py-0.5 rounded">Adultos: {p.qtdAdult}</span>}
                                                      {p.qtdChild > 0 && <span className="bg-slate-100 px-2 py-0.5 rounded">Crianças: {p.qtdChild}</span>}
                                                      {p.qtdSenior > 0 && <span className="bg-slate-100 px-2 py-0.5 rounded">Melhor Idade: {p.qtdSenior}</span>}
                                                  </div>
                                                  {p.paxList && (
                                                      <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-100">
                                                          <strong>PAX Agência:</strong><br/>
                                                          {p.paxList}
                                                      </div>
                                                  )}
                                              </div>
                                              <div className="text-right mt-6">
                                                  <span className={`block text-xs font-bold mb-1 ${p.status === 'PAID' ? 'text-emerald-600' : p.status === 'PARTIAL' ? 'text-blue-600' : 'text-orange-500'}`}>
                                                      {p.status === 'PAID' ? 'QUITADO' : p.status === 'PARTIAL' ? 'PARCIAL' : 'PENDENTE'}
                                                  </span>
                                                  <p className="font-bold text-slate-800">R$ {p.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                                  {p.discount > 0 && <p className="text-xs text-green-600 font-bold">- Desc: R$ {p.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>}
                                                  {p.cardFeeValue && p.cardFeeValue > 0 && (
                                                      <p className="text-[10px] text-red-500 font-bold mt-1">
                                                          Taxa ({p.cardFeeRate}%): R$ {p.cardFeeValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                      </p>
                                                  )}
                                              </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-4 mt-3">
                                              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                                                  <div className={`h-2.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{width: `${progress}%`}}></div>
                                              </div>
                                              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                                  Pago: R$ {p.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                              </span>
                                          </div>
                                          
                                          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                              <div className="flex gap-2">
                                                  <button 
                                                      onClick={() => handlePrintReceipt(p)}
                                                      className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 rounded transition-colors"
                                                      title="Imprimir Recibo"
                                                  >
                                                      🖨️ Recibo
                                                  </button>
                                                  <button 
                                                      onClick={() => handlePrintContract(p)}
                                                      className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 rounded transition-colors"
                                                      title="Imprimir Contrato"
                                                  >
                                                      📄 Contrato
                                                  </button>
                                                  <button 
                                                      onClick={() => handleEditPassenger(p)}
                                                      className="text-xs flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1.5 rounded transition-colors border border-blue-200"
                                                      title="Editar Venda"
                                                  >
                                                      ✏️ Editar
                                                  </button>
                                                  <button 
                                                      onClick={() => handleDeletePassenger(p)}
                                                      className="text-xs flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1.5 rounded transition-colors border border-red-200"
                                                      title="Excluir Venda"
                                                  >
                                                      🗑️ Excluir
                                                  </button>
                                              </div>

                                              {p.status !== 'PAID' && (
                                                  <button 
                                                      onClick={() => { setSelectedPassengerForPayment(p); setNewPayment({...newPayment, amount: p.agreedPrice - p.paidAmount}); }}
                                                      className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded hover:bg-emerald-700 font-medium"
                                                  >
                                                      Registrar Pagamento
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  )
                              })}
                              {passengers.length === 0 && <p className="text-slate-400 italic text-center py-4">Nenhuma venda registrada.</p>}
                          </div>
                      </div>

                      {/* SUMMARY PANEL */}
                      <div className="bg-slate-50 p-6 rounded-xl h-fit border border-slate-200">
                          <h3 className="font-bold text-slate-800 mb-4">Resumo do Pacote</h3>
                          <div className="space-y-4">
                              <div>
                                  <p className="text-sm text-slate-500">Valor Total Vendido</p>
                                  <p className="text-2xl font-bold text-slate-800">R$ {totalRevenuePotential.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                              <div>
                                  <p className="text-sm text-slate-500">Valor Recebido (Caixa)</p>
                                  <p className="text-2xl font-bold text-emerald-600">R$ {totalRevenueCollected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                              <div className="border-t border-slate-200 pt-2">
                                  <p className="text-sm text-slate-500">Comissões a Pagar (Total)</p>
                                  <p className="text-xl font-bold text-purple-600">R$ {totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                              <div className="pt-4 border-t border-slate-200">
                                  <p className="text-sm text-slate-500 mb-1">A Receber</p>
                                  <p className="text-xl font-bold text-red-500">R$ {(totalRevenuePotential - totalRevenueCollected).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* PAYMENT MODAL */}
              {selectedPassengerForPayment && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
                          <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                              <h3 className="font-bold">Registrar Pagamento</h3>
                              <button onClick={() => setSelectedPassengerForPayment(null)} className="text-slate-400 hover:text-white">✕</button>
                          </div>
                          <div className="p-6">
                              <p className="text-sm text-slate-500 mb-1">Titular: <span className="font-bold text-slate-800">{selectedPassengerForPayment.titularName}</span></p>
                              <p className="text-sm text-slate-500 mb-4">Restante a Pagar: <span className="font-bold text-red-600">R$ {(selectedPassengerForPayment.agreedPrice - selectedPassengerForPayment.paidAmount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                              
                              <form onSubmit={handleRegisterPayment} className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                                      <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500">
                                          <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-r border-slate-300">R$</span>
                                          <input 
                                            type="text"
                                            inputMode="numeric"
                                            required
                                            value={newPayment.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                                            onChange={e => handlePaymentAmountChange(e.target.value)}
                                            className="w-full p-2 outline-none text-right font-bold text-slate-800"
                                            placeholder="0,00"
                                          />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                                      <input 
                                        type="date" required
                                        value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                                        className="w-full border p-2 rounded"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método</label>
                                      <select 
                                        value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value as any})}
                                        className="w-full border p-2 rounded"
                                      >
                                          <option value="PIX">Pix</option>
                                          <option value="DINHEIRO">Dinheiro (Espécie)</option>
                                          <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                          <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                      </select>
                                  </div>
                                  {newPayment.method === 'CARTAO_CREDITO' && (
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parcelas</label>
                                          <input 
                                            type="number" min="1" max="12"
                                            value={newPayment.installments} onChange={e => setNewPayment({...newPayment, installments: parseInt(e.target.value)})}
                                            className="w-full border p-2 rounded"
                                          />
                                      </div>
                                  )}
                                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded hover:bg-emerald-700 mt-2">
                                      Confirmar Recebimento
                                  </button>
                              </form>
                          </div>
                      </div>
                  </div>
              )}

              {/* CLIENT HISTORY MODAL */}
              {viewHistoryClient && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-bounce-in">
                          <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                              <h3 className="font-bold">Histórico: {viewHistoryClient.name}</h3>
                              <button onClick={() => setViewHistoryClient(null)} className="text-slate-400 hover:text-white">✕</button>
                          </div>
                          <div className="p-6">
                              <div className="mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded">
                                  <p><strong>CPF:</strong> {viewHistoryClient.cpf}</p>
                                  <p><strong>Tel:</strong> {viewHistoryClient.phone}</p>
                                  <p><strong>Endereço:</strong> {viewHistoryClient.address}</p>
                              </div>
                              <h4 className="font-bold text-slate-700 mb-2 border-b pb-1">Viagens Realizadas</h4>
                              <div className="max-h-60 overflow-y-auto space-y-2">
                                  {packagePassengers
                                    .filter(p => p.clientId === viewHistoryClient.id)
                                    .map(p => {
                                        const pkg = travelPackages.find(tp => tp.id === p.packageId);
                                        return (
                                            <div key={p.id} className="border border-slate-200 p-3 rounded hover:bg-slate-50">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-800">{pkg?.title}</span>
                                                    <span className="text-xs text-slate-500">{pkg ? new Date(pkg.date).toLocaleDateString() : 'N/A'}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {p.qtdAdult} Ad, {p.qtdChild} Cri, {p.qtdSenior} Ido • Total: R$ {p.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                </p>
                                            </div>
                                        )
                                    })
                                  }
                                  {packagePassengers.filter(p => p.clientId === viewHistoryClient.id).length === 0 && (
                                      <p className="text-center text-slate-400 italic py-4">Nenhuma viagem anterior encontrada.</p>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // LIST VIEW
  return (
    <div className="space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Pacotes de Viagem</h2>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowLeadsModal(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-1"
                >
                    📋 Interessados / CRM
                </button>
                <button 
                    onClick={() => setShowCommissionReport(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-1"
                >
                    💰 Relatório de Comissões
                </button>
                <button 
                    onClick={() => setShowNewPackageForm(!showNewPackageForm)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
                >
                    {showNewPackageForm ? 'Cancelar' : '+ Novo Pacote'}
                </button>
            </div>
        </div>

        {/* LEADS CRM MODAL */}
        {showLeadsModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                    <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            📋 Controle de Interessados (Prospecção)
                        </h3>
                        <button onClick={() => setShowLeadsModal(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* LEFT: FORM */}
                        <div className="w-full md:w-1/3 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto">
                            <h4 className="font-bold text-slate-700 mb-4">Cadastrar Novo Interessado</h4>
                            <form onSubmit={handleAddLead} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome</label>
                                    <input 
                                        required value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})}
                                        className="w-full border p-2 rounded text-sm" placeholder="Ex: Dona Maria"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
                                    <input 
                                        value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})}
                                        className="w-full border p-2 rounded text-sm" placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Interesse na Viagem:</label>
                                    <select 
                                        required value={newLead.packageId} onChange={e => setNewLead({...newLead, packageId: e.target.value})}
                                        className="w-full border p-2 rounded text-sm bg-white"
                                    >
                                        <option value="">Selecione...</option>
                                        {travelPackages.filter(p => p.status === 'OPEN').map(p => (
                                            <option key={p.id} value={p.id}>{p.title} ({new Date(p.date).toLocaleDateString()})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Data para Retorno (Lembrete)</label>
                                    <input 
                                        type="date" 
                                        value={newLead.callbackDate} onChange={e => setNewLead({...newLead, callbackDate: e.target.value})}
                                        className="w-full border p-2 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Observações</label>
                                    <textarea 
                                        value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})}
                                        className="w-full border p-2 rounded text-sm h-20" placeholder="Ex: Quer ir com a neta, ligar a tarde..."
                                    />
                                </div>
                                <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded font-bold text-sm hover:bg-slate-700">
                                    Salvar Interessado
                                </button>
                            </form>
                        </div>

                        {/* RIGHT: LIST */}
                        <div className="w-full md:w-2/3 p-6 overflow-y-auto bg-white">
                            {/* ALERTS SECTION */}
                            {packageLeads.some(l => isUrgent(l)) && (
                                <div className="mb-6">
                                    <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                                        ⚠️ Retornos Pendentes (Hoje ou Atrasados)
                                    </h4>
                                    <div className="space-y-2">
                                        {packageLeads.filter(l => isUrgent(l)).map(l => {
                                            const pkg = travelPackages.find(p => p.id === l.packageId);
                                            return (
                                                <div key={l.id} className="bg-red-50 border border-red-200 p-3 rounded-lg flex justify-between items-start">
                                                    <div>
                                                        <span className="font-bold text-slate-800">{l.name}</span>
                                                        <span className="text-xs text-slate-500 ml-2">{l.phone}</span>
                                                        <p className="text-xs text-red-700 font-bold mt-1">Ligar: {new Date(l.callbackDate).toLocaleDateString()}</p>
                                                        <p className="text-xs text-slate-600 mt-1">Interesse: {pkg?.title}</p>
                                                        {l.notes && <p className="text-xs text-slate-500 italic mt-1">"{l.notes}"</p>}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => updatePackageLead(l.id, {status: 'CONTACTED'})} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">Já falei</button>
                                                        <button onClick={() => deletePackageLead(l.id)} className="text-xs bg-white border border-red-200 text-red-500 px-2 py-1 rounded">✕</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">Todos os Interessados</h4>
                            <div className="space-y-3">
                                {packageLeads.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(l => {
                                    const pkg = travelPackages.find(p => p.id === l.packageId);
                                    return (
                                        <div key={l.id} className="bg-white border border-slate-200 p-3 rounded hover:shadow-sm flex flex-col md:flex-row justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">{l.name}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getLeadStatusColor(l.status)}`}>
                                                        {l.status === 'PENDING' ? 'PENDENTE' : l.status === 'CONTACTED' ? 'CONTACTADO' : l.status === 'CONVERTED' ? 'VENDIDO' : 'PERDIDO'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Tel: {l.phone} • Interesse: <strong>{pkg?.title}</strong></p>
                                                {l.callbackDate && <p className="text-xs text-slate-400 mt-1">Retorno: {new Date(l.callbackDate).toLocaleDateString()}</p>}
                                                {l.notes && <p className="text-xs text-slate-500 italic bg-slate-50 p-1 rounded mt-1 border border-slate-100">{l.notes}</p>}
                                            </div>
                                            <div className="flex items-start gap-2 flex-wrap">
                                                <select 
                                                    value={l.status}
                                                    onChange={(e) => updatePackageLead(l.id, {status: e.target.value as any})}
                                                    className="text-xs border p-1 rounded bg-slate-50"
                                                >
                                                    <option value="PENDING">Pendente</option>
                                                    <option value="CONTACTED">Contactado</option>
                                                    <option value="CONVERTED">Venda Feita</option>
                                                    <option value="LOST">Desistiu</option>
                                                </select>
                                                <button onClick={() => deletePackageLead(l.id)} className="text-slate-400 hover:text-red-500">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {packageLeads.length === 0 && <p className="text-center text-slate-400 py-4 italic">Nenhum interessado cadastrado.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* COMMISSION REPORT MODAL */}
        {showCommissionReport && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                    <div className="bg-purple-800 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold text-lg">Relatório de Comissões</h3>
                        <button onClick={() => setShowCommissionReport(false)} className="text-purple-200 hover:text-white text-xl">&times;</button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                <p className="text-purple-800 text-xs font-bold uppercase">Total Comissões Geradas</p>
                                <p className="text-2xl font-bold text-purple-900">
                                    R$ {packagePassengers.reduce((sum, p) => sum + (p.commissionValue || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                <p className="text-emerald-800 text-xs font-bold uppercase">Total em Vendas</p>
                                <p className="text-2xl font-bold text-emerald-900">
                                    R$ {packagePassengers.reduce((sum, p) => sum + p.agreedPrice, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </p>
                            </div>
                        </div>

                        <h4 className="font-bold text-slate-700 mb-2">Detalhamento por Venda</h4>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Cliente / Agência</th>
                                        <th className="p-3">Pacote</th>
                                        <th className="p-3">Tipo</th>
                                        <th className="p-3 text-right">Valor Venda</th>
                                        <th className="p-3 text-right">%</th>
                                        <th className="p-3 text-right">Comissão</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {packagePassengers.map(p => {
                                        const pkg = travelPackages.find(tp => tp.id === p.packageId);
                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50">
                                                <td className="p-3">
                                                    <span className="font-medium text-slate-800">{p.titularName}</span>
                                                    {p.agencyName && <span className="block text-xs text-purple-600">{p.agencyName}</span>}
                                                </td>
                                                <td className="p-3 text-slate-600">{pkg?.title}</td>
                                                <td className="p-3">
                                                    {p.saleType === 'AGENCY' ? 
                                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">Agência</span> : 
                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">Direta</span>
                                                    }
                                                </td>
                                                <td className="p-3 text-right font-medium">R$ {p.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-right text-slate-500">{(p.commissionRate || 0) * 100}%</td>
                                                <td className="p-3 text-right font-bold text-green-600">R$ {(p.commissionValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                            </tr>
                                        );
                                    })}
                                    {packagePassengers.length === 0 && (
                                        <tr><td colSpan={6} className="p-6 text-center text-slate-400">Nenhuma venda com comissão registrada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 border-t border-slate-200 text-right">
                        <button onClick={() => window.print()} className="text-sm bg-white border border-slate-300 px-3 py-2 rounded hover:bg-slate-100 mr-2">Imprimir Relatório</button>
                        <button onClick={() => setShowCommissionReport(false)} className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 font-bold text-sm">Fechar</button>
                    </div>
                </div>
            </div>
        )}

        {showNewPackageForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                <h3 className="font-bold text-lg mb-4 text-slate-700">Criar Novo Pacote de Viagem</h3>
                <form onSubmit={handleCreatePackage} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Pacote</label>
                            <input 
                                value={newPkg.title} onChange={e => setNewPkg({...newPkg, title: e.target.value})}
                                placeholder="Ex: Beto Carrero World" required
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data da Viagem</label>
                            <input 
                                type="date" value={newPkg.date} onChange={e => setNewPkg({...newPkg, date: e.target.value})}
                                required
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Adulto (R$)</label>
                            <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500">
                                <span className="bg-slate-100 text-slate-600 px-2 py-2 font-bold border-r border-slate-300 text-xs">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    required
                                    value={newPkg.adultPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                                    onChange={e => handlePkgPriceChange('adultPrice', e.target.value)}
                                    className="w-full p-2 outline-none text-right font-bold text-slate-800 text-sm"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Criança (R$)</label>
                            <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500">
                                <span className="bg-slate-100 text-slate-600 px-2 py-2 font-bold border-r border-slate-300 text-xs">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    required
                                    value={newPkg.childPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                                    onChange={e => handlePkgPriceChange('childPrice', e.target.value)}
                                    className="w-full p-2 outline-none text-right font-bold text-slate-800 text-sm"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Melhor Idade (R$)</label>
                            <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500">
                                <span className="bg-slate-100 text-slate-600 px-2 py-2 font-bold border-r border-slate-300 text-xs">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    required
                                    value={newPkg.seniorPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                                    onChange={e => handlePkgPriceChange('seniorPrice', e.target.value)}
                                    className="w-full p-2 outline-none text-right font-bold text-slate-800 text-sm"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded font-bold hover:bg-slate-700">
                        Salvar Pacote
                    </button>
                </form>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {travelPackages.map(pkg => {
                const paxCount = packagePassengers.filter(p => p.packageId === pkg.id).length;
                return (
                    <div 
                        key={pkg.id} 
                        onClick={() => setSelectedPackage(pkg)}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-all group"
                    >
                        <div className="h-2 w-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors"></div>
                        <div className="p-5">
                            <h3 className="text-xl font-bold text-slate-800 mb-1">{pkg.title}</h3>
                            <p className="text-sm text-slate-500 mb-3">
                                📅 {new Date(pkg.date).toLocaleDateString()}
                            </p>
                            
                            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600 mb-4">
                                <span className="bg-slate-100 px-2 py-1 rounded">Adulto: R$ {pkg.adultPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                <span className="bg-slate-100 px-2 py-1 rounded">Criança: R$ {pkg.childPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    {paxCount} Passageiros
                                </span>
                                <span className="text-slate-400 text-sm group-hover:translate-x-1 transition-transform">
                                    Gerenciar &rarr;
                                </span>
                            </div>
                        </div>
                    </div>
                )
            })}
            {travelPackages.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                    <p>Nenhum pacote de viagem cadastrado.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default TravelPackagesView;
