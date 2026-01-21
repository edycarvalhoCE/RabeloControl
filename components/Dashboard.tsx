
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getFinancialInsight } from '../services/geminiService';
import { Logo } from './Logo';
import { Transaction } from '../types';

const Dashboard: React.FC = () => {
  const { bookings, transactions, buses, currentUser, users, timeOffs, updateTimeOffStatus, settings } = useStore();
  const [insight, setInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  
  // State for "Quick View" modal
  const [showDueModal, setShowDueModal] = useState(false);
  const [dueModalFilter, setDueModalFilter] = useState<'TODAY' | 'WEEK'>('TODAY');

  // Security check
  if (currentUser.role === 'MOTORISTA' || currentUser.role === 'MECANICO') {
    return <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg">Acesso restrito. Utilize o menu lateral para acessar suas funções.</div>;
  }

  // --- FINANCIAL CALCULATIONS ---
  const totalRevenue = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const profit = totalRevenue - totalExpenses;

  // Specific Expense Categories
  const expenseParts = transactions
    .filter(t => t.type === 'EXPENSE' && (t.category === 'Compra de Peças' || t.category === 'Peças'))
    .reduce((acc, t) => acc + t.amount, 0);

  const expenseFuel = transactions
    .filter(t => t.type === 'EXPENSE' && (t.category === 'Combustível' || t.category === 'Compra Combustível'))
    .reduce((acc, t) => acc + t.amount, 0);

  const expenseAvaria = transactions
    .filter(t => t.type === 'EXPENSE' && (t.category === 'Manutenção (Avaria)' || t.category.includes('Avaria')))
    .reduce((acc, t) => acc + t.amount, 0);

  const expenseMulta = transactions
    .filter(t => t.type === 'EXPENSE' && (t.category === 'Multas' || t.category.includes('Multa')))
    .reduce((acc, t) => acc + t.amount, 0);

  // Operational Stats
  const activeBookings = bookings.filter(b => b.status === 'CONFIRMED').length;
  const maintenanceBuses = buses.filter(b => b.status === 'MAINTENANCE').length;

  const chartData = [
    { name: 'Entradas', amount: totalRevenue },
    { name: 'Saídas', amount: totalExpenses },
  ];

  const busStatusData = [
    { name: 'Disponível', value: buses.filter(b => b.status === 'AVAILABLE').length },
    { name: 'Alugado', value: buses.filter(b => b.status === 'BUSY').length },
    { name: 'Manutenção', value: buses.filter(b => b.status === 'MAINTENANCE').length },
  ];
  
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

  // --- DUE DATE LOGIC ---
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const pendingTransactions = transactions.filter(t => t.status === 'PENDING');

  const dueTodayList = pendingTransactions.filter(t => t.date === todayStr);
  const dueWeekList = pendingTransactions.filter(t => t.date > todayStr && t.date <= nextWeekStr);

  const totalDueToday = dueTodayList.reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);
  const totalDueWeek = dueWeekList.reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);

  const handleGetInsight = async () => {
    setLoadingAi(true);
    const summary = `Receita Total: R$${totalRevenue}, Despesas Totais: R$${totalExpenses}, Lucro: R$${profit}. Gastos Específicos: Peças R$${expenseParts}, Combustível R$${expenseFuel}, Avarias R$${expenseAvaria}, Multas R$${expenseMulta}. Frota: ${buses.length} ônibus.`;
    
    const result = await getFinancialInsight(summary, settings?.aiApiKey);
    
    setInsight(result);
    setLoadingAi(false);
  };

  // Currently active trips
  const now = new Date();
  const currentTrips = bookings.filter(b => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return b.status === 'CONFIRMED' && now >= start && now <= end;
  });

  const sortedTimeOffs = timeOffs
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const formatDateString = (dateStr: string) => {
    if(!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (value: number) => {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* QUICK VIEW MODAL */}
      {showDueModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                      <h3 className="text-xl font-bold text-slate-800">
                          {dueModalFilter === 'TODAY' ? '📅 Vencimentos de Hoje' : '🗓️ Vencimentos Próximos 7 Dias'}
                      </h3>
                      <button onClick={() => setShowDueModal(false)} className="text-slate-400 hover:text-slate-800 text-2xl">&times;</button>
                  </div>
                  
                  <div className="space-y-3">
                      {(dueModalFilter === 'TODAY' ? dueTodayList : dueWeekList).length === 0 ? (
                          <p className="text-center text-slate-500 py-8">Nenhum vencimento encontrado para este período.</p>
                      ) : (
                          (dueModalFilter === 'TODAY' ? dueTodayList : dueWeekList).map(t => (
                              <div key={t.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                                  <div>
                                      <p className="font-bold text-slate-800">{t.description}</p>
                                      <p className="text-xs text-slate-500">
                                          {t.category} • {formatDateString(t.date)}
                                          {t.installment && ` (${t.installment.current}/${t.installment.total})`}
                                      </p>
                                  </div>
                                  <div className="text-right">
                                      <span className={`font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                          {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                                      </span>
                                      <p className="text-[10px] text-slate-400 uppercase font-bold">{t.type === 'INCOME' ? 'A Receber' : 'A Pagar'}</p>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
                  
                  <button onClick={() => setShowDueModal(false)} className="w-full mt-6 bg-slate-800 text-white py-2 rounded-lg font-bold">Fechar</button>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
            <h2 className="text-3xl font-bold text-slate-800">Visão Geral</h2>
            <p className="text-slate-500">Bem-vindo, {currentUser.name}</p>
        </div>
        <div className="flex items-center gap-6">
            <button 
                onClick={handleGetInsight}
                disabled={loadingAi}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 h-10 text-sm font-medium"
            >
                {loadingAi ? 'Analisando...' : '✨ Gerar Análise IA'}
            </button>
            <div className="hidden md:block">
                <Logo variant="dark" size="md" />
            </div>
        </div>
      </div>

      {insight && (
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-indigo-900 text-sm whitespace-pre-line animate-fade-in">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                  Consultor Virtual
              </h4>
              {insight}
          </div>
      )}

      {/* OPERATIONAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-2 -mt-2"></div>
          <p className="text-slate-500 text-sm font-bold uppercase z-10 relative">Saldo em Caixa</p>
          <p className={`text-3xl font-bold mt-2 z-10 relative ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(profit)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-bold uppercase">Viagens Ativas (Agora)</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{currentTrips.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-bold uppercase">Ônibus em Manutenção</p>
          <p className="text-3xl font-bold text-orange-500 mt-2">{maintenanceBuses}</p>
        </div>
      </div>

      {/* DUE DATES SECTION (NEW) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* VENCE HOJE */}
          <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-orange-500 border-slate-200 p-4">
              <div className="flex justify-between items-start mb-3">
                  <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="bg-orange-100 text-orange-600 p-1 rounded text-xs">📅</span>
                          Vence Hoje
                      </h3>
                      <p className="text-xs text-slate-500">Contas agendadas para {new Date().toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => { setDueModalFilter('TODAY'); setShowDueModal(true); }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 font-bold"
                  >
                      Ver Detalhes &rarr;
                  </button>
              </div>
              <div className="flex justify-between items-end">
                  <div>
                      <p className="text-2xl font-bold text-slate-800">{dueTodayList.length}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Itens Pendentes</p>
                  </div>
                  <div className="text-right">
                      <p className={`text-lg font-bold ${totalDueToday >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {totalDueToday >= 0 ? '+' : ''} {formatCurrency(totalDueToday)}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase">Balanço do Dia</p>
                  </div>
              </div>
          </div>

          {/* VENCE EM 7 DIAS */}
          <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-blue-500 border-slate-200 p-4">
              <div className="flex justify-between items-start mb-3">
                  <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-600 p-1 rounded text-xs">🗓️</span>
                          Próximos 7 Dias
                      </h3>
                      <p className="text-xs text-slate-500">Previsão para a semana</p>
                  </div>
                  <button 
                    onClick={() => { setDueModalFilter('WEEK'); setShowDueModal(true); }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 font-bold"
                  >
                      Ver Detalhes &rarr;
                  </button>
              </div>
              <div className="flex justify-between items-end">
                  <div>
                      <p className="text-2xl font-bold text-slate-800">{dueWeekList.length}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Itens Futuros</p>
                  </div>
                  <div className="text-right">
                      <p className={`text-lg font-bold ${totalDueWeek >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {totalDueWeek >= 0 ? '+' : ''} {formatCurrency(totalDueWeek)}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase">Balanço Previsto</p>
                  </div>
              </div>
          </div>
      </div>

      {/* EXPENSE BREAKDOWN CARDS */}
      <h3 className="text-lg font-bold text-slate-700 mt-2">Detalhamento de Gastos (Total)</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white p-1.5 rounded shadow-sm text-lg">🔧</span>
                  <p className="text-slate-500 text-xs font-bold uppercase">Gasto com Peças</p>
              </div>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(expenseParts)}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white p-1.5 rounded shadow-sm text-lg">⛽</span>
                  <p className="text-slate-500 text-xs font-bold uppercase">Gasto Combustível</p>
              </div>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(expenseFuel)}</p>
          </div>
          <div className="bg-red-50 p-5 rounded-xl border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white p-1.5 rounded shadow-sm text-lg">💥</span>
                  <p className="text-red-800 text-xs font-bold uppercase">Gasto Avarias</p>
              </div>
              <p className="text-xl font-bold text-red-700">{formatCurrency(expenseAvaria)}</p>
          </div>
          <div className="bg-red-50 p-5 rounded-xl border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white p-1.5 rounded shadow-sm text-lg">👮</span>
                  <p className="text-red-800 text-xs font-bold uppercase">Gasto Multas</p>
              </div>
              <p className="text-xl font-bold text-red-700">{formatCurrency(expenseMulta)}</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          
          {/* CHARTS COLUMN */}
          <div className="lg:col-span-2 space-y-6">
               {/* ACTIVE TRIPS SECTION */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="animate-pulse w-3 h-3 bg-green-500 rounded-full inline-block"></span>
                            Veículos em Viagem Agora
                        </h3>
                        <span className="text-xs text-slate-500">Atualizado: {new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentTrips.length === 0 ? (
                            <p className="text-slate-500 col-span-2 text-center py-4">Nenhum veículo em rota no momento.</p>
                        ) : (
                            currentTrips.map(trip => {
                                const bus = buses.find(b => b.id === trip.busId);
                                const driver = users.find(u => u.id === trip.driverId);
                                return (
                                    <div key={trip.id} className="border border-green-200 bg-green-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-green-900">{trip.destination}</h4>
                                            <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded font-bold">EM ROTA</span>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p><span className="font-semibold">Bus:</span> {bus?.model} ({bus?.plate})</p>
                                            <p><span className="font-semibold">Motorista:</span> {driver?.name || 'N/A'}</p>
                                            <p className="text-xs text-slate-500 mt-2">Retorno: {new Date(trip.endTime).toLocaleString()}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Fluxo de Caixa Global</h3>
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} 
                            width={80}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f3f4f6' }}
                            formatter={(value: number) => [formatCurrency(value), 'Valor']}
                          />
                          <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={60} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* RIGHT COLUMN (Pie Chart + Time Off History) */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Status da Frota</h3>
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={busStatusData}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {busStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 text-sm text-slate-600 mt-[-20px]">
                      {busStatusData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                              {entry.name}: {entry.value}
                          </div>
                      ))}
                  </div>
              </div>

              {/* TIME OFF HISTORY */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-4 bg-slate-50 border-b border-slate-200">
                       <h3 className="font-bold text-slate-700">Histórico de Folgas e Férias</h3>
                   </div>
                   <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                       {sortedTimeOffs.length === 0 ? (
                           <p className="p-4 text-center text-slate-500 text-sm">Nenhum registro recente.</p>
                       ) : (
                           sortedTimeOffs.map(t => {
                               const driver = users.find(u => u.id === t.driverId);
                               return (
                                   <div key={t.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                                       <div>
                                           <p className="text-sm font-bold text-slate-800">{driver?.name}</p>
                                           <p className="text-xs text-slate-500">{t.type} • {formatDateString(t.date)}</p>
                                       </div>
                                       <div className="text-right">
                                           {t.status === 'APPROVED' && (
                                               <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">Aprovado</span>
                                           )}
                                           {t.status === 'PENDING' && (
                                               <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">Pendente</span>
                                           )}
                                            {t.status === 'REJECTED' && (
                                               <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">Recusado</span>
                                           )}
                                           {/* Cancel Button (To free up driver) */}
                                           {t.status === 'APPROVED' && (
                                               <button 
                                                    onClick={() => {
                                                        if(window.confirm(`Deseja cancelar a folga de ${driver?.name}? O motorista ficará disponível novamente.`)) {
                                                            updateTimeOffStatus(t.id, 'REJECTED');
                                                        }
                                                    }}
                                                    className="block text-[10px] text-red-500 hover:underline mt-1 cursor-pointer"
                                               >
                                                   Cancelar Folga
                                               </button>
                                           )}
                                       </div>
                                   </div>
                               );
                           })
                       )}
                   </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
