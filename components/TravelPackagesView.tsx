import React, { useState } from 'react';
import { useStore } from '../services/store';
import { PackagePassenger, TravelPackage } from '../types';

const TravelPackagesView: React.FC = () => {
  const { travelPackages, packagePassengers } = useStore();
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null);

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Pacotes de Viagem</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {travelPackages.map((pkg) => {
                const paxCount = packagePassengers.filter(p => p.packageId === pkg.id).length;
                return (
                    <div 
                        key={pkg.id} 
                        onClick={() => setSelectedPackage(pkg)}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                    >
                        <div className="p-5">
                            <h3 className="font-bold text-lg text-slate-800 mb-1">{pkg.title}</h3>
                            <p className="text-slate-500 text-sm mb-4">
                                {new Date(pkg.date).toLocaleDateString('pt-BR')}
                            </p>
                            
                            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600 mb-4">
                                <span className="bg-slate-100 px-2 py-1 rounded">Adulto: R$ {pkg.adultPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                <span className="bg-slate-100 px-2 py-1 rounded">Criança: R$ {pkg.childPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    {paxCount} Passageiros
                                </span>
                                <span className="text-slate-400 text-sm group-hover:translate-x-1 transition-transform">
                                    Gerenciar &rarr;
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
            
            {travelPackages.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                    <p>Nenhum pacote de viagem cadastrado.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default TravelPackagesView;
