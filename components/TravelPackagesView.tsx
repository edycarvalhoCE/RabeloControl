import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { PackagePassenger, TravelPackage, Client } from '../types';

const TravelPackagesView: React.FC = () => {
  const { travelPackages, packagePassengers, packagePayments, clients, addTravelPackage, registerPackageSale, addPackagePayment } = useStore();
  
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null);
  const [showNewPackageForm, setShowNewPackageForm] = useState(false);
  
  // Create Package Form
  const [newPkg, setNewPkg] = useState({ title: '', date: '', adultPrice: 0, childPrice: 0, seniorPrice: 0 });

  // Sale/Passenger Form State
  const [saleForm, setSaleForm] = useState({
      cpf: '',
      name: '',
      rg: '',
      birthDate: '',
      phone: '',
      address: '',
      qtdAdult: 0,
      qtdChild: 0,
      qtdSenior: 0,
      discount: 0
  });

  // Client History Modal
  const [viewHistoryClient, setViewHistoryClient] = useState<Client | null>(null);

  // Payment Modal
  const [selectedPassengerForPayment, setSelectedPassengerForPayment] = useState<PackagePassenger | null>(null);
  const [newPayment, setNewPayment] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'PIX', installments: 1, notes: '' });

  // --- Handlers ---

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if(newPkg.title && newPkg.date) {
        addTravelPackage(newPkg);
        setShowNewPackageForm(false);
        setNewPkg({ title: '', date: '', adultPrice: 0, childPrice: 0, seniorPrice: 0 });
    }
  };

  const handleCpfBlur = () => {
      // Auto-fill client data if exists
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

  const handleRegisterSale = (e: React.FormEvent) => {
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

          // 2. Check Discount Authorization
          if (saleForm.discount > 0) {
              const authorized = window.confirm(
                  `ATENÇÃO: Você está aplicando um desconto de R$ ${saleForm.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}.\n\n` + 
                  `Todo desconto deve ser AUTORIZADO pelo gestor.\n` + 
                  `Confirma que você possui esta autorização?`
              );
              if (!authorized) return;
          }

          const finalPrice = Math.max(0, total - saleForm.discount);

          // 3. Register
          registerPackageSale(
              {
                  name: saleForm.name,
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
                  agreedPrice: finalPrice
              }
          );

          // Reset
          setSaleForm({ cpf: '', name: '', rg: '', birthDate: '', phone: '', address: '', qtdAdult: 0, qtdChild: 0, qtdSenior: 0, discount: 0 });
          alert("Venda registrada com sucesso!");
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

  if (selectedPackage) {
      // DETAILS VIEW
      const passengers = packagePassengers.filter(p => p.packageId === selectedPackage.id);
      const totalRevenuePotential = passengers.reduce((sum, p) => sum + p.agreedPrice, 0);
      const totalRevenueCollected = passengers.reduce((sum, p) => sum + p.paidAmount, 0);

      // Calculations for the current form state (Preview)
      const currentTotal = (saleForm.qtdAdult * selectedPackage.adultPrice) + 
                           (saleForm.qtdChild * selectedPackage.childPrice) +
                           (saleForm.qtdSenior * selectedPackage.seniorPrice);
      const currentFinal = Math.max(0, currentTotal - saleForm.discount);

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
                          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8 shadow-sm">
                              <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Nova Venda / Reserva</h4>
                              <form onSubmit={handleRegisterSale}>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">CPF (Titular)</label>
                                          <input 
                                            value={saleForm.cpf} onChange={e => setSaleForm({...saleForm, cpf: e.target.value})}
                                            onBlur={handleCpfBlur}
                                            className="w-full border p-2 rounded text-sm" placeholder="000.000.000-00" required
                                          />
                                      </div>
                                      <div className="md:col-span-2">
                                          <label className="text-xs font-bold text-slate-500">Nome Completo</label>
                                          <input 
                                            value={saleForm.name} onChange={e => setSaleForm({...saleForm, name: e.target.value})}
                                            className="w-full border p-2 rounded text-sm" required
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">RG</label>
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
                                      <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                                          <div className="flex flex-col">
                                              <label className="text-xs font-bold text-slate-500 mr-2">Desconto (R$)</label>
                                              <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500 w-32">
                                                  <span className="bg-slate-100 text-slate-600 px-2 py-1 font-bold border-r border-slate-300 text-xs">R$</span>
                                                  <input 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    className="p-1 outline-none text-right font-medium text-red-600 w-full" 
                                                    value={saleForm.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                    onChange={e => handleDiscountChange(e.target.value)}
                                                    placeholder="0,00"
                                                  />
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <span className="text-xs text-slate-500 block">Total a Pagar</span>
                                              <span className="text-lg font-bold text-emerald-600">R$ {currentFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                          </div>
                                      </div>
                                  </div>

                                  <button type="submit" className="w-full bg-slate-800 text-white px-4 py-3 rounded font-bold text-sm hover:bg-slate-700 shadow-md">
                                      Registrar Venda
                                  </button>
                              </form>
                          </div>

                          {/* LIST OF SALES */}
                          <div className="space-y-3">
                              {passengers.map(p => {
                                  const progress = getPaymentProgress(p.paidAmount, p.agreedPrice);
                                  const client = clients.find(c => c.id === p.clientId);
                                  return (
                                      <div key={p.id} className="bg-white border border-slate-200 p-4 rounded-lg hover:shadow-md transition-shadow">
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
                                              </div>
                                              <div className="text-right">
                                                  <span className={`block text-xs font-bold mb-1 ${p.status === 'PAID' ? 'text-emerald-600' : p.status === 'PARTIAL' ? 'text-blue-600' : 'text-orange-500'}`}>
                                                      {p.status === 'PAID' ? 'QUITADO' : p.status === 'PARTIAL' ? 'PARCIAL' : 'PENDENTE'}
                                                  </span>
                                                  <p className="font-bold text-slate-800">R$ {p.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                                  {p.discount > 0 && <p className="text-xs text-red-500">- Desc: R$ {p.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>}
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
                                          
                                          {p.status !== 'PAID' && (
                                              <div className="mt-3 flex justify-end">
                                                  <button 
                                                      onClick={() => { setSelectedPassengerForPayment(p); setNewPayment({...newPayment, amount: p.agreedPrice - p.paidAmount}); }}
                                                      className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded hover:bg-emerald-700 font-medium"
                                                  >
                                                      Registrar Pagamento
                                                  </button>
                                              </div>
                                          )}
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
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Pacotes de Viagem</h2>
            <button 
                onClick={() => setShowNewPackageForm(!showNewPackageForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
            >
                {showNewPackageForm ? 'Cancelar' : '+ Novo Pacote'}
            </button>
        </div>

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