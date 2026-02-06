
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { PackagePassenger, TravelPackage, Client, PackagePayment } from '../types';

const TravelPackagesView: React.FC = () => {
  const { 
    travelPackages, packagePassengers, packagePayments, clients, 
    addTravelPackage, registerPackageSale, updatePackagePassenger, 
    deletePackagePassenger, addPackagePayment, currentUser, 
    settings
  } = useStore();
  
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null);
  const [showNewPackageForm, setShowNewPackageForm] = useState(false);
  const [showCommissionReport, setShowCommissionReport] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState<PackagePassenger | null>(null);
  const [isSavingSale, setIsSavingSale] = useState(false);
  
  const [editingPassenger, setEditingPassenger] = useState<PackagePassenger | null>(null);
  const [newPkg, setNewPkg] = useState({ title: '', date: '', adultPrice: 0, divisionPrice: 0, childPrice: 0, seniorPrice: 0 });

  const [financeModal, setFinanceModal] = useState<{ open: boolean, passenger: PackagePassenger | null }>({ open: false, passenger: null });
  const [financeForm, setFinanceForm] = useState({ amount: 0, method: 'PIX', notes: '' });

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

  const calculateTotals = () => {
      if (!selectedPackage) return { gross: 0, discount: 0, final: 0, net: 0, feeRate: 0, commission: 0 };
      
      const gross = (saleForm.qtdAdult * selectedPackage.adultPrice) + 
                    (saleForm.qtdChild * selectedPackage.childPrice) +
                    (saleForm.qtdSenior * selectedPackage.seniorPrice);
      
      const discount = saleForm.discountType === 'PERCENT' 
        ? (gross * (saleForm.discountInput / 100)) 
        : saleForm.discountInput;
      
      const final = Math.max(0, gross - discount);

      // Puxar Taxas Administrativas do Settings
      let feeRate = 0;
      const rates = settings?.paymentRates;
      if (rates) {
        if (saleForm.paymentMethod === 'CARTAO_MAQUININHA') feeRate = rates.maquininha.creditCash;
        if (saleForm.paymentMethod === 'LINK_PAGAMENTO') feeRate = rates.ecommerce.creditCash;
        if (saleForm.paymentMethod === 'SITE') feeRate = rates.site.creditCash;
      }
      
      const feeValue = final * (feeRate / 100);
      const netAfterFees = final - feeValue;

      // Calcular Comissão baseada no Canal de Venda
      let commissionRate = 0.01; // Direct 1%
      if (saleForm.saleType === 'AGENCY') commissionRate = 0.12;
      if (saleForm.saleType === 'PROMOTER') commissionRate = 0.10;
      
      const commission = final * commissionRate;

      return { gross, discount, final, net: netAfterFees, feeRate, commission };
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

  // Fix: Added missing handleEditPassenger function to populate the form with existing passenger data
  const handleEditPassenger = (p: PackagePassenger) => {
      setEditingPassenger(p);
      const client = clients.find(c => c.id === p.clientId);
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
      const el = document.getElementById('sale-form-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFinanceAction = async (e: React.FormEvent) => {
      e.preventDefault();
      const { passenger } = financeModal;
      if (!passenger || financeForm.amount === 0) return;
      try {
          await addPackagePayment({
              passengerId: passenger.id,
              amount: financeForm.amount,
              date: new Date().toISOString().split('T')[0],
              method: financeForm.method,
              notes: financeForm.notes
          });
          alert("Pagamento registrado!");
          setFinanceModal({ open: false, passenger: null });
          setFinanceForm({ amount: 0, method: 'PIX', notes: '' });
      } catch (err) { alert("Erro processar financeiro."); }
  };

  const numeroParaExtenso = (valor: number) => {
    const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    return `A quantia de ${formatador.format(valor).replace('R$', '')} reais.`.replace('.', ',');
  };

  const handlePrintReceipt = (payment: PackagePayment, passenger: PackagePassenger) => {
    const pkg = travelPackages.find(tp => tp.id === passenger.packageId);
    const client = clients.find(c => c.id === passenger.clientId);
    const today = new Date(payment.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const win = window.open('', '', 'width=900,height=800');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Recibo - ${passenger.titularName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.2; }
            .header-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
            .logo-area { width: 250px; }
            .logo-img { height: 70px; }
            .since-tag { background: #2e2e77; color: white; padding: 2px 8px; font-size: 10px; font-weight: bold; border-radius: 4px; display: inline-block; margin-top: 5px; }
            .receipt-title { font-size: 24px; font-weight: bold; font-style: italic; color: #333; text-decoration: underline; }
            .code-box { border: 1px solid #ccc; padding: 5px 15px; font-weight: bold; display: inline-block; min-width: 100px; }
            .price-box { border: 1px solid #ccc; padding: 5px 25px; font-size: 22px; font-weight: bold; background: #f9f9f9; display: inline-block; min-width: 150px; }
            .client-info { margin: 20px 0; border-top: 1px solid #eee; padding-top: 15px; font-size: 13px; }
            .client-row { display: flex; margin-bottom: 8px; }
            .client-label { font-weight: bold; width: 100px; }
            .data-grid { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
            .data-grid td { border: 1px solid #ddd; padding: 8px; }
            .grid-label { font-weight: bold; background: #f5f5f5; width: 15%; }
            .written-line { font-size: 18px; margin: 30px 0; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature-area { text-align: center; border-top: 1px solid #ccc; width: 300px; padding-top: 10px; font-size: 12px; }
            .signature-img { font-family: 'Great Vibes', cursive; font-size: 40px; color: #2e2e77; margin-bottom: -10px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="logo-area"><img src="${settings.logoUrl || './logo.png'}" class="logo-img" /><br><div class="since-tag">Desde 1992</div></td>
              <td style="text-align: center;"><div class="receipt-title">RECIBO</div></td>
              <td style="text-align: right; vertical-align: top;">
                <div style="margin-bottom: 10px;">CÓDIGO: <span class="code-box">${payment.id.slice(-4)}</span></div>
                <div>R$ <span class="price-box">${Math.abs(payment.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
              </td>
            </tr>
          </table>
          <div class="client-info">
            <div class="client-row"><span class="client-label">Cliente:</span> <span>${passenger.titularName}</span></div>
            <div class="client-row"><span class="client-label">CPF/CNPJ:</span> <span>${passenger.titularCpf}</span> <span style="margin-left: 100px; font-weight: bold;">Telefone:</span> <span>${client?.phone || ''}</span></div>
            <div class="client-row"><span class="client-label">Endereço:</span> <span>${client?.address || ''}</span></div>
          </div>
          <table class="data-grid">
            <tr><td class="grid-label">Vencimento:</td><td>${new Date(payment.date).toLocaleDateString()}</td><td class="grid-label">Pago:</td><td style="text-align: center;">[ X ]</td><td class="grid-label">Data:</td><td>${new Date(payment.date).toLocaleDateString()}</td><td class="grid-label">Vendedor:</td><td>${currentUser.name}</td></tr>
            <tr><td class="grid-label">Centro Receita:</td><td colspan="7">Recebimento de Passagens/Pacotes - Viagens/Serviços Receitas</td></tr>
            <tr><td class="grid-label">Histórico:</td><td colspan="7">Pagamento referente ao pacote: ${pkg?.title}</td></tr>
          </table>
          <div class="written-line">Recebemos em: <b>${payment.method}</b>, a quantia de <b>${numeroParaExtenso(Math.abs(payment.amount))}</b></div>
          <div class="footer"><div><p>Petrópolis - RJ</p><p style="text-transform: capitalize;">${today}</p></div><div class="signature-area"><div class="signature-img">Ros Rabelo</div>EMPRESA</div></div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (selectedPackage) {
      const paxs = packagePassengers.filter(p => p.packageId === selectedPackage.id);
      const { gross, final, discount, commission, feeRate } = calculateTotals();

      return (
          <div className="space-y-6 animate-fade-in pb-20">
              <button onClick={() => setSelectedPackage(null)} className="text-slate-500 hover:text-slate-800 font-black mb-4">&larr; VOLTAR</button>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
                      <div><h2 className="text-2xl font-black uppercase">{selectedPackage.title}</h2><p className="opacity-70 text-xs">Saída: {new Date(selectedPackage.date).toLocaleDateString()}</p></div>
                      <button onClick={() => setShowCommissionReport(true)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold border border-white/20">💰 Relatório Comissões</button>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-8">
                          {/* FORMULÁRIO DE NOVA VENDA COMPLETO */}
                          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="sale-form-anchor">
                              <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2"><span className="text-xl">➕</span><h3 className="font-bold text-slate-700">Nova Venda / Registro Completo</h3></div>
                              <form onSubmit={handleRegisterSale} className="p-6 space-y-6">
                                  {/* Canal de Venda */}
                                  <div className="p-4 border rounded-xl bg-slate-50/50">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Canal de Venda</p>
                                      <div className="flex flex-wrap gap-6 mb-4">
                                          {[
                                              { id: 'DIRECT', label: 'Venda Direta (1%)' },
                                              { id: 'AGENCY', label: 'Agência (12%)' },
                                              { id: 'PROMOTER', label: 'Promotor (10%)' }
                                          ].map(opt => (
                                              <label key={opt.id} className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-600">
                                                  <input type="radio" checked={saleForm.saleType === opt.id} onChange={() => setSaleForm({...saleForm, saleType: opt.id as any})} />
                                                  {opt.label}
                                              </label>
                                          ))}
                                      </div>
                                      {saleForm.saleType !== 'DIRECT' && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in p-4 bg-white border border-blue-100 rounded-lg">
                                              <div><label className="text-[10px] font-bold text-blue-500 uppercase">Nome do Parceiro</label><input required value={saleForm.agencyName} onChange={e => setSaleForm({...saleForm, agencyName: e.target.value})} className="w-full border p-2 rounded text-sm font-bold border-blue-200" /></div>
                                              <div><label className="text-[10px] font-bold text-blue-500 uppercase">Telefone Parceiro</label><input value={saleForm.agencyPhone} onChange={e => setSaleForm({...saleForm, agencyPhone: e.target.value})} className="w-full border p-2 rounded text-sm border-blue-200" /></div>
                                          </div>
                                      )}
                                  </div>

                                  {/* Dados do Cliente */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div><label className="text-[10px] font-bold text-slate-400 uppercase">CPF / CNPJ</label><input required value={saleForm.cpf} onChange={e => setSaleForm({...saleForm, cpf: e.target.value})} className="w-full border p-2 rounded text-sm" /></div>
                                      <div><label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label><input required value={saleForm.name} onChange={e => setSaleForm({...saleForm, name: e.target.value})} className="w-full border p-2 rounded text-sm" /></div>
                                      <div><label className="text-[10px] font-bold text-slate-400 uppercase">RG</label><input value={saleForm.rg} onChange={e => setSaleForm({...saleForm, rg: e.target.value})} className="w-full border p-2 rounded text-sm" /></div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Data Nasc.</label><input type="date" value={saleForm.birthDate} onChange={e => setSaleForm({...saleForm, birthDate: e.target.value})} className="w-full border p-2 rounded text-sm" /></div>
                                          <div><label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label><input value={saleForm.phone} onChange={e => setSaleForm({...saleForm, phone: e.target.value})} className="w-full border p-2 rounded text-sm" /></div>
                                      </div>
                                      <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase">Endereço Completo</label><input value={saleForm.address} onChange={e => setSaleForm({...saleForm, address: e.target.value})} className="w-full border p-2 rounded text-sm" /></div>
                                  </div>

                                  {/* Financeiro da Venda */}
                                  <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                                      <div className="grid grid-cols-3 gap-4 text-center bg-slate-50 p-3 rounded-lg">
                                          <div><p className="text-[9px] font-bold text-slate-400">Adultos</p><input type="number" min="0" value={saleForm.qtdAdult} onChange={e => setSaleForm({...saleForm, qtdAdult: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded text-center font-bold" /></div>
                                          <div><p className="text-[9px] font-bold text-slate-400">Crianças</p><input type="number" min="0" value={saleForm.qtdChild} onChange={e => setSaleForm({...saleForm, qtdChild: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded text-center font-bold" /></div>
                                          <div><p className="text-[9px] font-bold text-slate-400">Idosos</p><input type="number" min="0" value={saleForm.qtdSenior} onChange={e => setSaleForm({...saleForm, qtdSenior: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded text-center font-bold" /></div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                          <div>
                                              <label className="text-[10px] font-bold text-slate-400 uppercase">Método</label>
                                              <select value={saleForm.paymentMethod} onChange={e => setSaleForm({...saleForm, paymentMethod: e.target.value})} className="w-full border p-2 rounded text-sm bg-white font-bold">
                                                  <option value="PIX_DESCONTO">PIX / Dinheiro (Desconto)</option>
                                                  <option value="CARTAO_MAQUININHA">Cartão (Maquininha)</option>
                                                  <option value="LINK_PAGAMENTO">Link Pagamento</option>
                                                  <option value="SITE">Site (Integrado)</option>
                                                  <option value="LINK_EXTERNO">Link Externo (Sem Taxa)</option>
                                              </select>
                                          </div>
                                          <div>
                                              <label className="text-[10px] font-bold text-slate-400 uppercase">Desconto</label>
                                              <select value={saleForm.discountType} onChange={e => setSaleForm({...saleForm, discountType: e.target.value as any})} className="w-full border p-2 rounded text-sm bg-white">
                                                  <option value="VALUE">Valor R$</option><option value="PERCENT">Porcentagem %</option>
                                              </select>
                                          </div>
                                          <div>
                                              <input type="number" value={saleForm.discountInput} onChange={e => setSaleForm({...saleForm, discountInput: parseFloat(e.target.value) || 0})} className="w-full border p-2 rounded text-right font-bold text-red-600" />
                                          </div>
                                      </div>

                                      <div className="bg-slate-100 p-4 rounded-xl space-y-2 border border-slate-200">
                                          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Bruto:</span><span>R$ {gross.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                                          <div className="flex justify-between text-xs font-bold text-red-500 uppercase"><span>Desconto:</span><span>- R$ {discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                                          <div className="flex justify-between text-lg font-black text-slate-800 border-t pt-2"><span>Total Cliente:</span><span className="text-emerald-700">R$ {final.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                                          <div className="flex justify-between text-[10px] font-bold text-blue-600 italic"><span>Taxa Adm ({feeRate}%):</span><span>- R$ {(final * (feeRate/100)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                                          <div className="flex justify-between text-[10px] font-bold text-purple-600 italic"><span>Comissão Canal ({saleForm.saleType}):</span><span>R$ {commission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                                      </div>
                                  </div>

                                  <button type="submit" disabled={isSavingSale} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg hover:bg-black transition-all">
                                      {isSavingSale ? 'PROCESSANDO...' : 'CONFIRMAR REGISTRO DE VENDA'}
                                  </button>
                              </form>
                          </div>

                          {/* LISTA DE VENDAS */}
                          <div className="space-y-4">
                              <h3 className="font-bold text-xl text-slate-800">Vendas Realizadas ({paxs.length})</h3>
                              {paxs.map(p => {
                                  const perc = (p.paidAmount / p.agreedPrice) * 100;
                                  return (
                                      <div key={p.id} className="bg-white border border-slate-200 p-5 rounded-2xl hover:shadow-lg transition-all">
                                          <div className="flex justify-between items-start mb-4">
                                              <div>
                                                <p className="font-black text-slate-800 text-lg uppercase leading-none">{p.titularName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">CPF: {p.titularCpf} • {p.saleType} {p.agencyName && `(${p.agencyName})`}</p>
                                              </div>
                                              <div className="text-right">
                                                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                                      {p.status === 'PAID' ? 'QUITADO' : 'PENDENTE'}
                                                  </span>
                                                  <p className="text-xl font-black text-slate-900 mt-1">R$ {p.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                              </div>
                                          </div>
                                          
                                          <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden">
                                              <div className="h-full bg-emerald-500 transition-all duration-700" style={{width: `${Math.min(100, perc)}%`}}></div>
                                          </div>

                                          <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
                                              <button onClick={() => setShowPaymentHistory(p)} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase">Financeiro / Recibos 🧾</button>
                                              <button onClick={() => handleEditPassenger(p)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase">Editar</button>
                                              
                                              <div className="ml-auto flex gap-2">
                                                  <button onClick={() => setFinanceModal({ open: true, passenger: p })} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg uppercase">Receber 💰</button>
                                              </div>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>

                      <div className="space-y-6">
                          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl sticky top-6">
                              <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest border-b pb-4">Resumo do Grupo</h3>
                              <div className="space-y-4">
                                  <div><p className="text-[9px] text-slate-400 font-bold uppercase">Volume Total Vendido</p><p className="text-2xl font-black text-slate-900 leading-none">R$ {paxs.reduce((acc,p) => acc+p.agreedPrice, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                                  <div><p className="text-[9px] text-emerald-500 font-bold uppercase">Total em Caixa</p><p className="text-2xl font-black text-emerald-600 leading-none">R$ {paxs.reduce((acc,p) => acc+p.paidAmount, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                                  <div><p className="text-[9px] text-blue-600 font-bold uppercase">Total Comissões Previstas</p><p className="text-xl font-black text-blue-800 leading-none">R$ {paxs.reduce((acc,p) => acc+(p.commissionValue || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* MODAL HISTÓRICO DE PAGAMENTOS / REEMISSÃO DE RECIBOS */}
              {showPaymentHistory && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-md">
                      <div className="bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
                          <div className="bg-blue-700 p-8 text-white flex justify-between items-center shrink-0">
                              <div><h3 className="font-black text-2xl tracking-tight">Financeiro / Recibos</h3><p className="text-xs opacity-70 uppercase font-bold mt-1">{showPaymentHistory.titularName}</p></div>
                              <button onClick={() => setShowPaymentHistory(null)} className="text-3xl">&times;</button>
                          </div>
                          <div className="p-8 overflow-y-auto bg-slate-50 flex-1 space-y-4">
                              {packagePayments.filter(pay => pay.passengerId === showPaymentHistory.id).map(pay => (
                                  <div key={pay.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center">
                                      <div>
                                          <p className="text-xs text-slate-400 font-bold uppercase">Lançamento em {new Date(pay.date).toLocaleDateString()}</p>
                                          <p className="text-lg font-black text-slate-800">R$ {pay.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                          <p className="text-[10px] text-blue-600 font-bold uppercase">{pay.method}</p>
                                      </div>
                                      <button onClick={() => handlePrintReceipt(pay, showPaymentHistory)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black">Imprimir Recibo 🖨️</button>
                                  </div>
                              ))}
                              {packagePayments.filter(pay => pay.passengerId === showPaymentHistory.id).length === 0 && (
                                  <p className="text-center py-10 text-slate-400 italic">Nenhum pagamento registrado ainda.</p>
                              )}
                          </div>
                      </div>
                  </div>
              )}

              {/* MODAL FINANCEIRO: LANÇAR RECEBIMENTO */}
              {financeModal.open && financeModal.passenger && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in">
                      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                          <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                              <h3 className="font-black text-lg uppercase">Registrar Recebimento</h3>
                              <button onClick={() => setFinanceModal({ open: false, passenger: null })} className="text-2xl">&times;</button>
                          </div>
                          <form onSubmit={handleFinanceAction} className="p-8 space-y-6">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Valor Recebido (R$)</label>
                                  <input type="number" step="0.01" value={financeForm.amount} onChange={e => setFinanceForm({...financeForm, amount: parseFloat(e.target.value) || 0})} className="w-full border-2 p-4 rounded-2xl font-black text-2xl outline-none focus:border-blue-500" autoFocus />
                              </div>
                              <select value={financeForm.method} onChange={e => setFinanceForm({...financeForm, method: e.target.value})} className="w-full border p-3 rounded-xl font-bold">
                                  <option value="PIX">PIX</option><option value="DINHEIRO">Dinheiro</option><option value="CARTAO">Cartão</option>
                              </select>
                              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl transition-all">CONFIRMAR ✅</button>
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
            <div><h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Pacotes de Viagem</h2></div>
            <button onClick={() => setShowNewPackageForm(!showNewPackageForm)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black shadow-lg">＋ CRIAR NOVO PACOTE</button>
        </div>

        {showNewPackageForm && (
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-xl animate-fade-in">
                <form onSubmit={async (e) => { e.preventDefault(); await addTravelPackage(newPkg); alert("Pacote criado!"); setShowNewPackageForm(false); }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Título do Pacote</label><input required value={newPkg.title} onChange={e => setNewPkg({...newPkg, title: e.target.value})} className="w-full border p-3 rounded-xl font-bold" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Data</label><input type="date" required value={newPkg.date} onChange={e => setNewPkg({...newPkg, date: e.target.value})} className="w-full border p-3 rounded-xl font-bold" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-[9px] font-bold">Adulto</label><input type="number" step="0.01" value={newPkg.adultPrice} onChange={e => setNewPkg({...newPkg, adultPrice: parseFloat(e.target.value)})} className="w-full border p-2 rounded" /></div>
                        <div><label className="block text-[9px] font-bold">Criança</label><input type="number" step="0.01" value={newPkg.childPrice} onChange={e => setNewPkg({...newPkg, childPrice: parseFloat(e.target.value)})} className="w-full border p-2 rounded" /></div>
                        <div><label className="block text-[9px] font-bold">Melhor Idade</label><input type="number" step="0.01" value={newPkg.seniorPrice} onChange={e => setNewPkg({...newPkg, seniorPrice: parseFloat(e.target.value)})} className="w-full border p-2 rounded" /></div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs">Finalizar Criação</button>
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
                            <h3 className="text-2xl font-black text-slate-800 uppercase group-hover:text-emerald-700 transition-colors leading-tight">{pkg.title}</h3>
                            <p className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest mt-1">📅 {new Date(pkg.date).toLocaleDateString()}</p>
                            <div className="flex justify-between items-center pt-6 border-t">
                                <div className="font-black text-[10px] text-emerald-600 uppercase">👤 {count} VENDAS</div>
                                <span className="text-slate-900 font-black text-[10px] uppercase group-hover:translate-x-1 transition-transform">Gerenciar &rarr;</span>
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
