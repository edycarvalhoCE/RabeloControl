
import React from 'react';
import { useStore } from '../services/store';

interface LogoProps {
  variant?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGlobe?: boolean; // Mantido para compatibilidade de props, mas não usado.
}

export const Logo: React.FC<LogoProps> = ({ variant = 'dark', className = '', size = 'md' }) => {
  const { settings } = useStore();

  // Tamanhos responsivos (altura) ajustados
  const sizeClasses = {
      sm: 'h-8',        // Menu Mobile (32px)
      md: 'h-12',       // Sidebar (48px)
      lg: 'h-20',       // Login Header (80px) - Reduzido para ficar elegante
      xl: 'h-28',       // Splash/Hero (112px)
  };

  // Se houver uma URL configurada nas settings, usa ela.
  // Se não, tenta o arquivo logo.png padrão.
  const logoSrc = settings?.logoUrl || './logo.png';

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={logoSrc} 
        alt={settings?.companyName || "Rabelo Tour"} 
        className={`${sizeClasses[size]} w-auto max-w-full object-contain drop-shadow-sm transition-all duration-300`}
        onError={(e) => {
            // Se falhar tudo, mostra o nome da empresa em texto
            e.currentTarget.style.display = 'none';
            // Mostra o fallback de texto apenas se a imagem quebrar
            const fallback = document.createElement('span');
            fallback.className = `font-bold uppercase ${variant === 'light' ? 'text-white' : 'text-slate-800'} ${size === 'sm' ? 'text-lg' : 'text-2xl'}`;
            fallback.innerText = settings?.companyName || 'Rabelo Tour';
            e.currentTarget.parentElement?.appendChild(fallback);
        }}
      />
    </div>
  );
};
