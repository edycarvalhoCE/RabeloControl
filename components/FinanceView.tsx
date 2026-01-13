import React, { useState } from 'react';
import { useStore } from '../services/store';

const FinanceView: React.FC = () => {
  const { transactions, addTransaction } = useStore();
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [newTrans, setNewTrans] = useState({ description: '', amount: 0, type: 'INCOME', category: '', status: 'COMPLETED' });

  // Separate transactions into Realized (Completed) and Forecast (Pending)
  const realizedTransactions = transactions
    .filter(t => t.status === 'COMPLETED')
    .filter(t => filter === 'ALL' ? true : t.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingTransactions = transactions
    .filter(t => t.status === 'PENDING')
    .filter(t => filter === 'ALL' ? true : t.type === filter)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort ascending for future dates

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaction({
      ...newTrans,
      type: newTrans.type as 'INCOME' | 'EXPENSE',
      status: 'COMPLETED', // Manual entry usually means it happened
      date: new Date().toISOString()
    });
    setNewTrans({ description: '', amount: 0, type: 'INCOME', category: '', status: 'COMPLETED' });
  };

  // Special handler for Currency Input (ATM Style)
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, "");
    const realValue = Number(digits) / 100;
    setNewTrans(prev => ({ ...prev, amount: realValue }));
  };

  const currentBalance = realizedTransactions
    .reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);

  const projectedIncome = pendingTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Transaction List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Livro Caixa</h2>
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
                            <th className="p-4">Categoria</th>
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
                                <td className="p-4 font-medium text-slate-700">{t.description}</td>
                                <td className="p-4 text-slate-500 text-sm">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{t.category}</span>
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
                            <th className="p-4">Categoria</th>
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
                                <td className="p-4 font-medium text-slate-700">{t.description}</td>
                                <td className="p-4 text-slate-500 text-sm">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{t.category}</span>
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
            <p className="text-xs text-slate-500 mb-4">Para lançamentos vinculados a locações, utilize a tela de Locações.</p>
            <form onSubmit={handleAdd} className="space-y-4">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                    <input 
                        required value={newTrans.description} 
                        onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                    <input 
                        required value={newTrans.category} placeholder="Ex: Combustível, Aluguel..."
                        onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500">
                        <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-r border-slate-300">R$</span>
                        <input 
                            type="text" 
                            inputMode="numeric"
                            required 
                            value={newTrans.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                            onChange={handleCurrencyChange}
                            className="w-full p-2 outline-none text-right font-bold text-slate-800"
                            placeholder="0,00"
                        />
                    </div>
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded hover:bg-slate-700 transition-colors">
                    Registrar Agora
                </button>
            </form>
          </div>
      </div>
    </div>
  );
};

export default FinanceView;