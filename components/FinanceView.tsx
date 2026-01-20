
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole, DriverLiability } from '../types';

const FinanceView: React.FC = () => {
  const { transactions, addTransaction, users, addDriverLiability, driverLiabilities, payDriverLiability, bookings } = useStore();
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [activeTab, setActiveTab] = useState<'CASHBOOK' | 'LIABILITIES' | 'PAYROLL'>('CASHBOOK');

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

  // --- RECEIVE PAYMENT MODAL STATE ---
  const [paymentModal, setPaymentModal] = useState<{ open: boolean, liability: DriverLiability | null, amount: number }>({ open: false, liability: null, amount: 0 });

  const drivers = users.filter(u => 
      u.role === UserRole.DRIVER || 
      u.role === 'MOTORISTA' || 
      u.role === 'DRIVER' ||
      u.role === 'Motorista'
  );

  // --- FILTERS ---
  const realizedTransactions = transactions
    .filter(t => t.status === 'COMPLETED')
    .filter(t => filter === 'ALL' ? true : t.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingTransactions = transactions
    .filter(t => t.status === 'PENDING')
    .filter(t => filter === 'ALL' ? true : t.type === filter)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- PAYROLL CALCULATION ---
  const getDriverPayroll = () => {
      return drivers.map(driver => {
          const driverTrips = bookings.filter(b => b.driverId === driver.id && b.status === 'COMPLETED');
          
          const tripsDetails = driverTrips.map(trip => {
              const start = new Date(trip.startTime);
              const end = new Date(trip.endTime);
              // Calculate days duration (minimum 1 day)
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
              const days = diffDays || 1; 
              
              return {
                  destination: trip.destination,
                  date: trip.startTime,
                  days,
                  amount: days * (driver.dailyRate || 0)
              };
          });

          const totalDays = tripsDetails.reduce((acc, t) => acc + t.days, 0);
          const totalAmount = tripsDetails.reduce((acc, t) => acc + t.amount, 0);

          return {
              driver,
              tripsDetails,
              totalDays,
              totalAmount
          };
      });
  };

  const payrollData = getDriverPayroll();

  // --- HANDLERS ---

  const handlePayDriver = (driverName: string, amount: number) => {
      if (amount <= 0) return;
      if (window.confirm(`Confirma o pagamento de R$ ${amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})} para ${driverName}? Isso lançará uma despesa no caixa.`)) {
          addTransaction({
              type: 'EXPENSE',
              status: 'COMPLETED',
              category: 'Pagamento Diárias',
              amount: amount,
              date: new Date().toISOString().split('T')[0],
              description: `Pagamento de Diárias - Motorista: ${driverName}`,
              paymentMethod: 'PIX'
          });
          alert('Pagamento registrado no caixa!');
      }
  };

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

  const handleReceivePayment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (paymentModal.liability && paymentModal.amount > 0) {
          await payDriverLiability(paymentModal.liability.id, paymentModal.amount);
          setPaymentModal({ open: false, liability: null, amount: 0 });
          alert('Pagamento recebido e lançado no caixa!');
      }
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
                onClick={() => setActiveTab('PAYROLL')}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap ${activeTab === 'PAYROLL' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                💵 Diárias Motoristas
            </button>
            <button 
                onClick={() => setActiveTab('LIABILITIES')}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap ${activeTab === 'LIABILITIES' ? 'border-b-2 border-red-600 text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                💥 Avarias e Multas
            </button>
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

        {/* PAYROLL TAB */}
        {activeTab === 'PAYROLL' && (
            <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
                    <h3 className="text-emerald-800 font-bold flex items-center gap-2">
                        <span className="text-xl">💰</span> Controle de Diárias de Motoristas
                    </h3>
                    <p className="text-sm text-emerald-600 mt-1">
                        Os valores são calculados automaticamente com base nas viagens concluídas (status 'CONFIRMADO' -> data passada ou manualmente completadas).
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {payrollData.map(({ driver, totalAmount, totalDays, tripsDetails }) => (
                        <div key={driver.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-800">{driver.name}</h4>
                                    <p className="text-xs text-slate-500">Diária Base: R$ {driver.dailyRate?.toLocaleString('pt-BR', {minimumFractionDigits: 2}) || '0,00'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-bold text-slate-400">Total a Pagar</span>
                                    <span className="text-xl font-bold text-emerald-600">R$ {totalAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                </div>
                            </div>
                            
                            <div className="p-4 flex-1 overflow-y-auto max-h-60">
                                {tripsDetails.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-4">Nenhuma viagem realizada.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {tripsDetails.map((trip, idx) => (
                                            <li key={idx} className="text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                                <div className="flex justify-between">
                                                    <span className="font-medium text-slate-700">{trip.destination}</span>
                                                    <span className="text-slate-500 font-bold">R$ {trip.amount.toLocaleString('pt-BR')}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                                    <span>{new Date(trip.date).toLocaleDateString()}</span>
                                                    <span>{trip.days} dia(s)</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50">
                                <button 
                                    onClick={() => handlePayDriver(driver.name, totalAmount)}
                                    disabled={totalAmount <= 0}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded text-sm shadow-sm transition-colors"
                                >
                                    Registrar Pagamento Total
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

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
    </div>
  );
};

export default FinanceView;
