
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { PackagePassenger, TravelPackage, Client, PackageLead, PackagePayment } from '../types';

const TravelPackagesView: React.FC = () => {
  const { 
    travelPackages, packagePassengers, packagePayments, clients, 
    addTravelPackage, registerPackageSale, updatePackagePassenger, 
    deletePackagePassenger, addPackagePayment, currentUser, 
    packageLeads, addPackageLead, updatePackageLead, deletePackageLead, 
    settings, addTransaction
  } = useStore();
  
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null);
  const [showNewPackageForm, setShowNewPackageForm] = useState(false);
  const [showCommissionReport, setShowCommissionReport] = useState(false);
  const [isSavingSale, setIsSavingSale] = useState(false);
  
  const [editingPassenger, setEditingPassenger] = useState<PackagePassenger | null>(null);
  const [newPkg, setNewPkg] = useState({ title: '', date: '', adultPrice: 0, childPrice: 0, seniorPrice: 0 });

  // Modal de Ação Financeira (Receber ou Devolver)
  const [financeModal, setFinanceModal] = useState<{ 
    open: boolean, 
    type: 'PAY' | 'REFUND', 
    passenger: PackagePassenger | null 
  }>({ open: false, type: 'PAY', passenger: null });

  const [financeForm, setFinanceForm] = useState({ amount: 0, method: 'PIX_DESCONTO', notes: '' });

  // Formulário de Venda (Idêntico à imagem + Campos de Parceiro)
  const [saleForm, setSaleForm] = useState({
      saleType: 'DIRECT' as 'DIRECT' | 'AGENCY' | 'PROMOTER',
      agencyName: '',
      agencyPhone: '',
      paxList: '',
      cpf: '',
      name: '',
      rg: '',
      birthDate: '',
      phone: '',
      address: '',
      qtdAdult: 0,
      qtdChild: 0,
      qtdSenior: 0,
      paymentMethod: 'PIX_DESCONTO',
      discountType: 'VALUE' as 'VALUE' | 'PERCENT',
      discountInput: 0,
  });

  const handleEditPassenger = (p: PackagePassenger) => {
      const client = clients.find(c => c.id === p.clientId);
      setEditingPassenger(p);
      setSaleForm({
          saleType: p.saleType || 'DIRECT',
          agencyName: p.agencyName || '',
          agencyPhone: p.agencyPhone || '',
          paxList: p.paxList || '',
          cpf: p.titularCpf,
          name: p.titularName,
          rg: client?.rg || '',
          birthDate: client?.birthDate || '',
          phone: client?.phone || '',
          address: client?.address || '',
          qtdAdult: p.qtdAdult,
          qtdChild: p.qtdChild,
          qtdSenior: p.qtdSenior,
          paymentMethod: p.paymentMethod || 'PIX_DESCONTO',
          discountType: 'VALUE',
          discountInput: p.discount,
      });
      document.getElementById('sale-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const calculateTotals = () => {
      if (!selectedPackage) return { gross: 0, discount: 0, final: 0, net: 0, feeRate: 0, commission: 0 };
      const gross = (saleForm.qtdAdult * selectedPackage.adultPrice) + 
                    (saleForm.qtdChild * selectedPackage.childPrice) +
                    (saleForm.qtdSenior * selectedPackage.seniorPrice);
      
      const discount = saleForm.discountType === 'PERCENT' ? (gross * (saleForm.discountInput / 100)) : saleForm.discountInput;
      const final = Math.max(0, gross - discount);

      // Taxas Adm baseadas no método
      let feeRate = 0;
      const rates = settings?.paymentRates;
      if (rates) {
        if (saleForm.paymentMethod === 'CARTAO_MAQUININHA') feeRate = rates.maquininha.creditCash;
        if (saleForm.paymentMethod === 'LINK_PAGAMENTO') feeRate = rates.ecommerce.creditCash;
        if (saleForm.paymentMethod === 'SITE') feeRate = rates.site.creditCash;
      }
      const net = final - (final * (feeRate / 100));

      // Cálculo de Comissão
      let commissionRate = 0.01; // Venda Direta
      if (saleForm.saleType === 'AGENCY') commissionRate = 0.12;
      if (saleForm.saleType === 'PROMOTER') commissionRate = 0.10;
      const commission = final * commissionRate;

      return { gross, discount, final, net, feeRate, commission };
  };

  const handleRegisterSale = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPackage) return;
      const { final, commission, discount } = calculateTotals();
      setIsSavingSale(true);
      try {
          const clientData = { 
            name: saleForm.name, cpf: saleForm.cpf, rg: saleForm.rg, 
            birthDate: saleForm.birthDate, phone: saleForm.phone, address: saleForm.address 
          };
          const saleData = {
              packageId: selectedPackage.id,
              qtdAdult: saleForm.qtdAdult, qtdChild: saleForm.qtdChild, qtdSenior: saleForm.qtdSenior,
              discount: discount, agreedPrice: final,
              saleType: saleForm.saleType, 
              agencyName: saleForm.agencyName,
              agencyPhone: saleForm.agencyPhone,
              paxList: saleForm.paxList,
              commissionValue: commission,
              paymentMethod: saleForm.paymentMethod
          };

          if (editingPassenger) {
              await updatePackagePassenger(editingPassenger.id, { ...saleData, titularName: saleForm.name, titularCpf: saleForm.cpf });
              alert("Registro atualizado!");
              setEditingPassenger(null);
          } else {
              await registerPackageSale(clientData as any, saleData);
              alert("Venda registrada com sucesso!");
          }
          setSaleForm({ saleType: 'DIRECT', agencyName: '', agencyPhone: '', paxList: '', cpf: '', name: '', rg: '', birthDate: '', phone: '', address: '', qtdAdult: 0, qtdChild: 0, qtdSenior: 0, paymentMethod: 'PIX_DESCONTO', discountType: 'VALUE', discountInput: 0 });
      } catch (err) { alert("Erro ao salvar."); } finally { setIsSavingSale(false); }
  };

  const handleFinanceAction = async (e: React.FormEvent) => {
      e.preventDefault();
      const { passenger, type } = financeModal;
      if (!passenger || financeForm.amount === 0) return;

      const value = type === 'REFUND' ? -Math.abs(financeForm.amount) : Math.abs(financeForm.amount);

      try {
          await addPackagePayment({
              passengerId: passenger.id,
              amount: value,
              date: new Date().toISOString().split('T')[0],
              method: financeForm.method,
              notes: financeForm.notes
          });
          alert(type === 'REFUND' ? "Devolução registrada!" : "Pagamento registrado!");
          setFinanceModal({ open: false, type: 'PAY', passenger: null });
          setFinanceForm({ amount: 0, method: 'PIX_DESCONTO', notes: '' });
      } catch (err) { alert("Erro processar financeiro."); }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
      e.preventDefault();
      await addTravelPackage(newPkg);
      alert("Pacote criado!");
      setShowNewPackageForm(false);
  };

  if (selectedPackage) {
      const paxs = packagePassengers.filter(p => p.packageId === selectedPackage.id);
      const { gross, final, net, feeRate, commission } = calculateTotals();

      return (
          <div className="space-y-6 animate-fade-in pb-20">
              <button onClick={() => setSelectedPackage(null)} className="text-slate-500 hover:text-slate-800 font-bold mb-4 flex items-center gap-2">&larr; VOLTAR AOS PACOTES</button>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-black uppercase">{selectedPackage.title}</h2>
                        <p className="opacity-70 text-xs">Saída: {new Date(selectedPackage.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                          <button onClick={() => setShowCommissionReport(true)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold border border-white/20 transition-all">💰 Ver Comissões do Grupo</button>
                      </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-8">
                          {/* FORMULÁRIO DE NOVA VENDA / RESERVA */}
                          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" id="sale-form-anchor">
                              <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
                                  <span className="text-xl">➕</span>
                                  <h3 className="font-bold text-slate-700">{editingPassenger ? 'Editando Venda' : 'Nova Venda / Reserva'}</h3>
                              </div>
                              <form onSubmit={handleRegisterSale} className="p-6 space-y-6">
                                  {/* Canal de Venda */}
                                  <div className="p-4 border rounded-lg bg-slate-50/50">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">Canal de Venda (Comissão)</p>
                                      <div className="flex flex-wrap gap-6 mb-4">
                                          {[
                                              { id: 'DIRECT', label: 'Venda Direta (1%)' },
                                              { id: 'AGENCY', label: 'Agência (12%)' },
                                              { id: 'PROMOTER', label: 'Promotor (10%)' }
                                          ].map(opt => (
                                              <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                                                  <input 
                                                    type="radio" 
                                                    checked={saleForm.saleType === opt.id} 
                                                    onChange={() => setSaleForm({...saleForm, saleType: opt.id as any})} 
                                                    className="w-4 h-4 text-blue-600"
                                                  />
                                                  <span className="text-xs font-bold text-slate-600">{opt.label}</span>
                                              </label>
                                          ))}
                                      </div>

                                      {/* Campos Dinâmicos do Parceiro */}
                                      {saleForm.saleType !== 'DIRECT' && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in p-4 bg-white border border-blue-100 rounded-lg shadow-inner">
                                              <div>
                                                  <label className="text-[10px] font-bold text-blue-500 uppercase">{saleForm.saleType === 'AGENCY' ? 'Nome da Agência' : 'Nome do Promotor'}</label>
                                                  <input 
                                                    required 
                                                    value={saleForm.agencyName} 
                                                    onChange={e => setSaleForm({...saleForm, agencyName: e.target.value})} 
                                                    className="w-full border p-2 rounded text-sm font-bold border-blue-200" 
                                                    placeholder="Digite o nome..."
                                                  />
                                              </div>
                                              <div>
                                                  <label className="text-[10px] font-bold text-blue-500 uppercase">Telefone do Parceiro</label>
                                                  <input 
                                                    value={saleForm.agencyPhone} 
                                                    onChange={e => setSaleForm({...saleForm, agencyPhone: e.target.value})} 
                                                    className="w-full border p-2 rounded text-sm border-blue-200" 
                                                    placeholder="(00) 00000-0000"
                                                  />
                                              </div>
                                          </div>
                                      )}
                                  </div>

                                  {/* Dados do Cliente */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div><label className="text-[10px] font-bold text-slate-400 uppercase">CPF / CNPJ</label><input required value={saleForm.cpf} onChange={e => setSaleForm({...saleForm, cpf: e.target.value})} className="w-full border p-2 rounded text-sm font-medium" placeholder="Documento" /></div>
                                      <div><label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo Cliente</label><input required value={saleForm.name} onChange={e => setSaleForm({...saleForm, name: e.target.value})} className="w-full border p-2 rounded text-sm font-medium" placeholder="Nome do Cliente" /></div>
                                      <div><label className="text-[10px] font-bold text-slate-400 uppercase">RG</label><input value={saleForm.rg} onChange={e => setSaleForm({...saleForm, rg: e.target.value})} className="w-full border p-2 rounded text-sm font-medium" /></div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Data Nasc.</label><input type="date" value={saleForm.birthDate} onChange={e => setSaleForm({...saleForm, birthDate: e.target.value})} className="w-full border p-2 rounded text-sm" /></div>
                                          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label><input value={saleForm.phone} onChange={e => setSaleForm({...saleForm, phone: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="(00) 00000-0000" /></div>
                                      </div>
                                      <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Endereço Completo</label><input value={saleForm.address} onChange={e => setSaleForm({...saleForm, address: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Rua, Número, Bairro, Cidade..." /></div>
                                  </div>

                                  {/* Pagamento e Valores */}
                                  <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                                      <div className="flex items-center gap-2 mb-2"><span className="text-lg">💸</span><h4 className="text-xs font-bold text-slate-700 uppercase">Forma de Pagamento e Valores</h4></div>
                                      <div className="grid grid-cols-3 gap-4 text-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                          <div><p className="text-[9px] font-bold text-slate-400 mb-1">Adultos</p><input type="number" min="0" value={saleForm.qtdAdult} onChange={e => setSaleForm({...saleForm, qtdAdult: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded text-center font-bold" /></div>
                                          <div><p className="text-[9px] font-bold text-slate-400 mb-1">Crianças</p><input type="number" min="0" value={saleForm.qtdChild} onChange={e => setSaleForm({...saleForm, qtdChild: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded text-center font-bold" /></div>
                                          <div><p className="text-[9px] font-bold text-slate-400 mb-1">Idosos</p><input type="number" min="0" value={saleForm.qtdSenior} onChange={e => setSaleForm({...saleForm, qtdSenior: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded text-center font-bold" /></div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                          <div className="md:col-span-1">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase">Método de Pagamento</label>
                                              <select value={saleForm.paymentMethod} onChange={e => setSaleForm({...saleForm, paymentMethod: e.target.value})} className="w-full border p-2 rounded text-sm bg-white font-bold text-slate-700">
                                                  <option value="PIX_DESCONTO">PIX (Com Desconto)</option>
                                                  <option value="DINHEIRO">Dinheiro (Espécie)</option>
                                                  <option value="CARTAO_MAQUININHA">Cartão (Maquininha)</option>
                                                  <option value="LINK_PAGAMENTO">Link de Pagamento (Cartão)</option>
                                                  <option value="SITE">Site (Integrado)</option>
                                                  <option value="LINK_EXTERNO">Link Externo (Sem Taxa)</option>
                                              </select>
                                          </div>
                                          <div>
                                              <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo Desconto</label>
                                              <select value={saleForm.discountType} onChange={e => setSaleForm({...saleForm, discountType: e.target.value as any})} className="w-full border p-2 rounded text-sm bg-white">
                                                  <option value="VALUE">Valor R$</option><option value="PERCENT">Porcentagem %</option>
                                              </select>
                                          </div>
                                          <div>
                                              <label className="text-[10px] font-bold text-slate-400 uppercase">Valor Desconto</label>
                                              <input type="number" value={saleForm.discountInput} onChange={e => setSaleForm({...saleForm, discountInput: parseFloat(e.target.value) || 0})} className="w-full border p-2 rounded text-right font-bold text-red-600" />
                                          </div>
                                      </div>

                                      {/* Resumo Financeiro da Venda */}
                                      <div className="bg-slate-100 p-4 rounded-xl space-y-2 border border-slate-200">
                                          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Subtotal Bruto:</span><span className="text-slate-800">R$ {gross.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                                          <div className="flex justify-between text-lg font-black text-slate-800 border-t border-slate-200 pt-2"><span>Total p/ Cliente:</span><span className="text-emerald-700">R$ {final.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                                          <div className="flex justify-between text-[10px] font-bold text-blue-600 uppercase pt-1 italic"><span>Comissão Prevista ({saleForm.saleType}):</span><span>R$ {commission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                                      </div>
                                  </div>

                                  <button type="submit" disabled={isSavingSale} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg hover:bg-black transition-all">
                                      {isSavingSale ? 'PROCESSANDO...' : (editingPassenger ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR REGISTRO DE VENDA')}
                                  </button>
                                  {editingPassenger && (
                                      <button type="button" onClick={() => setEditingPassenger(null)} className="w-full text-slate-500 text-xs font-bold uppercase mt-2">Cancelar Edição</button>
                                  )}
                              </form>
                          </div>

                          {/* LISTA DE VENDAS */}
                          <div className="space-y-4">
                              <h3 className="font-bold text-xl text-slate-800 mb-4">Vendas Realizadas ({paxs.length})</h3>
                              {paxs.map(p => {
                                  const perc = (p.paidAmount / p.agreedPrice) * 100;
                                  return (
                                      <div key={p.id} className="bg-white border border-slate-200 p-5 rounded-2xl hover:shadow-lg transition-all relative overflow-hidden group">
                                          <div className="absolute top-4 right-5 text-right">
                                              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                                  {p.status === 'PAID' ? 'QUITADO' : 'PENDENTE'}
                                              </span>
                                              <p className="text-xl font-black text-slate-900 mt-1">R$ {p.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                          </div>
                                          <div>
                                              <p className="font-black text-slate-800 text-lg uppercase tracking-tight leading-none">{p.titularName}</p>
                                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 mb-2">CPF: {p.titularCpf} • Pax: {p.qtdAdult + p.qtdChild + p.qtdSenior}</p>
                                              {p.saleType !== 'DIRECT' && (
                                                  <p className="text-[10px] text-blue-600 font-black uppercase mb-4">Canal: {p.agencyName} ({p.saleType})</p>
                                              )}
                                              
                                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1 border border-slate-50">
                                                  <div className={`h-full transition-all duration-1000 ${perc >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{width: `${Math.min(100, perc)}%`}}></div>
                                              </div>
                                              <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">
                                                  <span>Progresso: {perc.toFixed(0)}%</span>
                                                  <span>Pago: R$ {p.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                              </div>

                                              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
                                                  <button className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black border border-slate-200 uppercase hover:bg-slate-100">Recibo</button>
                                                  <button onClick={() => handleEditPassenger(p)} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black border border-blue-200 uppercase">Editar</button>
                                                  <button onClick={() => { if(confirm('Excluir?')) deletePackagePassenger(p.id); }} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-[9px] font-black border border-red-200 uppercase">Excluir</button>
                                                  
                                                  <div className="ml-auto flex gap-2">
                                                      <button 
                                                        onClick={() => { setFinanceModal({ open: true, type: 'REFUND', passenger: p }); setFinanceForm(f => ({...f, amount: 0})); }}
                                                        className="px-4 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-orange-100 uppercase"
                                                      >
                                                          Devolver Valor ↩️
                                                      </button>
                                                      <button 
                                                        onClick={() => { setFinanceModal({ open: true, type: 'PAY', passenger: p }); setFinanceForm(f => ({...f, amount: p.agreedPrice - p.paidAmount})); }} 
                                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-100 uppercase"
                                                      >
                                                          Registrar Pagamento 💰
                                                      </button>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>

                      {/* RESUMO DO PACOTE */}
                      <div className="space-y-6">
                          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl sticky top-6">
                              <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest border-b pb-4">Resumo Geral do Grupo</h3>
                              <div className="space-y-4">
                                  <div><p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Volume Total Vendido</p><p className="text-2xl font-black text-slate-900 leading-none">R$ {paxs.reduce((acc,p) => acc+p.agreedPrice, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                                  <div><p className="text-[9px] text-emerald-500 font-bold uppercase mb-1">Total Recebido em Caixa</p><p className="text-2xl font-black text-emerald-600 leading-none">R$ {paxs.reduce((acc,p) => acc+p.paidAmount, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                                  <div><p className="text-[9px] text-blue-500 font-bold uppercase mb-1">Total Comissões Previstas</p><p className="text-xl font-black text-blue-700 leading-none">R$ {paxs.reduce((acc,p) => acc+(p.commissionValue || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                                  <div className="pt-4 border-t"><p className="text-[9px] text-red-500 font-bold uppercase mb-1">Saldo em Aberto</p><p className="text-xl font-black text-red-600">R$ {paxs.reduce((acc,p) => acc+(p.agreedPrice-p.paidAmount), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* MODAL RELATÓRIO DE COMISSÕES */}
              {showCommissionReport && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-md">
                      <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                          <div className="bg-blue-700 p-8 text-white flex justify-between items-center shrink-0">
                              <div>
                                  <h3 className="font-black text-2xl tracking-tight">Relatório de Comissões</h3>
                                  <p className="text-xs opacity-70 uppercase font-bold mt-1">{selectedPackage.title}</p>
                              </div>
                              <button onClick={() => setShowCommissionReport(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all">&times;</button>
                          </div>
                          <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
                              <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                                  <table className="w-full text-left text-sm">
                                      <thead className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                                          <tr>
                                              <th className="p-5">Parceiro / Vendedor</th>
                                              <th className="p-5">Tipo</th>
                                              <th className="p-5 text-right">Volume Venda</th>
                                              <th className="p-5 text-right">Comissão</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {(() => {
                                              // Agrupar por parceiro
                                              const grouped: any = {};
                                              paxs.forEach(p => {
                                                  const key = p.agencyName || 'Venda Direta';
                                                  if (!grouped[key]) grouped[key] = { name: key, type: p.saleType, totalSales: 0, totalCommission: 0 };
                                                  grouped[key].totalSales += p.agreedPrice;
                                                  grouped[key].totalCommission += (p.commissionValue || 0);
                                              });
                                              return Object.values(grouped).map((g: any) => (
                                                  <tr key={g.name} className="hover:bg-blue-50 transition-colors">
                                                      <td className="p-5 font-black text-slate-800 text-base">{g.name}</td>
                                                      <td className="p-5">
                                                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500">{g.type}</span>
                                                      </td>
                                                      <td className="p-5 text-right font-bold text-slate-600">R$ {g.totalSales.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                      <td className="p-5 text-right font-black text-emerald-600 text-lg">R$ {g.totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                  </tr>
                                              ));
                                          })()}
                                      </tbody>
                                  </table>
                              </div>
                              {paxs.length === 0 && (
                                  <p className="text-center text-slate-400 py-10 italic">Nenhuma venda registrada para este pacote.</p>
                              )}
                          </div>
                          <div className="bg-slate-100 p-6 flex justify-end gap-3">
                              <button onClick={() => setShowCommissionReport(false)} className="px-8 py-3 bg-slate-900 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest">Fechar Relatório</button>
                          </div>
                      </div>
                  </div>
              )}

              {/* MODAL FINANCEIRO: PAGAR OU DEVOLVER */}
              {financeModal.open && financeModal.passenger && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-sm">
                      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                          <div className={`p-6 text-white flex justify-between items-center ${financeModal.type === 'REFUND' ? 'bg-orange-600' : 'bg-slate-900'}`}>
                              <div>
                                <h3 className="font-black text-lg uppercase tracking-tight">{financeModal.type === 'REFUND' ? '⚠️ Estornar / Devolver' : '💰 Registrar Pagamento'}</h3>
                                <p className="text-[10px] opacity-70 uppercase font-bold">{financeModal.passenger.titularName}</p>
                              </div>
                              <button onClick={() => setFinanceModal({ open: false, type: 'PAY', passenger: null })} className="text-2xl">&times;</button>
                          </div>
                          <form onSubmit={handleFinanceAction} className="p-8 space-y-6">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Qual o Valor?</label>
                                  <div className="flex items-center border-2 border-slate-100 rounded-2xl overflow-hidden focus-within:border-blue-500 transition-all bg-slate-50">
                                      <span className="px-4 py-4 font-black text-slate-400 border-r border-slate-100">R$</span>
                                      <input 
                                        type="number" step="0.01" value={financeForm.amount} 
                                        onChange={e => setFinanceForm({...financeForm, amount: parseFloat(e.target.value) || 0})} 
                                        className="w-full p-4 font-black text-2xl text-slate-800 outline-none bg-transparent" autoFocus 
                                      />
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Método Utilizado</label>
                                  <select 
                                    value={financeForm.method} onChange={e => setFinanceForm({...financeForm, method: e.target.value})}
                                    className="w-full border p-3 rounded-xl font-bold text-slate-700 bg-white"
                                  >
                                      <option value="PIX_DESCONTO">PIX</option><option value="DINHEIRO">Espécie</option><option value="CARTAO">Cartão</option><option value="TRANSFERENCIA">TED/DOC</option>
                                  </select>
                              </div>

                              <button type="submit" className={`w-full text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 text-lg ${financeModal.type === 'REFUND' ? 'bg-orange-600' : 'bg-emerald-600'}`}>
                                  CONFIRMAR OPERAÇÃO {financeModal.type === 'REFUND' ? '↩️' : '✅'}
                              </button>
                          </form>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
            <div><h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Pacotes de Viagem</h2><p className="text-slate-500 font-medium text-xs mt-1 uppercase tracking-widest">Controle de excursões e grupos turísticos.</p></div>
            <button onClick={() => setShowNewPackageForm(!showNewPackageForm)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-slate-200">＋ CRIAR NOVO PACOTE</button>
        </div>

        {showNewPackageForm && (
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-xl animate-fade-in">
                <h3 className="font-black text-lg text-slate-800 mb-6 uppercase border-b pb-4">Novo Roteiro</h3>
                <form onSubmit={handleCreatePackage} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Título do Pacote</label><input required placeholder="Ex: Beto Carrero 2026" value={newPkg.title} onChange={e => setNewPkg({...newPkg, title: e.target.value})} className="w-full border p-3 rounded-xl font-bold" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Data Saída</label><input type="date" required value={newPkg.date} onChange={e => setNewPkg({...newPkg, date: e.target.value})} className="w-full border p-3 rounded-xl font-bold" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Preço AD</label><input type="number" step="0.01" value={newPkg.adultPrice} onChange={e => setNewPkg({...newPkg, adultPrice: parseFloat(e.target.value)})} className="w-full border p-3 rounded-xl font-black text-emerald-700" /></div>
                        <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Preço CR</label><input type="number" step="0.01" value={newPkg.childPrice} onChange={e => setNewPkg({...newPkg, childPrice: parseFloat(e.target.value)})} className="w-full border p-3 rounded-xl font-black text-blue-700" /></div>
                        <div><label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Melhor Idade</label><input type="number" step="0.01" value={newPkg.seniorPrice} onChange={e => setNewPkg({...newPkg, seniorPrice: parseFloat(e.target.value)})} className="w-full border p-3 rounded-xl font-black text-purple-700" /></div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Finalizar Criação</button>
                </form>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {travelPackages.map(pkg => {
                const count = packagePassengers.filter(p => p.packageId === pkg.id).length;
                return (
                    <div key={pkg.id} onClick={() => setSelectedPackage(pkg)} className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all group">
                        <div className="h-3 w-full bg-slate-900 group-hover:bg-emerald-500 transition-colors"></div>
                        <div className="p-8">
                            <h3 className="text-2xl font-black text-slate-800 leading-tight uppercase group-hover:text-emerald-700 transition-colors">{pkg.title}</h3>
                            <p className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest mt-1">📅 {new Date(pkg.date).toLocaleDateString()}</p>
                            <div className="flex flex-wrap gap-2 text-[9px] font-black text-slate-500 mb-8 uppercase">
                                <span className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">AD: R$ {pkg.adultPrice}</span>
                                <span className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">CR: R$ {pkg.childPrice}</span>
                            </div>
                            <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-2 font-black text-[10px] text-emerald-600 uppercase tracking-tighter"><span>👤</span>{count} VENDAS</div>
                                <span className="text-slate-900 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">Gerenciar &rarr;</span>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );
};

export default TravelPackagesView;
