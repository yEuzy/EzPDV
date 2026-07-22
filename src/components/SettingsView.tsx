import React, { useState } from 'react';
import type { Company } from '../types';
import { Settings, Save, AlertCircle } from 'lucide-react';
import * as DB from '../utils/db';
import { LS } from '../utils/db';

interface SettingsViewProps {
  currentCompany: Company;
  setCurrentCompany: React.Dispatch<React.SetStateAction<Company | null>>;
  isOnline: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentCompany,
  setCurrentCompany,
  isOnline
}) => {
  const [enableCostPrice, setEnableCostPrice] = useState(currentCompany?.enable_cost_price || false);
  const [enableInventory, setEnableInventory] = useState(currentCompany?.enable_inventory || false);
  const [enableProductColors, setEnableProductColors] = useState(currentCompany?.enable_product_colors ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleSave = async () => {
    if (!isOnline) {
      setMessage({ text: 'Você precisa estar online para salvar configurações da empresa.', type: 'error' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const updatedCompany = { ...currentCompany, enable_cost_price: enableCostPrice, enable_inventory: enableInventory, enable_product_colors: enableProductColors };
      await DB.updateCompany(updatedCompany);
      setCurrentCompany(updatedCompany);
      localStorage.setItem(LS.COMPANY, JSON.stringify(updatedCompany));
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: 'Erro ao salvar configurações: ' + err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <Settings size={24} style={{ color: 'var(--primary)' }} />
          Configurações da Empresa
        </h3>

        {message && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: message.type === 'success' ? 'var(--mint-light)' : '#ffeef2',
            color: message.type === 'success' ? 'var(--mint)' : 'var(--danger)',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {message.type === 'error' && <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-app)'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>
                Ativar Preço de Custo
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)', maxWidth: '400px' }}>
                Permite cadastrar o custo dos produtos e calcular o lucro líquido no relatório de fechamento de caixa.
              </div>
            </div>
            
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '50px',
              height: '24px'
            }}>
              <input 
                type="checkbox" 
                checked={enableCostPrice}
                onChange={(e) => setEnableCostPrice(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: enableCostPrice ? 'var(--primary)' : '#ccc',
                transition: '.4s',
                borderRadius: '24px'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '16px',
                  width: '16px',
                  left: enableCostPrice ? '30px' : '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%'
                }} />
              </span>
              </label>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-app)'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>
                Controle de Estoque
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)', maxWidth: '400px' }}>
                Permite acompanhar e atualizar a quantidade em estoque dos seus produtos. Dá baixa automaticamente ao realizar vendas.
              </div>
            </div>
            
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '50px',
              height: '24px'
            }}>
              <input 
                type="checkbox" 
                checked={enableInventory}
                onChange={(e) => setEnableInventory(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: enableInventory ? 'var(--primary)' : '#ccc',
                transition: '.4s',
                borderRadius: '24px'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '16px',
                  width: '16px',
                  left: enableInventory ? '30px' : '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-app)'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>
                Ativar Cores de Exibição
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-light)', maxWidth: '400px' }}>
                Habilita a escolha e exibição de cores pastel para destacar os produtos no PDV.
              </div>
            </div>
            
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '50px',
              height: '24px'
            }}>
              <input 
                type="checkbox" 
                checked={enableProductColors}
                onChange={(e) => setEnableProductColors(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: enableProductColors ? 'var(--primary)' : '#ccc',
                transition: '.4s',
                borderRadius: '24px'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '16px',
                  width: '16px',
                  left: enableProductColors ? '30px' : '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn primary" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            <Save size={18} />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
};
