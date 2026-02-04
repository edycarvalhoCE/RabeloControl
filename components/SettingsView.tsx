
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

const SettingsView: React.FC = () => {
  const { 
      settings, updateSettings, currentUser, restoreDatabase, resetSystemData,
      updateMyPassword
  } = useStore();

  const [form, setForm] = useState({ companyName: '', cnpj: '', phone: '', address: '', logoUrl: '', aiApiKey: '' });
  const [pwdForm, setPwdForm] = useState({ newPwd: '', confirmPwd: '' });
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      await updateSettings(form);
      setSuccessMsg('Configurações salvas!');
      setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      if (pwdForm.newPwd.length < 6) {
          setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
          return;
      }
      if (pwdForm.newPwd !== pwdForm.confirmPwd) {
          setErrorMsg('As senhas não coincidem.');
          return;
      }
      const res = await updateMyPassword(pwdForm.newPwd);
      if (res.success) {
          setSuccessMsg('Senha alterada com sucesso!');
          setPwdForm({ newPwd: '', confirmPwd: '' });
          setTimeout(() => setSuccessMsg(''), 3000);
      } else {
          setErrorMsg(res.message || 'Erro ao alterar senha. Talvez você precise sair e entrar novamente por segurança.');
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 500 * 1024) { alert("Máx 500KB"); return; }
          setUploading(true);
          const reader = new FileReader();
          reader.onload = (event) => {
              setForm(prev => ({ ...prev, logoUrl: event.target?.result as string }));
              setUploading(false);
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">Configurações e Perfil</h2>

        {successMsg && (
            <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 animate-fade-in">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="font-bold">{successMsg}</span>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COMPANY DATA */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4">Dados da Empresa</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="w-full border p-2 rounded" placeholder="Nome da Empresa" />
                        <div className="grid grid-cols-2 gap-4">
                            <input value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})} className="w-full border p-2 rounded" placeholder="CNPJ" />
                            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border p-2 rounded" placeholder="Telefone" />
                        </div>
                        <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full border p-2 rounded" placeholder="Endereço" />
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition-colors">Salvar Dados</button>
                    </form>
                </div>

                {/* SECURITY SECTION */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Segurança e Senha
                    </h3>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nova Senha</label>
                                <input type="password" required value={pwdForm.newPwd} onChange={e => setPwdForm({...pwdForm, newPwd: e.target.value})} className="w-full border p-2 rounded" placeholder="Mínimo 6 dígitos" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Confirmar Senha</label>
                                <input type="password" required value={pwdForm.confirmPwd} onChange={e => setPwdForm({...pwdForm, confirmPwd: e.target.value})} className="w-full border p-2 rounded" placeholder="Repita a senha" />
                            </div>
                        </div>
                        <button type="submit" className="bg-slate-800 text-white px-6 py-2 rounded font-bold hover:bg-slate-700 transition-colors">Alterar Minha Senha</button>
                    </form>
                </div>
            </div>

            {/* SIDEBAR LOGO */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4">Logotipo</h3>
                    <div className="border-2 border-dashed rounded-lg h-32 flex items-center justify-center bg-slate-50 mb-4">
                        {form.logoUrl ? <img src={form.logoUrl} className="max-h-full object-contain" /> : <span className="text-slate-400">Sem Logo</span>}
                    </div>
                    <label className="block w-full cursor-pointer bg-blue-50 text-blue-700 text-center py-2 rounded font-bold text-sm border border-blue-200">
                        {uploading ? 'Enviando...' : 'Carregar Logo'}
                        <input type="file" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SettingsView;
