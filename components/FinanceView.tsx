
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { UserRole, DriverLiability, DriverFee, PaymentRateProfile } from '../types';

const FinanceView: React.FC = () => {
  const { transactions, addTransaction, users, addDriverLiability, driverLiabilities, payDriverLiability, driverFees, addDriverFee, payDriverFee, deleteDriverFee, settings, updateSettings, currentUser } = useStore();
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [activeTab, setActiveTab] = useState<'CASHBOOK' | 'LIABILITIES' | 'FEES' | 'RATES'>('CASHBOOK');

  // --- RATES CONFIG STATE ---
  const [rateForm, setRateForm] = useState<{
      maquininha: PaymentRateProfile;
      ecommerce: PaymentRateProfile;
      site: PaymentRateProfile;
  }>({
      maquininha: { debit: 0, creditCash: 0, creditInstallment2to6: 0, creditInstallment7to12: 0 },
      ecommerce: { debit: 0, creditCash: 0, creditInstallment2to6: 0, creditInstallment7to12: 0 },
      site: { debit: 0, creditCash: 0, creditInstallment2to6: 0, creditInstallment7to12: 0 }
  });

  // Load existing rates on mount/tab change
  useEffect(() => {
      if (settings?.paymentRates) {
          setRateForm(settings.paymentRates);
      }
  }, [settings]);

  // --- MANUAL TRANSACTION STATE ---
  const [newTrans, setNewTrans] = useState({ 
      description: '', 
      amount: 0, 
      type: 'INCOME', 
      category: '', 
      status: 'COMPLETED',
      date: new Date().toISOString().split('T')[0],
      nfe: '',
      paymentMethod: 'PIX' as 'PIX' | 'BOLETO' | 'CARTAO_CREDITO' | 'DINHEIRO' | 'OUTROS'
  });
  
  // Installment State
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);

  // --- LIABILITY STATE ---
  const [liabilityForm, setLiabilityForm] = useState({
      driverId: '',
      type: 'AVARIA' as 'AVARIA' | 'MULTA',
      date: new Date().toISOString().split('T')[0],
      description: '', 
      amount: 0,
      installments: 1,
      createExpense: true 
  });

  // --- DRIVER FEE STATE ---
  const [feeForm, setFeeForm] = useState({
      driverId: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: ''
  });
  
  // --- DRIVER FEE FILTER STATE ---
  const [feeDriverFilter, setFeeDriverFilter] = useState('');
  const [feeStartDate, setFeeStartDate] = useState(''); // New
  const [feeEndDate, setFeeEndDate] = useState('');     // New

  // --- RECEIVE PAYMENT MODAL STATE ---
  const [paymentModal, setPaymentModal] = useState<{ open: boolean, liability: DriverLiability | null, amount: number }>({ open: false, liability: null, amount: 0 });

  const drivers = users.filter(u => 
      u.role === UserRole.DRIVER || 
      u.role === 'MOTORISTA' || 
      u.role === 'DRIVER' ||
      u.role === 'Motorista'
  );

  const canManageRates = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.DEVELOPER || currentUser.role === UserRole.FINANCE;

  // --- FILTERS ---
  const realizedTransactions = transactions
    .filter(t => t.status === 'COMPLETED')
    .filter(t => filter === 'ALL' ? true : t.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingTransactions = transactions
    .filter(t => t.status === 'PENDING')
    .filter(t => filter === 'ALL' ? true : t.type === filter)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- FEES FILTER LOGIC ---
  const filteredFees = driverFees.filter(fee => {
      const matchDriver = feeDriverFilter ? fee.driverId === feeDriverFilter : true;
      const matchStart = feeStartDate ? fee.date >= feeStartDate : true;
      const matchEnd = feeEndDate ? fee.date <= feeEndDate : true;
      
      return matchDriver && matchStart && matchEnd;
  }).sort((a,b) => {
      // Sort Pending first, then by date descending
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const totalFeesPending = filteredFees.filter(f => f.status === 'PENDING').reduce((acc, f) => acc + f.amount, 0);
  const totalFeesPaid = filteredFees.filter(f => f.status === 'PAID').reduce((acc, f) => acc + f.amount, 0);

  // --- HANDLERS ---

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Logic for Installments (Parcelado) vs Single (À Vista)
    if (isInstallment && installmentsCount > 1) {
        // Calculate amount per installment
        const totalAmount = newTrans.amount;
        const installmentValue = totalAmount / installmentsCount;

        for (let i = 0; i < installmentsCount; i++) {
            const transDate = new Date(newTrans.date);
            transDate.setMonth(transDate.getMonth() + i); // Add months for subsequent installments
            
            const payload = {
                ...newTrans,
                amount: installmentValue,
                type: newTrans.type as 'INCOME' | 'EXPENSE',
                date: transDate.toISOString().split('T')[0],
                // For future installments, set as PENDING. First one keeps selected status (usually COMPLETED if paid now)
                status: (i > 0) ? 'PENDING' : newTrans.status as 'COMPLETED' | 'PENDING',
                description: `${newTrans.description}`,
                installment: {
                    current: i + 1,
                    total: installmentsCount
                }
            };
            addTransaction(payload);
        }
        alert(`${installmentsCount} parcelas lançadas com sucesso!`);
    } else {
        // Single Transaction
        const payload = {
            ...newTrans,
            type: newTrans.type as 'INCOME' | 'EXPENSE',
            status: newTrans.status as 'COMPLETED' | 'PENDING'
        };
        addTransaction(payload);
        alert('Lançamento realizado!');
    }

    // Reset Form
    setNewTrans({ 
        description: '', amount: 0, type: 'INCOME', category: '', status: 'COMPLETED', date: new Date().toISOString().split('T')[0], nfe: '', paymentMethod: 'PIX' 
    });
    setIsInstallment(false);
    setInstallmentsCount(2);
  };

  const handleLiabilitySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!liabilityForm.driverId || liabilityForm.amount <= 0) return;

      addDriverLiability({
          driverId: liabilityForm.driverId,
          type: liabilityForm.type,
          date: liabilityForm.date,
          description: liabilityForm.description,
          totalAmount: liabilityForm.amount,
          installments: liabilityForm.installments
      }, liabilityForm.createExpense);

      alert('Avaria/Multa lançada com sucesso!');
      setLiabilityForm({
          driverId: '', type: 'AVARIA', date: new Date().toISOString().split('T')[0], description: '', amount: 0, installments: 1, createExpense: true
      });
  };

  const handleFeeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!feeForm.driverId || feeForm.amount <= 0) return;

      addDriverFee(feeForm);
      alert('Diária lançada com sucesso! Ela aparecerá como Pendente.');
      setFeeForm({ driverId: '', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });
  };

  const handlePayFee = async (id: string) => {
      if (confirm("Confirmar o pagamento desta diária? Isso irá gerar uma despesa no caixa.")) {
          await payDriverFee(id);
      }
  };

  const handleDeleteFee = async (id: string) => {
      if (confirm("Tem certeza que deseja excluir este lançamento de diária?")) {
          await deleteDriverFee(id);
      }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (paymentModal.liability && paymentModal.amount > 0) {
          await payDriverLiability(paymentModal.liability.id, paymentModal.amount);
          setPaymentModal({ open: false, liability: null, amount: 0 });
          alert('Pagamento recebido e lançado no caixa!');
      }
  };

  const handleSaveRates = async () => {
      await updateSettings({ paymentRates: rateForm });
      alert("Taxas atualizadas com sucesso!");
  };

  const handleRateChange = (category: 'maquininha' | 'ecommerce' | 'site', field: keyof PaymentRateProfile, value: string) => {
      // Allow user to type, only validate on blur or submit if needed. Store as number.
      const numValue = parseFloat(value);
      setRateForm(prev => ({
          ...prev,
          [category]: {
              ...prev[category],
              [field]: isNaN(numValue) ? 0 : numValue
          }
      }));
  };

  // Currency Helpers
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, setter: any) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, "");
    const realValue = Number(digits) / 100;
    setter((prev: any) => ({ ...prev, amount: realValue }));
  };

  const currentBalance = realizedTransactions.reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);
  const projectedIncome = pendingTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);

  const RateInput = ({ label, value, onChange }: { label: string, value: number, onChange: (val: string) => void }) => (
      <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
          <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500">
              <input 
                  type="number" step="0.01" min="0"
                  value={value} 
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full p-2 outline-none text-right font-bold text-slate-800 text-sm"
              />
              <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-l border-slate-300 text-xs">%</span>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
        
        {/* PAYMENT MODAL */}
        {paymentModal.open && paymentModal.liability && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-2">Receber de Motorista</h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Quanto está sendo pago agora? <br/>
                        <span className="text-xs text-slate-400">Total Devido: R$ {(paymentModal.liability.totalAmount - paymentModal.liability.paidAmount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </p>
                    <form onSubmit={handleReceivePayment}>
                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white mb-4">
                            <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-r border-slate-300">R$</span>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                autoFocus
                                required 
                                value={paymentModal.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                                onChange={e => {
                                    const val = Number(e.target.value.replace(/\D/g, "")) / 100;
                                    setPaymentModal(prev => ({...prev, amount: val}));
                                }}
                                className="w-full p-2 outline-none text-right font-bold text-green-700"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setPaymentModal({open:false, liability: null, amount: 0})} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded font-bold">Cancelar</button>
                            <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700">Confirmar</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-slate-300 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('CASHBOOK')}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap ${activeTab === 'CASHBOOK' ? 'border-b-2 border-slate-800 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
                📚 Livro Caixa
            </button>
            <button 
                onClick={() => setActiveTab('FEES')}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap ${activeTab === 'FEES' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                💸 Diárias (Motoristas)
            </button>
            <button 
                onClick={() => setActiveTab('LIABILITIES')}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap ${activeTab === 'LIABILITIES' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                💥 Avarias e Multas
            </button>
            {canManageRates && (
                <button 
                    onClick={() => setActiveTab('RATES')}
                    className={`px-6 py-3 font-bold text-sm whitespace-nowrap ${activeTab === 'RATES' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    ⚙️ Configurar Taxas
                </button>
            )}
        </div>

        {activeTab === 'CASHBOOK' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transaction List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Fluxo Financeiro</h2>
                        <p className="text-slate-500 text-sm">Controle de receitas e despesas</p>
                    </div>
                    <div className="bg-white rounded-lg p-1 border border-slate-200 flex text-sm">
                        {['ALL', 'INCOME', 'EXPENSE'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-3 py-1 rounded ${filter === f ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                {f === 'ALL' ? 'Todos' : f === 'INCOME' ? 'Receitas' : 'Despesas'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-xs font-bold uppercase">Saldo Atual (Realizado)</p>
                        <p className={`text-2xl font-bold mt-1 ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {currentBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100">
                        <p className="text-blue-600 text-xs font-bold uppercase">Previsão de Entradas (Futuro)</p>
                        <p className="text-2xl font-bold text-blue-700 mt-1">
                            + R$ {projectedIncome.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                    </div>
                </div>

                {/* REALIZED TABLE */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 uppercase">Transações Realizadas</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-slate-500 text-xs uppercase border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4">Categoria/NFe</th>
                                    <th className="p-4 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {realizedTransactions.length === 0 ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-slate-500 text-sm">Nenhuma transação realizada.</td></tr>
                                ) : realizedTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500 text-sm whitespace-nowrap">
                                            {new Date(t.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 font-medium text-slate-700">
                                            {t.description}
                                            {t.installment && (
                                                <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 rounded">
                                                    {t.installment.current}/{t.installment.total}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-500 text-sm">
                                            <div className="flex flex-col">
                                                <span>{t.category}</span>
                                                {t.nfe && <span className="text-xs text-slate-400">NFe: {t.nfe}</span>}
                                            </div>
                                        </td>
                                        <td className={`p-4 text-right font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PENDING TABLE */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-100">
                        <h3 className="text-sm font-bold text-yellow-800 uppercase flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Lançamentos Futuros (Agendados)
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-slate-500 text-xs uppercase border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Vencimento</th>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4">Categoria/NFe</th>
                                    <th className="p-4 text-right">Valor Previsto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pendingTransactions.length === 0 ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-slate-500 text-sm">Nenhum lançamento futuro.</td></tr>
                                ) : pendingTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500 text-sm whitespace-nowrap font-medium text-yellow-700">
                                            {new Date(t.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 font-medium text-slate-700">
                                            {t.description}
                                            {t.installment && (
                                                <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 rounded">
                                                    {t.installment.current}/{t.installment.total}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-500 text-sm">
                                            <div className="flex flex-col">
                                                <span>{t.category}</span>
                                                {t.nfe && <span className="text-xs text-slate-400">NFe: {t.nfe}</span>}
                                            </div>
                                        </td>
                                        <td className={`p-4 text-right font-bold text-slate-400`}>
                                            R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Transaction */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-6">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">Novo Lançamento Manual</h3>
                    <p className="text-xs text-slate-500 mb-4">Use para lançar despesas de fornecedores, peças, etc.</p>
                    <form onSubmit={handleAddTransaction} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => setNewTrans({...newTrans, type: 'INCOME'})}
                                    className={`flex-1 py-2 rounded border ${newTrans.type === 'INCOME' ? 'bg-green-100 border-green-500 text-green-700 font-bold' : 'border-slate-200 text-slate-500'}`}
                                >
                                    Receita
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setNewTrans({...newTrans, type: 'EXPENSE'})}
                                    className={`flex-1 py-2 rounded border ${newTrans.type === 'EXPENSE' ? 'bg-red-100 border-red-500 text-red-700 font-bold' : 'border-slate-200 text-slate-500'}`}
                                >
                                    Despesa
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input 
                                type="date" required 
                                value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                            <input 
                                required value={newTrans.description} 
                                onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Peças do Motor"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                                <input 
                                    required value={newTrans.category} placeholder="Ex: Manutenção"
                                    onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">NFe (Opcional)</label>
                                <input 
                                    value={newTrans.nfe} placeholder="Núm. Nota"
                                    onChange={e => setNewTrans({...newTrans, nfe: e.target.value})}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500">
                                <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-r border-slate-300">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    required 
                                    value={newTrans.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                                    onChange={e => handleCurrencyChange(e, setNewTrans)}
                                    className="w-full p-2 outline-none text-right font-bold text-slate-800"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        {/* Payment Configuration */}
                        <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Forma de Pagamento</label>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsInstallment(false)}
                                        className={`flex-1 py-1.5 text-xs rounded border ${!isInstallment ? 'bg-white shadow text-slate-800 font-bold border-slate-300' : 'text-slate-500 border-transparent'}`}
                                    >
                                        À Vista
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsInstallment(true)}
                                        className={`flex-1 py-1.5 text-xs rounded border ${isInstallment ? 'bg-white shadow text-slate-800 font-bold border-slate-300' : 'text-slate-500 border-transparent'}`}
                                    >
                                        Parcelado
                                    </button>
                                </div>
                            </div>

                            {isInstallment && (
                                <div className="grid grid-cols-2 gap-2 animate-fade-in">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Qtd. Parcelas</label>
                                        <input 
                                            type="number" min="2" max="60" required
                                            value={installmentsCount} 
                                            onChange={e => setInstallmentsCount(parseInt(e.target.value))}
                                            className="w-full border p-2 rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Meio Pagto</label>
                                        <select 
                                            className="w-full border p-2 rounded text-sm bg-white"
                                            value={newTrans.paymentMethod}
                                            onChange={e => setNewTrans({...newTrans, paymentMethod: e.target.value as any})}
                                        >
                                            <option value="BOLETO">Boleto</option>
                                            <option value="CARTAO_CREDITO">Cartão Crédito</option>
                                            <option value="PIX">Pix Parcelado</option>
                                            <option value="OUTROS">Outros</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 text-xs text-slate-500 text-center bg-white p-2 rounded border border-slate-100">
                                        Valor por Parcela: <strong>R$ {(newTrans.amount / installmentsCount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded hover:bg-slate-700 transition-colors">
                            Registrar {newTrans.type === 'EXPENSE' ? 'Despesa' : 'Receita'}
                        </button>
                    </form>
                </div>
            </div>
            </div>
        )}

        {/* DRIVER FEES TAB */}
        {activeTab === 'FEES' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-blue-800 flex items-center gap-2">
                        <span className="bg-blue-100 p-1.5 rounded">💸</span>
                        Lançar Diária de Motorista
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Registe aqui o valor que deve ser pago ao motorista. Ao realizar o pagamento, a despesa será lançada no caixa.
                    </p>
                    <form onSubmit={handleFeeSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Motorista</label>
                            <select 
                                required value={feeForm.driverId} 
                                onChange={e => setFeeForm({...feeForm, driverId: e.target.value})}
                                className="w-full border p-2 rounded bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Selecione...</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data da Viagem</label>
                            <input 
                                type="date" required value={feeForm.date} 
                                onChange={e => setFeeForm({...feeForm, date: e.target.value})} 
                                className="w-full border p-2 rounded" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                            <input 
                                required value={feeForm.description} 
                                onChange={e => setFeeForm({...feeForm, description: e.target.value})} 
                                className="w-full border p-2 rounded" 
                                placeholder="Ex: Viagem Beto Carrero (5 dias)" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor da Diária (Total)</label>
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                                <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-r border-slate-300">R$</span>
                                <input 
                                    type="text" inputMode="numeric" required 
                                    value={feeForm.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                                    onChange={e => handleCurrencyChange(e, setFeeForm)} 
                                    className="w-full p-2 outline-none text-right font-bold text-blue-700" 
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-700 text-white font-bold py-3 rounded hover:bg-blue-800">
                            Registrar a Pagar
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2">
                    {/* SUMMARY & FILTER BAR */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">Motorista</label>
                                <select
                                    value={feeDriverFilter}
                                    onChange={(e) => setFeeDriverFilter(e.target.value)}
                                    className="border p-2 rounded text-sm bg-slate-50 focus:bg-white w-full md:w-40"
                                >
                                    <option value="">Todos</option>
                                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">De</label>
                                <input 
                                    type="date" 
                                    value={feeStartDate} 
                                    onChange={e => setFeeStartDate(e.target.value)}
                                    className="border p-2 rounded text-sm bg-slate-50 focus:bg-white"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1">Até</label>
                                <input 
                                    type="date" 
                                    value={feeEndDate} 
                                    onChange={e => setFeeEndDate(e.target.value)}
                                    className="border p-2 rounded text-sm bg-slate-50 focus:bg-white"
                                />
                            </div>
                            {(feeDriverFilter || feeStartDate || feeEndDate) && (
                                <button 
                                    onClick={() => { setFeeDriverFilter(''); setFeeStartDate(''); setFeeEndDate(''); }}
                                    className="mt-4 text-xs text-red-500 hover:underline"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                        
                        <div className="flex gap-4 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 pl-0 md:pl-4 mt-2 md:mt-0 w-full md:w-auto justify-end">
                            <div className="text-right">
                                <p className="text-xs text-slate-500 font-bold uppercase">Total Pago</p>
                                <p className="text-lg font-bold text-green-600">R$ {totalFeesPaid.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                            </div>
                            <div className="text-right pl-4 border-l border-slate-200">
                                <p className="text-xs text-slate-500 font-bold uppercase">Total Pendente</p>
                                <p className="text-lg font-bold text-blue-700">R$ {totalFeesPending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                            </div>
                        </div>
                    </div>

                    <h3 className="font-bold text-slate-700 mb-4">Relatório de Diárias (Contas a Pagar)</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Motorista</th>
                                    <th className="p-3">Descrição</th>
                                    <th className="p-3 text-right">Valor</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredFees.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma diária registrada para este filtro.</td></tr>
                                ) : (
                                    filteredFees.map(fee => {
                                        const drv = fee.driverId ? users.find(u => u.id === fee.driverId) : null;
                                        const driverName = drv ? drv.name : (fee.freelanceDriverName ? `${fee.freelanceDriverName} (F)` : 'Desconhecido');
                                        
                                        return (
                                            <tr key={fee.id} className={`hover:bg-slate-50 ${fee.status === 'PAID' ? 'opacity-60 bg-slate-50' : ''}`}>
                                                <td className="p-3 text-sm text-slate-600">
                                                    {new Date(fee.date).toLocaleDateString()}
                                                </td>
                                                <td className="p-3 font-bold text-slate-800">{driverName}</td>
                                                <td className="p-3 text-sm text-slate-600">{fee.description}</td>
                                                <td className="p-3 text-right font-bold text-blue-600">R$ {fee.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-center">
                                                    {fee.status === 'PAID' ? (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">PAGO</span>
                                                    ) : (
                                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold">PENDENTE</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right flex justify-end gap-2">
                                                    {fee.status === 'PENDING' ? (
                                                        <>
                                                            <button 
                                                                onClick={() => handlePayFee(fee.id)}
                                                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 font-bold shadow-sm"
                                                            >
                                                                Pagar
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteFee(fee.id)}
                                                                className="text-xs text-red-400 hover:text-red-600"
                                                            >
                                                                ✕
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">Pago em {fee.paymentDate ? new Date(fee.paymentDate).toLocaleDateString() : '-'}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* LIABILITIES TAB */}
        {activeTab === 'LIABILITIES' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-red-800 flex items-center gap-2">
                        <span className="bg-red-100 p-1.5 rounded">⚠️</span>
                        Lançar Avaria ou Multa
                    </h3>
                    <form onSubmit={handleLiabilitySubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Motorista</label>
                            <select 
                                required value={liabilityForm.driverId} 
                                onChange={e => setLiabilityForm({...liabilityForm, driverId: e.target.value})}
                                className="w-full border p-2 rounded bg-slate-50"
                            >
                                <option value="">Selecione...</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setLiabilityForm({...liabilityForm, type: 'AVARIA'})} className={`flex-1 py-2 rounded text-sm font-bold border ${liabilityForm.type === 'AVARIA' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'border-slate-200 text-slate-500'}`}>Avaria (Dano)</button>
                                <button type="button" onClick={() => setLiabilityForm({...liabilityForm, type: 'MULTA'})} className={`flex-1 py-2 rounded text-sm font-bold border ${liabilityForm.type === 'MULTA' ? 'bg-red-100 text-red-700 border-red-300' : 'border-slate-200 text-slate-500'}`}>Multa Trânsito</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data do Ocorrido</label>
                            <input type="date" required value={liabilityForm.date} onChange={e => setLiabilityForm({...liabilityForm, date: e.target.value})} className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{liabilityForm.type === 'AVARIA' ? 'Descrição do Dano' : 'Tipo da Infração'}</label>
                            <input required value={liabilityForm.description} onChange={e => setLiabilityForm({...liabilityForm, description: e.target.value})} className="w-full border p-2 rounded" placeholder={liabilityForm.type === 'AVARIA' ? 'Ex: Farol quebrado' : 'Ex: Excesso Velocidade'} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                                <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-r border-slate-300">R$</span>
                                <input type="text" inputMode="numeric" required value={liabilityForm.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={e => handleCurrencyChange(e, setLiabilityForm)} className="w-full p-2 outline-none text-right font-bold text-red-700" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Parcelar Cobrança em:</label>
                            <input type="number" min="1" max="24" value={liabilityForm.installments} onChange={e => setLiabilityForm({...liabilityForm, installments: parseInt(e.target.value)})} className="w-full border p-2 rounded" />
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={liabilityForm.createExpense} 
                                    onChange={e => setLiabilityForm({...liabilityForm, createExpense: e.target.checked})}
                                    className="rounded text-red-600" 
                                />
                                <span className="text-xs font-bold text-slate-700">Lançar saída no Caixa da Empresa agora?</span>
                            </label>
                            <p className="text-[10px] text-slate-500 mt-1 pl-5">Marque se a empresa já pagou pelo conserto/multa.</p>
                        </div>

                        <button type="submit" className="w-full bg-red-700 text-white font-bold py-3 rounded hover:bg-red-800">
                            Registrar Cobrança
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2">
                    <h3 className="font-bold text-slate-700 mb-4">Histórico de Cobranças aos Motoristas</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Motorista</th>
                                    <th className="p-3">Tipo</th>
                                    <th className="p-3 text-right">Valor Total</th>
                                    <th className="p-3 text-right">Pago</th>
                                    <th className="p-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {driverLiabilities.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma avaria ou multa registrada.</td></tr>
                                ) : (
                                    driverLiabilities.map(l => {
                                        const drv = users.find(u => u.id === l.driverId);
                                        const pendingAmount = l.totalAmount - l.paidAmount;
                                        return (
                                            <tr key={l.id} className="hover:bg-slate-50">
                                                <td className="p-3 text-sm text-slate-600">
                                                    {new Date(l.date).toLocaleDateString()}
                                                    <span className="block text-[10px] text-slate-400">{l.description}</span>
                                                </td>
                                                <td className="p-3 font-bold text-slate-800">{drv?.name || 'Motorista Removido'}</td>
                                                <td className="p-3">
                                                    <span className={`text-xs px-2 py-1 rounded font-bold ${l.type === 'AVARIA' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                        {l.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-bold text-red-600">R$ {l.totalAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-right font-bold text-green-600">
                                                    R$ {l.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                    {l.status === 'PAID' && <span className="ml-1 text-[10px] bg-green-100 px-1 rounded">QUITADO</span>}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {l.status === 'OPEN' && (
                                                        <button 
                                                            onClick={() => setPaymentModal({open: true, liability: l, amount: pendingAmount})}
                                                            className="text-xs bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700"
                                                        >
                                                            Receber
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* RATES CONFIG TAB */}
        {activeTab === 'RATES' && canManageRates && (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-emerald-800">Configuração de Taxas</h2>
                        <p className="text-sm text-slate-500">Defina as taxas para cálculo automático na venda de pacotes.</p>
                    </div>
                    <button 
                        onClick={handleSaveRates}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-transform active:scale-95"
                    >
                        Salvar Taxas
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* MAQUININHA */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-800 text-white p-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <span>💳</span> Maquininha (Física)
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <RateInput label="Débito (1 dia)" value={rateForm.maquininha.debit} onChange={(v) => handleRateChange('maquininha', 'debit', v)} />
                            <RateInput label="Crédito à Vista (30 dias)" value={rateForm.maquininha.creditCash} onChange={(v) => handleRateChange('maquininha', 'creditCash', v)} />
                            <RateInput label="Crédito Parcelado (2x até 6x)" value={rateForm.maquininha.creditInstallment2to6} onChange={(v) => handleRateChange('maquininha', 'creditInstallment2to6', v)} />
                            <RateInput label="Crédito Parcelado (7x até 12x)" value={rateForm.maquininha.creditInstallment7to12} onChange={(v) => handleRateChange('maquininha', 'creditInstallment7to12', v)} />
                        </div>
                    </div>

                    {/* ECOMMERCE (LINK) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-blue-600 text-white p-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <span>🔗</span> Ecommerce (Link Pagto)
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <RateInput label="Débito (1 dia)" value={rateForm.ecommerce.debit} onChange={(v) => handleRateChange('ecommerce', 'debit', v)} />
                            <RateInput label="Crédito à Vista (30 dias)" value={rateForm.ecommerce.creditCash} onChange={(v) => handleRateChange('ecommerce', 'creditCash', v)} />
                            <RateInput label="Crédito Parcelado (2x até 6x)" value={rateForm.ecommerce.creditInstallment2to6} onChange={(v) => handleRateChange('ecommerce', 'creditInstallment2to6', v)} />
                            <RateInput label="Crédito Parcelado (7x até 12x)" value={rateForm.ecommerce.creditInstallment7to12} onChange={(v) => handleRateChange('ecommerce', 'creditInstallment7to12', v)} />
                        </div>
                    </div>

                    {/* SITE */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-purple-600 text-white p-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <span>🌐</span> Site (Integrado)
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <RateInput label="Débito (1 dia)" value={rateForm.site.debit} onChange={(v) => handleRateChange('site', 'debit', v)} />
                            <RateInput label="Crédito à Vista (30 dias)" value={rateForm.site.creditCash} onChange={(v) => handleRateChange('site', 'creditCash', v)} />
                            <RateInput label="Crédito Parcelado (2x até 6x)" value={rateForm.site.creditInstallment2to6} onChange={(v) => handleRateChange('site', 'creditInstallment2to6', v)} />
                            <RateInput label="Crédito Parcelado (7x até 12x)" value={rateForm.site.creditInstallment7to12} onChange={(v) => handleRateChange('site', 'creditInstallment7to12', v)} />
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default FinanceView;
