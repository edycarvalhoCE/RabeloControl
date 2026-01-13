import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';
import { isConfigured } from '../services/firebase';

const LoginView: React.FC = () => {
  const { login, register, seedDatabase, buses } = useStore();
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.DRIVER);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- CONFIGURATION CHECK ---
  if (!isConfigured) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
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

                      <div className="space-y-4">
                          <h3 className="font-bold text-lg text-slate-800">Passo a Passo Rápido:</h3>
                          
                          <ol className="list-decimal list-inside space-y-3 text-slate-600">
                              <li>Acesse <a href="https://console.firebase.google.com" target="_blank" className="text-blue-600 underline font-bold">console.firebase.google.com</a> e crie um novo projeto (ex: "RabeloTour").</li>
                              <li>No menu <strong>Criação</strong> &rarr; <strong>Authentication</strong>, ative o método <strong>Email/Senha</strong>.</li>
                              <li>No menu <strong>Criação</strong> &rarr; <strong>Firestore Database</strong>, crie o banco no <strong>Modo de Teste</strong>.</li>
                              <li>Vá em <strong>Configurações do Projeto</strong> (engrenagem), role até o final e adicione um App Web (ícone <code>&lt;/&gt;</code>).</li>
                              <li>Copie o objeto <code>firebaseConfig</code> que aparecerá.</li>
                              <li>Abra o arquivo <code className="bg-slate-100 px-1 rounded border">services/firebase.ts</code> neste código e cole suas chaves lá.</li>
                          </ol>
                      </div>
                      
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                          <strong>Erro atual:</strong> O sistema detectou que você ainda está usando as chaves de exemplo ("seu-projeto").
                          <br/>
                          Após atualizar o arquivo, recarregue esta página.
                      </div>
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[150px] opacity-20"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[150px] opacity-20"></div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 relative">
            <div className="text-center mb-6">
                <span className="text-slate-900 font-extrabold text-4xl tracking-tighter block mb-2">
                    Rabelo<span className="text-blue-600">Tour</span>
                </span>
                <p className="text-slate-500 text-sm">Sistema Integrado em Nuvem (Firebase)</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                    <div className="animate-fade-in space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                            <input 
                                type="text" required value={regName} onChange={e => setRegName(e.target.value)}
                                className="w-full border p-2 rounded-lg" placeholder="Seu Nome"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Função</label>
                            <select 
                                value={regRole} onChange={e => setRegRole(e.target.value as UserRole)}
                                className="w-full border p-2 rounded-lg bg-white"
                            >
                                <option value={UserRole.DRIVER}>Motorista</option>
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
                        className="w-full border p-2 rounded-lg" placeholder="seu@email.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
                    <input 
                        type="password" required value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full border p-2 rounded-lg" placeholder="******" minLength={6}
                    />
                </div>

                <button 
                    type="submit" disabled={loading}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-70 flex justify-center"
                >
                    {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Acessar Sistema')}
                </button>
            </form>

            <div className="mt-4 text-center">
                <button 
                    type="button"
                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    className="text-sm text-blue-600 hover:underline"
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
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded"
                     >
                         🛠️ Configurar Dados Iniciais
                     </button>
                 </div>
            )}
        </div>
    </div>
  );
};

export default LoginView;