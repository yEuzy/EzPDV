import React, { useState, useEffect } from 'react';
import type { Operator } from '../types';
import { Delete, Loader2, IceCreamCone } from 'lucide-react';

interface LoginScreenProps {
  operators: Operator[];
  onLogin: (operatorId: string, pin: string) => boolean;
  isLoading?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  operators,
  onLogin,
  isLoading = false,
}) => {
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(
    operators[0]?.id || ''
  );
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Atualizar o operador selecionado quando a lista carregar
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
      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  return (
    <div className="login-overlay">
      <div className="login-card card">
        <div className="login-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IceCreamCone size={48} /></div>
        <h2 className="login-title">EzPDV Gelateria</h2>
        <p className="login-subtitle">
          Selecione seu operador e digite seu PIN de 4 dígitos para entrar.
        </p>

        {error && <div className="login-error">{error}</div>}

        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '20px',
              color: 'var(--text-light)',
              fontSize: '14px',
            }}
          >
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Carregando operadores…
          </div>
        ) : operators.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              fontSize: '13px',
              color: 'var(--danger)',
              backgroundColor: 'rgba(239,71,111,0.08)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
            }}
          >
            Nenhum operador encontrado. Verifique a conexão com o banco de dados.
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
                    {op.name} ({op.role === 'admin' ? 'Gerente' : 'Operador'})
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
                  width: '100%', 
                  boxSizing: 'border-box', 
                  height: '56px', 
                  fontSize: '24px', 
                  textAlign: 'center',
                  letterSpacing: '8px',
                  fontWeight: 'bold'
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
      </div>
    </div>
  );
};

export default LoginScreen;
