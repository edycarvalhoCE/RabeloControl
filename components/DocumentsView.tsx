import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

const DocumentsView: React.FC = () => {
  const { users, documents, addDocument, deleteDocument } = useStore();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const drivers = users.filter(u => u.role === UserRole.DRIVER);
  
  // Filter docs if a driver is selected, else show all
  const filteredDocs = selectedDriver 
    ? documents.filter(d => d.driverId === selectedDriver)
    : documents;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !docTitle || !file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Content = event.target?.result as string;
      addDocument({
        driverId: selectedDriver,
        title: docTitle,
        fileName: file.name,
        fileContent: base64Content,
      });
      // Reset form
      setDocTitle('');
      setFile(null);
      alert('Documento anexado com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Upload Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit sticky top-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Upload de Documento</h2>
        <form onSubmit={handleUpload} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selecione o Motorista</label>
                <select 
                    value={selectedDriver} 
                    onChange={e => setSelectedDriver(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                >
                    <option value="">Selecione...</option>
                    {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">O documento será visível apenas para o motorista selecionado.</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título do Documento</label>
                <input 
                    type="text" 
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    placeholder="Ex: CNH Renovada, Contrato..."
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo</label>
                <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                />
            </div>
            <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
            >
                Enviar Documento
            </button>
        </form>
      </div>

      {/* Documents List */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Documentos Arquivados</h2>
        
        {/* Filter Bar */}
        <div className="flex gap-2 mb-4">
            <button 
                onClick={() => setSelectedDriver('')}
                className={`px-3 py-1 rounded text-sm ${!selectedDriver ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}
            >
                Todos
            </button>
            {drivers.map(d => (
                <button 
                    key={d.id} 
                    onClick={() => setSelectedDriver(d.id)}
                    className={`px-3 py-1 rounded text-sm ${selectedDriver === d.id ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}
                >
                    {d.name}
                </button>
            ))}
        </div>

        <div className="space-y-2">
            {filteredDocs.length === 0 ? (
                <p className="text-slate-500 py-8 text-center bg-white rounded-lg border border-dashed border-slate-300">
                    Nenhum documento encontrado.
                </p>
            ) : (
                filteredDocs.map(doc => {
                    const driver = users.find(u => u.id === doc.driverId);
                    return (
                        <div key={doc.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
                            <div className="flex items-start gap-3">
                                <div className="bg-orange-100 p-2 rounded text-orange-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">{doc.title}</h4>
                                    <p className="text-xs text-slate-500">
                                        Motorista: <span className="font-medium text-slate-700">{driver?.name}</span> • 
                                        Arquivo: {doc.fileName} • 
                                        Data: {new Date(doc.uploadDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <a 
                                    href={doc.fileContent} 
                                    download={doc.fileName}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Baixar"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </a>
                                <button 
                                    onClick={() => deleteDocument(doc.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                    title="Excluir"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsView;