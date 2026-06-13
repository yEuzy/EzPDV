import React, { useState, useEffect, useRef } from 'react';
import type { Operator, Company } from '../types';
import { Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface LoginScreenProps {
  operators: Operator[];
  company: Company | null;
  onLogin: (operatorId: string, pin: string) => boolean;
  isLoading?: boolean;
  onOpenMasterPanel: () => void;
}

// Resolve ícone pelo nome (string) vindo do banco
function DynamicIcon({ name, size = 48, color }: { name: string; size?: number; color?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ size?: number; color?: string }>>)[name];
  if (!Icon) {
    const Fallback = LucideIcons.Store;
    return <Fallback size={size} color={color} />;
  }
  return <Icon size={size} color={color} />;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  operators,
  company,
  onLogin,
  isLoading = false,
  onOpenMasterPanel,
}) => {
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(
    operators[0]?.id || ''
  );
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Triple-click counter for master panel trigger
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atualizar operador selecionado quando a lista carregar
  useEffect(() => {
    if (operators.length > 0 && !selectedOperatorId) {
      setSelectedOperatorId(operators[0].id);
    }
  }, [operators, selectedOperatorId]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setError('O PIN deve ter 4 dígitos.');
      return;
    }
    const success = onLogin(selectedOperatorId, pin);
    if (!success) {
      setError('PIN incorreto. Tente novamente.');
      setPin('');
    }
  };

  // Auto submit quando PIN atinge 4 dígitos
  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

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
  const companyName = company?.name ?? 'EzPDV';
  const companyTagline = company?.tagline ?? 'Sistema de Ponto de Venda';
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

          <h2 className="login-title">{companyName}</h2>
          <p className="login-subtitle">{companyTagline}</p>

          {error && <div className="login-error">{error}</div>}

          {isLoading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', padding: '20px', color: 'var(--text-light)', fontSize: '14px',
            }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Carregando…
            </div>
          ) : operators.length === 0 ? (
            <div style={{
              padding: '16px', textAlign: 'center', fontSize: '13px',
              color: 'var(--danger)',
              backgroundColor: 'rgba(239,71,111,0.08)',
              borderRadius: 'var(--radius-sm)', marginBottom: '16px',
            }}>
              Nenhum operador encontrado. Verifique a conexão e o VITE_COMPANY_ID no .env.
            </div>
          ) : (
            <>
              <div className="form-group" style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label className="form-label">Operador</label>
                <select
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', height: '44px', fontSize: '15px' }}
                  value={selectedOperatorId}
                  onChange={e => {
                    setSelectedOperatorId(e.target.value);
                    setPin('');
                    setError('');
                  }}
                >
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.role === 'admin' ? 'Admin' : 'Operador'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px', textAlign: 'center' }}>
                <label className="form-label">PIN de Acesso</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  className="form-input"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    height: '56px', fontSize: '24px', textAlign: 'center',
                    letterSpacing: '8px', fontWeight: 'bold',
                  }}
                  value={pin}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 4) {
                      setPin(val);
                      setError('');
                    }
                  }}
                  placeholder="****"
                  autoFocus
                />
              </div>
            </>
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
