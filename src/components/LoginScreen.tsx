import React, { useState, useEffect, useRef } from 'react';
import type { Company } from '../types';
import { Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface LoginScreenProps {
  company: Company | null;
  onLogin: (username: string, pin: string) => Promise<boolean>;
  isLoading?: boolean;
  onOpenMasterPanel: () => void;
}

// Resolve ícone pelo nome (string) vindo do banco
function DynamicIcon({ name, size = 48, color }: { name: string; size?: number; color?: string }) {
  let resolvedName = name;
  if (name === 'IceCreamCone' || name === 'IceCreamBowl') resolvedName = 'Store';
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ size?: number; color?: string }>>)[resolvedName];
  if (!Icon) {
    const Fallback = LucideIcons.Store;
    return <Fallback size={size} color={color} />;
  }
  return <Icon size={size} color={color} />;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  company,
  onLogin,
  isLoading = false,
  onOpenMasterPanel,
}) => {
  const [username, setUsername] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Triple-click counter for master panel trigger
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNumberClick = (num: string) => {
    setPin(prev => prev + num);
    setError('');
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setError('Por favor, informe o usuário.');
      return;
    }
    if (!pin.trim()) {
      setError('Por favor, informe a senha.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    const success = await onLogin(username.trim(), pin);
    
    setIsSubmitting(false);

    if (!success) {
      setError('Usuário ou senha incorretos.');
      setPin('');
    }
  };

  // Teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora digitação de números/backspace se estiver dentro de um input (evita duplicação)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        // Ainda permite o atalho do painel master
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
          e.preventDefault();
          onOpenMasterPanel();
        }
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
      
      // Ctrl+Shift+M → painel master (delegado ao App)
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        onOpenMasterPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  // Triple-click no logo → painel master (delegado ao App)
  const handleLogoClick = () => {
    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    if (logoClickCount.current >= 3) {
      logoClickCount.current = 0;
      onOpenMasterPanel();
    } else {
      logoClickTimer.current = setTimeout(() => {
        logoClickCount.current = 0;
      }, 600);
    }
  };

  const primaryColor = 'var(--primary)';
  const companyIcon = company?.icon ?? 'Store';

  return (
    <>
      <div className="login-overlay">
        <div className="login-card card">
          {/* Logo da empresa — triple-click abre master */}
          <div
            className="login-logo"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'default', userSelect: 'none',
              color: primaryColor,
            }}
            onClick={handleLogoClick}
            title=""
          >
            <DynamicIcon name={companyIcon} size={48} color={primaryColor} />
          </div>

          <h2 className="login-title">EzPDV</h2>
          <p className="login-subtitle">Sistema de Ponto de Venda</p>

          {error && <div className="login-error">{error}</div>}

          {isLoading || isSubmitting ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', padding: '20px', color: 'var(--text-light)', fontSize: '14px',
            }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              {isSubmitting ? 'Autenticando...' : 'Carregando…'}
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <div className="form-group" style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label className="form-label">Usuário</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', height: '44px', fontSize: '15px' }}
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="Digite seu usuário"
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  className="form-input"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    height: '44px', fontSize: '15px', letterSpacing: pin.length > 0 ? '4px' : 'normal'
                  }}
                  value={pin}
                  onChange={e => {
                    setPin(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  placeholder="Digite sua senha de 4 dígitos"
                />
              </div>
              
              <button 
                type="submit" 
                className="btn primary" 
                style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: 'var(--radius-md)', marginTop: '8px' }}
              >
                Entrar
              </button>
            </form>
          )}

          {/* Dica discreta para acesso master */}
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--border-color)', userSelect: 'none' }}>
              v2.0 · {company?.id ?? '—'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginScreen;
