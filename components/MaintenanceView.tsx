import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

const MaintenanceView: React.FC = () => {
  const { buses, parts, currentUser, addMaintenanceRecord, addPurchaseRequest, maintenanceRecords, users, maintenanceReports, updateMaintenanceReportStatus } = useStore();
  const [activeTab, setActiveTab] = useState<'usage' | 'request' | 'history' | 'reports'>('reports');

  // Usage Form State
  const [usage, setUsage] = useState({ busId: '', partId: '', quantityUsed: 1, type: 'CORRETIVA' as 'CORRETIVA' | 'PREVENTIVA', date: new Date().toISOString().split('T')[0] });
  
  // Request Form State
  const [req, setReq] = useState({ partName: '', quantity: 1, relatedBusId: '' });

  // History Filter
  const [historyBusFilter, setHistoryBusFilter] = useState('');

  const handleUsageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(usage.busId && usage.partId) {
        addMaintenanceRecord({
            ...usage,
            mechanicId: currentUser.id,
            date: new Date(usage.date).toISOString()
        });
        alert('Uso registrado com sucesso!');
        setUsage({ ...usage, quantityUsed: 1, busId: '', partId: '' });
    }
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(req.partName) {
        addPurchaseRequest({
            ...req,
            requesterId: currentUser.id,
            relatedBusId: req.relatedBusId || undefined
        });
        alert('Solicitação de compra enviada!');
        setReq({ partName: '', quantity: 1, relatedBusId: '' });
    }
  };

  // Filter history records
  const filteredHistory = maintenanceRecords
    .filter(record => historyBusFilter ? record.busId === historyBusFilter : true)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
  // Pending reports count
  const pendingReportsCount = maintenanceReports.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    🛠️ Portal da Manutenção
                </h2>
                <p className="text-slate-400">Logado como: {currentUser.name}</p>
            </div>
            <div className="bg-white p-2 rounded-lg hidden md:block">
                 <span className="text-slate-900 font-extrabold text-xl tracking-tighter">
                    Rabelo<span className="text-blue-600">Tour</span>
                </span>
            </div>
        </div>

        <div className="flex border-b border-slate-300 space-x-4 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('reports')}
                className={`pb-2 px-4 font-bold transition-colors whitespace-nowrap relative ${activeTab === 'reports' ? 'border-b-4 border-red-600 text-red-600' : 'text-slate-500'}`}
            >
                ⚠️ Reportes de Motoristas
                {pendingReportsCount > 0 && (
                    <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{pendingReportsCount}</span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('usage')}
                className={`pb-2 px-4 font-bold transition-colors whitespace-nowrap ${activeTab === 'usage' ? 'border-b-4 border-slate-800 text-slate-800' : 'text-slate-500'}`}
            >
                Registrar Uso de Peças
            </button>
            <button 
                onClick={() => setActiveTab('request')}
                className={`pb-2 px-4 font-bold transition-colors whitespace-nowrap ${activeTab === 'request' ? 'border-b-4 border-slate-800 text-slate-800' : 'text-slate-500'}`}
            >
                Solicitar Compra
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`pb-2 px-4 font-bold transition-colors whitespace-nowrap ${activeTab === 'history' ? 'border-b-4 border-slate-800 text-slate-800' : 'text-slate-500'}`}
            >
                📜 Histórico do Veículo
            </button>
        </div>

        {/* DRIVER REPORTS TAB */}
        {activeTab === 'reports' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-red-50 border-b border-red-100">
                    <h3 className="font-bold text-red-800">Problemas Relatados por Motoristas</h3>
                    <p className="text-sm text-red-600">Verifique os defeitos e altere o status para dar andamento.</p>
                </div>
                <div className="divide-y divide-slate-100">
                    {maintenanceReports.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">Nenhum reporte encontrado.</div>
                    ) : (
                        maintenanceReports.sort((a,b) => (a.status === 'PENDING' ? -1 : 1)).map(report => {
                            const bus = buses.find(b => b.id === report.busId);
                            const driver = users.find(u => u.id === report.driverId);
                            return (
                                <div key={report.id} className="p-4 hover:bg-slate-50 flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-lg text-slate-800">{bus?.plate}</span>
                                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{report.type}</span>
                                            {report.status === 'PENDING' && <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded">NOVO</span>}
                                            {report.status === 'IN_PROGRESS' && <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">EM ANÁLISE</span>}
                                            {report.status === 'RESOLVED' && <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">RESOLVIDO</span>}
                                        </div>
                                        <p className="text-slate-800 font-medium">{report.description}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Reportado por: {driver?.name} em {new Date(report.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        {report.status !== 'RESOLVED' && (
                                            <>
                                                {report.status === 'PENDING' && (
                                                    <button 
                                                        onClick={() => updateMaintenanceReportStatus(report.id, 'IN_PROGRESS')}
                                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold"
                                                    >
                                                        Iniciar Análise
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => updateMaintenanceReportStatus(report.id, 'RESOLVED')}
                                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold"
                                                >
                                                    Concluir
                                                </button>
                                            </>
                                        )}
                                        {report.status === 'RESOLVED' && (
                                            <span className="text-green-600 flex items-center gap-1 font-bold text-sm">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Feito
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}

        {activeTab === 'usage' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-4">Lançamento de Peças Utilizadas</h3>
                <form onSubmit={handleUsageSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data do Serviço</label>
                            <input 
                                type="date" required 
                                value={usage.date} onChange={e => setUsage({...usage, date: e.target.value})}
                                className="w-full border p-2 rounded bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Manutenção</label>
                            <select 
                                value={usage.type} onChange={e => setUsage({...usage, type: e.target.value as any})}
                                className="w-full border p-2 rounded bg-slate-50"
                            >
                                <option value="CORRETIVA">Corretiva (Quebrou/Trocou)</option>
                                <option value="PREVENTIVA">Preventiva (Revisão)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Veículo</label>
                        <select 
                            required value={usage.busId} onChange={e => setUsage({...usage, busId: e.target.value})}
                            className="w-full border p-2 rounded bg-slate-50"
                        >
                            <option value="">Selecione o ônibus...</option>
                            {buses.map(b => (
                                <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Peça Utilizada</label>
                            <select 
                                required value={usage.partId} onChange={e => setUsage({...usage, partId: e.target.value})}
                                className="w-full border p-2 rounded bg-slate-50"
                            >
                                <option value="">Selecione a peça...</option>
                                {parts.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (Em estoque: {p.quantity})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Qtd.</label>
                            <input 
                                type="number" min="1" required
                                value={usage.quantityUsed} onChange={e => setUsage({...usage, quantityUsed: parseInt(e.target.value)})}
                                className="w-full border p-2 rounded bg-slate-50"
                            />
                        </div>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200">
                        ⚠️ Atenção: Ao confirmar, o estoque será atualizado automaticamente e o custo será lançado no financeiro.
                    </div>

                    <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded hover:bg-slate-700">
                        Confirmar Baixa no Estoque
                    </button>
                </form>
            </div>
        )}

        {activeTab === 'request' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-4">Requisição de Compra de Peças</h3>
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Peça / Material</label>
                        <input 
                            required value={req.partName} onChange={e => setReq({...req, partName: e.target.value})}
                            placeholder="Ex: Correia dentada, Fluido de freio..."
                            className="w-full border p-2 rounded bg-slate-50"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade Necessária</label>
                            <input 
                                type="number" min="1" required
                                value={req.quantity} onChange={e => setReq({...req, quantity: parseInt(e.target.value)})}
                                className="w-full border p-2 rounded bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Veículo (Opcional)</label>
                            <select 
                                value={req.relatedBusId} onChange={e => setReq({...req, relatedBusId: e.target.value})}
                                className="w-full border p-2 rounded bg-slate-50"
                            >
                                <option value="">Não específico / Geral</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700">
                        Enviar Solicitação ao Gerente
                    </button>
                </form>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <h3 className="font-bold text-slate-700">Filtrar por Veículo:</h3>
                    <select 
                        value={historyBusFilter} 
                        onChange={e => setHistoryBusFilter(e.target.value)}
                        className="border border-slate-300 rounded p-2 min-w-[200px]"
                    >
                        <option value="">Todos os Veículos</option>
                        {buses.map(b => (
                            <option key={b.id} value={b.id}>{b.plate} - {b.model}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 text-sm uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Veículo</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Peça / Qtd</th>
                                <th className="p-4">Mecânico</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        Nenhum registro de manutenção encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map(record => {
                                    const bus = buses.find(b => b.id === record.busId);
                                    const part = parts.find(p => p.id === record.partId);
                                    const mechanic = users.find(u => u.id === record.mechanicId);

                                    return (
                                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-slate-600 text-sm">{new Date(record.date).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <span className="font-bold text-slate-800 block">{bus?.plate}</span>
                                                <span className="text-xs text-slate-500">{bus?.model}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${record.type === 'CORRETIVA' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {record.type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-700">
                                                {part ? part.name : 'Peça desconhecida'} 
                                                <span className="text-slate-500 ml-1">x{record.quantityUsed}</span>
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">{mechanic?.name || 'Desconhecido'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};

export default MaintenanceView;