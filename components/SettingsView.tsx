
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

const SettingsView: React.FC = () => {
  const { settings, updateSettings, currentUser } = useStore();
  const [form, setForm] = useState({
      companyName: '',
      cnpj: '',
      phone: '',
      address: '',
      logoUrl: ''
  });
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
      if (settings) {
          setForm({
              companyName: settings.companyName || '',
              cnpj: settings.cnpj || '',
              phone: settings.phone || '',
              address: settings.address || '',
              logoUrl: settings.logoUrl || ''
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
            <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4">Dados da Empresa (Para Contratos/Recibos)</h3>
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

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={uploading}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow-sm transition-colors"
                        >
                            Salvar Configurações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};

export default SettingsView;
