
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

const SettingsView: React.FC = () => {
  const { 
      settings, updateSettings, currentUser, restoreDatabase,
      // Destructure all data collections for Backup
      users, buses, bookings, parts, transactions, timeOffs, documents, 
      maintenanceRecords, purchaseRequests, maintenanceReports, charterContracts, 
      travelPackages, packagePassengers, packagePayments, packageLeads, clients, 
      fuelRecords, fuelSupplies, driverLiabilities, driverFees, quotes, priceRoutes 
  } = useStore();

  const [form, setForm] = useState({
      companyName: '',
      cnpj: '',
      phone: '',
      address: '',
      logoUrl: '',
      aiApiKey: ''
  });
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
      if (settings) {
          setForm({
              companyName: settings.companyName || '',
              cnpj: settings.cnpj || '',
              phone: settings.phone || '',
              address: settings.address || '',
              logoUrl: settings.logoUrl || '',
              aiApiKey: settings.aiApiKey || ''
          });
      }
  }, [settings]);

  // Permitir apenas gerentes/developers
  if (currentUser.role !== UserRole.MANAGER && currentUser.role !== UserRole.DEVELOPER) {
      return <div className="p-8 text-center text-slate-500">Acesso restrito a gerentes.</div>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          if (file.size > 2 * 1024 * 1024) { // 2MB limit
              alert("A imagem é muito grande. Tente usar uma imagem menor que 2MB.");
              return;
          }

          setUploading(true);
          const reader = new FileReader();
          reader.onload = (event) => {
              const base64 = event.target?.result as string;
              setForm(prev => ({ ...prev, logoUrl: base64 }));
              setUploading(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      await updateSettings(form);
      setSuccessMsg('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSystemBackup = () => {
      if (!confirm("Deseja baixar um arquivo de backup com todos os dados atuais do sistema?")) return;

      const backupData = {
          exportDate: new Date().toISOString(),
          version: "1.0",
          data: {
              settings,
              users,
              buses,
              bookings,
              parts,
              transactions,
              timeOffs,
              documents,
              maintenanceRecords,
              purchaseRequests,
              maintenanceReports,
              charterContracts,
              travelPackages,
              packagePassengers,
              packagePayments,
              packageLeads,
              clients,
              fuelRecords,
              fuelSupplies,
              driverLiabilities,
              driverFees,
              quotes,
              priceRoutes
          }
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `backup_rabelotour_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!confirm("⚠️ ATENÇÃO: Esta ação irá SOBRESCREVER os dados atuais com os dados do backup.\n\nIsso é útil caso o sistema tenha sido apagado ou corrompido.\n\nTem certeza absoluta que deseja restaurar?")) {
          e.target.value = ''; 
          return;
      }

      setRestoring(true);
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          try {
              const content = evt.target?.result as string;
              const jsonData = JSON.parse(content);
              
              const result = await restoreDatabase(jsonData);
              
              if (result.success) {
                  alert(result.message);
                  window.location.reload(); // Recarregar para garantir sincronia
              } else {
                  alert("Erro: " + result.message);
              }
          } catch (err: any) {
              alert("Erro ao processar arquivo de backup: " + err.message);
          } finally {
              setRestoring(false);
              e.target.value = '';
          }
      };
      
      reader.readAsText(file);
  };

  // Função para limpar cache e recarregar
  const handleClearCache = () => {
      if (window.confirm("Isso forçará um recarregamento completo da página para obter a versão mais recente. Continuar?")) {
          if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                      registration.unregister();
                  }
              });
          }
          window.location.reload();
      }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Configurações do Sistema</h2>

        {successMsg && (
            <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 animate-bounce-in shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="font-bold">{successMsg}</span>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* LOGO UPLOAD SECTION */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4">Logotipo da Empresa</h3>
                
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 mb-4">
                    {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo Preview" className="max-h-32 object-contain" />
                    ) : (
                        <div className="text-slate-400 text-center">
                            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <p className="text-sm">Nenhuma logo definida</p>
                        </div>
                    )}
                </div>

                <label className="block w-full cursor-pointer bg-slate-800 text-white text-center py-2 rounded hover:bg-slate-700 transition-colors font-bold text-sm">
                    {uploading ? 'Processando...' : 'Selecionar Imagem (PNG/JPG)'}
                    <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileChange} disabled={uploading} />
                </label>
                <p className="text-xs text-slate-500 mt-2 text-center">
                    Recomendado: Imagem PNG com fundo transparente. <br/> Tamanho ideal: 500x200 pixels.
                </p>
            </div>

            {/* COMPANY DATA FORM */}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700">Dados da Empresa</h3>
                        <button 
                            type="button"
                            onClick={handleClearCache}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                            title="Use se as atualizações não aparecerem"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Forçar Atualização / Limpar Cache
                        </button>
                    </div>
                    
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia / Razão Social</label>
                            <input 
                                value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                                <input 
                                    value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                                <input 
                                    value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço Completo</label>
                            <input 
                                value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Rua, Número, Bairro, Cidade - UF"
                            />
                        </div>
                    </form>
                </div>

                {/* DATA & BACKUP */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <span>💾</span> Dados e Backup
                    </h3>
                    
                    <div className="space-y-4">
                        {/* AI SETTINGS */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Chave de API (Google Gemini)</label>
                            <input 
                                type="password"
                                value={form.aiApiKey} 
                                onChange={e => setForm({...form, aiApiKey: e.target.value})}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                placeholder="AIzaSy..."
                            />
                            <p className="text-xs text-slate-500 mt-1">Para previsões financeiras.</p>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <p className="text-sm text-slate-600 mb-3">
                                Gerenciamento dos dados do sistema. O arquivo JSON contém todas as informações cadastradas.
                            </p>
                            <div className="flex flex-col md:flex-row gap-3">
                                <button 
                                    type="button" 
                                    onClick={handleSystemBackup}
                                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded border border-slate-300 transition-colors text-sm flex-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Baixar Backup (.JSON)
                                </button>

                                <label className={`flex items-center justify-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold py-2 px-4 rounded border border-orange-200 transition-colors text-sm flex-1 cursor-pointer ${restoring ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    {restoring ? 'Restaurando...' : 'Restaurar Backup (.JSON)'}
                                    <input type="file" accept=".json" onChange={handleRestoreBackup} disabled={restoring} className="hidden" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={uploading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded shadow-sm transition-colors w-full md:w-auto"
                    >
                        Salvar Todas as Configurações
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SettingsView;
