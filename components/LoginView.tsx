
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';
import { isConfigured } from '../services/firebase';
import { Logo } from './Logo';

const LoginView: React.FC = () => {
  const { login, register, seedDatabase, buses } = useStore();
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register State
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.DRIVER);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- CONFIGURATION CHECK ---
  if (!isConfigured) {
      return (
          <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
                  <div className="bg-red-600 p-6 text-white">
                      <h1 className="text-2xl font-bold flex items-center gap-2">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          Configuração Necessária
                      </h1>
                      <p className="opacity-90 mt-1">O sistema está quase pronto, mas falta conectar ao seu banco de dados.</p>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="bg-slate-50 border-l-4 border-slate-400 p-4">
                          <p className="text-slate-700 font-medium">Você precisa criar um projeto gratuito no Firebase para que os dados sejam salvos e compartilhados entre os computadores.</p>
                      </div>
                      {/* ... instructions ... */}
                  </div>
              </div>
          </div>
      );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let result;
    if (isRegistering) {
        result = await register(email, password, regName, regRole);
    } else {
        result = await login(email, password);
    }

    if (!result.success) {
        setError(result.message || 'Erro na operação. Verifique seus dados.');
        setLoading(false);
    }
  };

  const handleSeed = async () => {
      setLoading(true);
      await seedDatabase();
      setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[100px] opacity-40"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-200 rounded-full blur-[100px] opacity-40"></div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md z-10 relative border border-slate-100">
            <div className="flex flex-col items-center mb-8">
                {/* Logo Container - Clean and Centered */}
                <div className="mb-4 transform transition-transform duration-300">
                    <Logo size="lg" /> {/* Reduzido de 'xl' para 'lg' */}
                </div>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Sistema Integrado de Gestão</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 flex items-center gap-2 animate-fade-in">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {isRegistering && (
                    <div className="animate-fade-in space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                            <input 
                                type="text" required value={regName} onChange={e => setRegName(e.target.value)}
                                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all bg-slate-50 focus:bg-white" 
                                placeholder="Seu Nome"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Função</label>
                            <select 
                                value={regRole} onChange={e => setRegRole(e.target.value as UserRole)}
                                className="w-full border border-slate-300 p-3 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                            >
                                <option value={UserRole.DRIVER}>Motorista</option>
                                <option value={UserRole.GARAGE_AUX}>Aux. Garagem / Limpeza</option>
                                <option value={UserRole.MANAGER}>Gerente</option>
                                <option value={UserRole.FINANCE}>Financeiro</option>
                                <option value={UserRole.MECHANIC}>Mecânico</option>
                            </select>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                    <input 
                        type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all bg-slate-50 focus:bg-white" 
                        placeholder="seu@email.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            required 
                            value={password} 
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all bg-slate-50 focus:bg-white pr-12" 
                            placeholder="******" 
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                <button 
                    type="submit" disabled={loading}
                    className="w-full bg-[#2e2e77] text-white font-bold py-3.5 rounded-lg hover:bg-blue-900 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 flex justify-center items-center gap-2"
                >
                    {loading && <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Acessar Sistema')}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    type="button"
                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    className="text-sm text-[#2e2e77] hover:underline font-bold transition-colors"
                >
                    {isRegistering ? 'Já tenho conta? Fazer Login' : 'Não tem conta? Criar conta de acesso'}
                </button>
            </div>

            {/* Config warning */}
            {buses.length === 0 && !loading && (
                 <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                     <p className="text-xs text-slate-400 mb-2">Primeiro acesso no banco de dados novo?</p>
                     <button 
                        type="button" onClick={handleSeed}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded transition-colors"
                    >
                         🛠️ Configurar Dados Iniciais
                     </button>
                 </div>
            )}
        </div>
        
        <div className="absolute bottom-4 text-center w-full text-slate-400 text-xs opacity-80 font-medium">
            &copy; {new Date().getFullYear()} Rabelo Tour. Todos os direitos reservados.
        </div>
    </div>
  );
};

export default LoginView;
