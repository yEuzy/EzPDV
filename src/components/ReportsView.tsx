import React, { useState } from 'react';
import type { Sale, CashRegister, CashRegisterSession, Operator } from '../types';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Trash2, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Lock,
  Unlock,
  History,
  FileText,
  X,
  Users,
  UserPlus,
  UserX,
  Pencil,
  Shield,
  User,
  Save
} from 'lucide-react';

interface ReportsViewProps {
  sales: Sale[];
  onClearSales: () => void;
  onResetAllData: () => void;
  cashRegister: CashRegister;
  pastSessions: CashRegisterSession[];
  onCloseRegister: (notes?: string) => void;
  onRegisterMovement: (type: 'sangria' | 'reforco', amount: number, reason?: string) => void;
  currentUser: Operator;
  operators: Operator[];
  onAddOperator: (data: Omit<Operator, 'id' | 'created_at'>) => Promise<void>;
  onUpdateOperator: (operator: Operator) => Promise<void>;
  onDeleteOperator: (id: string) => Promise<void>;
  isOnline: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  onClearSales,
  onResetAllData,
  cashRegister,
  pastSessions,
  onCloseRegister,
  onRegisterMovement,
  currentUser,
  operators,
  onAddOperator,
  onUpdateOperator,
  onDeleteOperator,
  isOnline
}) => {
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');

  // Cash movement states
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'sangria' | 'reforco'>('sangria');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Operator management states
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [opName, setOpName] = useState('');
  const [opRole, setOpRole] = useState<'operator' | 'admin'>('operator');
  const [opPin, setOpPin] = useState('');
  const [opPinConfirm, setOpPinConfirm] = useState('');
  const [opError, setOpError] = useState('');
  const [opLoading, setOpLoading] = useState(false);

  // Filter sales: if register is open, show sales for current session.
  // Otherwise, show today's general sales.
  const activeSales = (cashRegister.isOpen && cashRegister.openedAt)
    ? sales.filter(sale => new Date(sale.date) >= new Date(cashRegister.openedAt!))
    : sales.filter(sale => new Date(sale.date).toDateString() === new Date().toDateString());

  // Calculate metrics
  const totalRevenue = activeSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSalesCount = activeSales.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // Calculate payment method breakdown
  const paymentBreakdown = activeSales.reduce((acc, sale) => {
    if (sale.payments && Array.isArray(sale.payments)) {
      sale.payments.forEach(p => {
        acc[p.method] = (acc[p.method] || 0) + p.amount;
      });
    } else {
      // Fallback for retrocompatibility
      const method = (sale as any).paymentMethod || 'PIX';
      acc[method] = (acc[method] || 0) + sale.total;
    }
    return acc;
  }, {} as Record<string, number>);

  const cashSales = paymentBreakdown['Dinheiro'] || 0;
  const pixSales = paymentBreakdown['PIX'] || 0;
  const creditSales = paymentBreakdown['Cartão de Crédito'] || 0;
  const debitSales = paymentBreakdown['Cartão de Débito'] || 0;

  const totalReforcos = cashRegister.movements
    ?.filter(m => m.type === 'reforco')
    .reduce((sum, m) => sum + m.amount, 0) || 0;

  const totalSangrias = cashRegister.movements
    ?.filter(m => m.type === 'sangria')
    .reduce((sum, m) => sum + m.amount, 0) || 0;

  const finalCash = cashRegister.startingCash + cashSales + totalReforcos - totalSangrias;

  const getPaymentPercentage = (amount: number) => {
    if (totalRevenue === 0) return 0;
    return (amount / totalRevenue) * 100;
  };

  const paymentMethods: Array<'PIX' | 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito'> = [
    'PIX', 
    'Dinheiro', 
    'Cartão de Crédito', 
    'Cartão de Débito'
  ];

  const paymentColors: Record<'PIX' | 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito', string> = {
    'PIX': 'var(--accent)',
    'Dinheiro': 'var(--mint)',
    'Cartão de Crédito': 'var(--primary)',
    'Cartão de Débito': 'var(--secondary)'
  };

  const toggleExpandSale = (id: string) => {
    if (expandedSaleId === id) {
      setExpandedSaleId(null);
    } else {
      setExpandedSaleId(id);
    }
  };

  const handleExportCSV = () => {
    if (activeSales.length === 0) {
      alert('Nenhuma venda registrada no turno para exportar.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID da Venda,Data/Hora,Itens,Total (R$),Formas de Pagamento,Operador\n';

    activeSales.forEach(sale => {
      const itemsSummary = sale.items.map(item => `${item.product.name} (x${item.quantity})`).join(' | ');
      const formattedDate = new Date(sale.date).toLocaleString('pt-BR');
      const paymentsSummary = sale.payments?.map(p => `${p.method}: R$ ${p.amount.toFixed(2)}`).join(' | ') || (sale as any).paymentMethod || 'PIX';
      csvContent += `"${sale.id}","${formattedDate}","${itemsSummary}",${sale.total.toFixed(2)},"${paymentsSummary}","${sale.soldBy || 'Caixa 1'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendas_caixa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Seção do Caixa Atual (Turno) */}
      <div className="card" style={{ border: cashRegister.isOpen ? '1px solid #ffe8cc' : '1px solid var(--border-color)', backgroundColor: cashRegister.isOpen ? '#fffcf9' : 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark)' }}>
            {cashRegister.isOpen ? <Unlock size={20} style={{ color: 'var(--mint)' }} /> : <Lock size={20} style={{ color: 'var(--text-light)' }} />}
            Caixa Atual: {cashRegister.isOpen ? 'ABERTO' : 'FECHADO'}
          </h3>
          {cashRegister.isOpen && (
            <button 
              className="btn secondary" 
              style={{ backgroundColor: '#ffeef2', color: 'var(--danger)', borderColor: 'rgba(239, 71, 111, 0.2)', flex: 'none', padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setShowCloseModal(true)}
            >
              <Lock size={14} />
              Fechar Caixa
            </button>
          )}
        </div>

        {cashRegister.isOpen ? (
          <div>
            {/* Cash register movement triggers */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button 
                className="btn secondary" 
                style={{ borderColor: 'var(--mint)', color: 'var(--mint)', flex: 'none', padding: '6px 12px', fontSize: '13px', backgroundColor: 'transparent' }}
                onClick={() => {
                  setMovementType('reforco');
                  setMovementAmount('');
                  setMovementReason('');
                  setShowMovementModal(true);
                }}
              >
                + Reforço (Entrada)
              </button>
              <button 
                className="btn secondary" 
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)', flex: 'none', padding: '6px 12px', fontSize: '13px', backgroundColor: 'transparent' }}
                onClick={() => {
                  setMovementType('sangria');
                  setMovementAmount('');
                  setMovementReason('');
                  setShowMovementModal(true);
                }}
              >
                - Sangria (Retirada)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block' }}>Aberto por</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-dark)' }}>{cashRegister.openedBy || 'Caixa 1'}</strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block' }}>Dinheiro de Abertura</span>
                <strong style={{ fontSize: '16px', color: 'var(--text-dark)' }}>R$ {cashRegister.startingCash.toFixed(2)}</strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block' }}>Vendas em Dinheiro</span>
                <strong style={{ fontSize: '16px', color: 'var(--mint)' }}>+ R$ {cashSales.toFixed(2)}</strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block' }}>Total Reforços</span>
                <strong style={{ fontSize: '16px', color: 'var(--mint)' }}>+ R$ {totalReforcos.toFixed(2)}</strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block' }}>Total Sangrias</span>
                <strong style={{ fontSize: '16px', color: 'var(--danger)' }}>- R$ {totalSangrias.toFixed(2)}</strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--mint)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block' }}>Saldo em Dinheiro Esperado</span>
                <strong style={{ fontSize: '16px', color: 'var(--mint)' }}>R$ {finalCash.toFixed(2)}</strong>
              </div>
            </div>

            {/* List active session movements */}
            {cashRegister.movements && cashRegister.movements.length > 0 && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '10px', color: 'var(--text-dark)', fontWeight: 700 }}>Movimentações do Turno Atual</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-light)' }}>
                        <th style={{ padding: '8px' }}>Hora</th>
                        <th style={{ padding: '8px' }}>Tipo</th>
                        <th style={{ padding: '8px' }}>Valor</th>
                        <th style={{ padding: '8px' }}>Operador</th>
                        <th style={{ padding: '8px' }}>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashRegister.movements.map((mv) => (
                        <tr key={mv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px', color: 'var(--text-light)' }}>
                            {new Date(mv.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 700, color: mv.type === 'sangria' ? 'var(--danger)' : 'var(--mint)' }}>
                            {mv.type === 'sangria' ? 'Sangria' : 'Reforço'}
                          </td>
                          <td style={{ padding: '8px', fontWeight: 700, color: mv.type === 'sangria' ? 'var(--danger)' : 'var(--mint)' }}>
                            {mv.type === 'sangria' ? '-' : '+'} R$ {mv.amount.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--text-dark)' }}>{mv.operator}</td>
                          <td style={{ padding: '8px', color: 'var(--text-light)' }}>
                            {mv.reason || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Não informado</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ fontSize: '12px', color: 'var(--text-light)', borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '16px' }}>
              Caixa aberto em: {new Date(cashRegister.openedAt!).toLocaleString('pt-BR')}
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
            Nenhum caixa ativo no momento. Vá para o **Painel de Vendas** para abrir o caixa e começar a trabalhar.
          </p>
        )}
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper revenue">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Faturamento Turno</span>
            <span className="stat-value">R$ {totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper sales">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Vendas Turno</span>
            <span className="stat-value">{totalSalesCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper average">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Ticket Médio</span>
            <span className="stat-value">R$ {averageTicket.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="reports-charts-layout">
        {/* Payment Breakdown Card */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Vendas por Pagamento</h3>
          {totalRevenue === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
              Aguardando primeiras vendas do dia...
            </div>
          ) : (
            <div className="payment-breakdown-list">
              {paymentMethods.map(method => {
                const total = paymentBreakdown[method] || 0;
                const percentage = getPaymentPercentage(total);
                return (
                  <div key={method} className="payment-breakdown-item">
                    <div className="payment-breakdown-info">
                      <span className="payment-breakdown-label">
                        <span 
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '3px', 
                            backgroundColor: paymentColors[method],
                            display: 'inline-block'
                          }} 
                        />
                        {method}
                      </span>
                      <span>R$ {total.toFixed(2)} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="payment-breakdown-bar-bg">
                      <div 
                        className="payment-breakdown-bar-fill" 
                        style={{ 
                          width: `${percentage}%`, 
                          backgroundColor: paymentColors[method] 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transactions Feed */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>{cashRegister.isOpen ? 'Histórico do Caixa' : 'Histórico de Hoje'}</h3>
            <button 
              className="btn secondary" 
              onClick={handleExportCSV} 
              style={{ padding: '6px 12px', fontSize: '12px', flex: 'none' }}
              disabled={activeSales.length === 0}
            >
              <FileSpreadsheet size={14} />
              Exportar CSV
            </button>
          </div>

          {activeSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
              Nenhuma venda registrada no turno atual.
            </div>
          ) : (
            <div className="transaction-list">
              {activeSales.map((sale) => {
                const isExpanded = expandedSaleId === sale.id;
                const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <div key={sale.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-color)' }}>
                    <div 
                      className="transaction-item"
                      style={{ cursor: 'pointer', padding: '14px 8px', borderBottom: 'none' }}
                      onClick={() => toggleExpandSale(sale.id)}
                    >
                      <div className="transaction-info">
                        <span className="transaction-id">Venda #{sale.id.slice(0, 6)}</span>
                        <span className="transaction-meta">
                          {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {itemCount} {itemCount === 1 ? 'item' : 'itens'} • por <strong>{sale.soldBy || 'Caixa 1'}</strong>
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="transaction-value-col" style={{ textAlign: 'right' }}>
                          <span className="transaction-amount" style={{ display: 'block', fontWeight: 700 }}>R$ {sale.total.toFixed(2)}</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            {sale.payments && sale.payments.length > 0 ? (
                              sale.payments.map((p, idx) => (
                                <span 
                                  key={idx} 
                                  className="transaction-method" 
                                  style={{ 
                                    backgroundColor: `${paymentColors[p.method] || 'var(--primary)'}15`, 
                                    color: paymentColors[p.method] || 'var(--primary)', 
                                    fontWeight: 700,
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  {p.method} (R$ {p.amount.toFixed(2)})
                                </span>
                              ))
                            ) : (
                              <span 
                                className="transaction-method" 
                                style={{ 
                                  backgroundColor: `${paymentColors[((sale as any).paymentMethod || 'PIX') as 'PIX' | 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito'] || 'var(--primary)'}15`, 
                                  color: paymentColors[((sale as any).paymentMethod || 'PIX') as 'PIX' | 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito'] || 'var(--primary)', 
                                  fontWeight: 700,
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}
                              >
                                {(sale as any).paymentMethod || 'PIX'}
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={16} color="var(--text-light)" /> : <ChevronDown size={16} color="var(--text-light)" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 8px 16px 8px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', margin: '0 8px 12px 8px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 700, padding: '8px 0 4px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', color: 'var(--text-dark)' }}>
                          Itens do Pedido:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {sale.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dark)' }}>
                              <div>
                                <span>{item.quantity}x <strong>{item.product.name}</strong></span>
                                {item.notes && (
                                  <div style={{ fontSize: '11px', color: 'var(--primary)', fontStyle: 'italic', marginLeft: '14px' }}>
                                    Obs: {item.notes}
                                  </div>
                                )}
                              </div>
                              <span style={{ fontWeight: 500 }}>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Admin Panel Card */}
      {currentUser.role === 'admin' ? (
        <>
          {/* Gerenciar Operadores */}
          <div className="card" style={{ border: '1px solid rgba(99,102,241,0.3)', backgroundColor: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark)' }}>
                <Users size={20} style={{ color: 'var(--primary)' }} />
                Gerenciar Operadores
                {!isOnline && <span style={{ fontSize: '10px', color: 'var(--danger)', backgroundColor: 'rgba(239,71,111,0.1)', padding: '2px 6px', borderRadius: '6px' }}>Offline</span>}
              </h3>
              <button
                className="btn primary"
                style={{ flex: 'none', padding: '8px 14px', fontSize: '12px' }}
                onClick={() => {
                  setEditingOperator(null);
                  setOpName('');
                  setOpRole('operator');
                  setOpPin('');
                  setOpPinConfirm('');
                  setOpError('');
                  setShowOperatorModal(true);
                }}
              >
                <UserPlus size={14} />
                Novo Operador
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {operators.map(op => (
                <div
                  key={op.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: op.id === currentUser.id ? 'rgba(99,102,241,0.06)' : 'var(--bg-app)',
                    borderRadius: 'var(--radius-sm)',
                    border: op.id === currentUser.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: op.role === 'admin' ? 'rgba(99,102,241,0.12)' : 'rgba(6,214,160,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {op.role === 'admin' ? <Shield size={16} color="var(--primary)" /> : <User size={16} color="var(--mint)" />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>
                        {op.name}
                        {op.id === currentUser.id && <span style={{ fontSize: '10px', color: 'var(--primary)', marginLeft: '6px', fontWeight: 600 }}>(você)</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                        {op.role === 'admin' ? '🔑 Gerente (Admin)' : '🧾 Operador de Caixa'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn secondary"
                      style={{ padding: '6px 10px', fontSize: '12px', flex: 'none' }}
                      onClick={() => {
                        setEditingOperator(op);
                        setOpName(op.name);
                        setOpRole(op.role);
                        setOpPin('');
                        setOpPinConfirm('');
                        setOpError('');
                        setShowOperatorModal(true);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    {op.id !== currentUser.id && (
                      <button
                        className="btn secondary"
                        style={{ padding: '6px 10px', fontSize: '12px', flex: 'none', color: 'var(--danger)', borderColor: 'rgba(239,71,111,0.3)' }}
                        onClick={async () => {
                          if (window.confirm(`Excluir o operador "${op.name}"? Esta ação não pode ser desfeita.`)) {
                            await onDeleteOperator(op.id);
                          }
                        }}
                      >
                        <UserX size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {operators.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)', fontSize: '13px' }}>
                  Nenhum operador cadastrado.
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ border: '1px dashed var(--danger)', backgroundColor: '#fffafb' }}>
            <h3 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Zona de Perigo</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '18px' }}>
              Ações de redefinição de dados da aplicação. Certifique-se antes de prosseguir.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button
                className="btn secondary"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', flex: '1 1 auto', backgroundColor: 'transparent' }}
                onClick={() => {
                  if (window.confirm('Atenção: Isso irá apagar todas as vendas realizadas. Confirma?')) {
                    onClearSales();
                    alert('Histórico de vendas reiniciado com sucesso!');
                  }
                }}
              >
                <Trash2 size={16} />
                Zerar Histórico de Vendas
              </button>

              <button
                className="btn secondary"
                style={{ backgroundColor: '#ffeef2', border: 'none', color: 'var(--danger)', flex: '1 1 auto' }}
                onClick={() => {
                  if (window.confirm('PERIGO: Isso irá apagar todo o histórico de vendas e caixas. Tem certeza?')) {
                    onResetAllData();
                    alert('Dados resetados com sucesso!');
                  }
                }}
              >
                <RotateCcw size={16} />
                Zerar Vendas e Caixas
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', opacity: 0.8 }}>
          <h3 style={{ color: 'var(--text-light)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} />
            Painel Administrativo
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>
            Apenas usuários administradores (Gerentes) podem realizar redefinições ou gerenciar operadores.
          </p>
        </div>
      )}

      {/* Histórico de Caixas Fechados */}
      <div className="card">
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark)' }}>
          <History size={20} style={{ color: 'var(--primary)' }} />
          Histórico de Caixas Fechados ({pastSessions.length})
        </h3>
        
        {pastSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)', fontSize: '14px' }}>
            Nenhum caixa encerrado anteriormente no histórico.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
            {pastSessions.map((session) => (
              <div key={session.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <strong>Caixa #{session.id}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '10px' }}>
                    {new Date(session.closedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', fontSize: '12px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--text-light)' }}>Período:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                      {new Date(session.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(session.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-light)' }}>Operadores:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                      Aberto por <strong>{session.openedBy}</strong><br />
                      Fechado por <strong>{session.closedBy}</strong>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-light)' }}>Saldo Inicial:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>R$ {session.startingCash.toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-light)' }}>Vendas Dinheiro:</span>
                    <div style={{ fontWeight: 600, color: 'var(--mint)' }}>R$ {session.cashSales.toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-light)' }}>Reforços / Sangrias:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                      <span style={{ color: 'var(--mint)' }}>+ R$ {(session.totalReforcos || 0).toFixed(2)}</span> / <span style={{ color: 'var(--danger)' }}>- R$ {(session.totalSangrias || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-light)' }}>Dinheiro Final:</span>
                    <div style={{ fontWeight: 700, color: 'var(--mint)' }}>R$ {session.finalCash.toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-light)' }}>Total PIX:</span>
                    <div style={{ fontWeight: 600, color: 'var(--accent)' }}>R$ {session.pixSales.toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-light)' }}>Cartões (Cr/Déb):</span>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>R$ {(session.creditSales + session.debitSales).toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-light)' }}>Total de Vendas:</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>R$ {session.totalSales.toFixed(2)}</div>
                  </div>
                </div>

                {/* Movements list in the session */}
                {session.movements && session.movements.length > 0 && (
                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '8px', fontSize: '11px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>Movimentações do Caixa:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {session.movements.map(mv => (
                        <div key={mv.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dark)' }}>
                          <span>
                            [{new Date(mv.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] {' '}
                            <strong style={{ color: mv.type === 'sangria' ? 'var(--danger)' : 'var(--mint)' }}>
                              {mv.type === 'sangria' ? 'Sangria' : 'Reforço'}
                            </strong> {' '}
                            por {mv.operator} {mv.reason && `(${mv.reason})`}
                          </span>
                          <strong style={{ color: mv.type === 'sangria' ? 'var(--danger)' : 'var(--mint)' }}>
                            {mv.type === 'sangria' ? '-' : '+'} R$ {mv.amount.toFixed(2)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {session.notes && (
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                    <FileText size={12} />
                    Obs: {session.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Fechamento de Caixa */}
      {showCloseModal && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <button 
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              onClick={() => setShowCloseModal(false)}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-dark)' }}>Confirmar Fechamento de Caixa</h2>
            
            <div style={{ backgroundColor: 'var(--bg-app)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '13px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-dark)' }}>
                <span>Dinheiro Inicial (Abertura):</span>
                <strong>R$ {cashRegister.startingCash.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-dark)' }}>
                <span>Vendas em Dinheiro:</span>
                <strong style={{ color: 'var(--mint)' }}>+ R$ {cashSales.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-dark)' }}>
                <span>Total Reforços:</span>
                <strong style={{ color: 'var(--mint)' }}>+ R$ {totalReforcos.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-dark)' }}>
                <span>Total Sangrias:</span>
                <strong style={{ color: 'var(--danger)' }}>- R$ {totalSangrias.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                <span>Saldo em Dinheiro Esperado:</span>
                <span style={{ color: 'var(--mint)' }}>R$ {finalCash.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--text-dark)' }}>
                <span>Vendas em PIX:</span>
                <strong style={{ color: 'var(--accent)' }}>R$ {pixSales.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--text-dark)' }}>
                <span>Vendas em Cartão de Crédito:</span>
                <strong style={{ color: 'var(--primary)' }}>R$ {creditSales.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-dark)' }}>
                <span>Vendas em Cartão de Débito:</span>
                <strong style={{ color: 'var(--secondary)' }}>R$ {debitSales.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '15px', color: 'var(--text-dark)' }}>
                <span>Total de Vendas no Turno:</span>
                <span>R$ {totalRevenue.toFixed(2)}</span>
              </div>
            </div>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '12px', display: 'block', marginBottom: '6px' }}>Observações / Divergências (Opcional)</label>
              <textarea
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ex: Tudo bateu certinho / Falta de R$ 1,50 no caixa..."
                rows={2}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn secondary" style={{ flex: 1 }} onClick={() => setShowCloseModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn primary" 
                style={{ flex: 1, backgroundColor: 'var(--danger)' }} 
                onClick={() => {
                  onCloseRegister(closingNotes);
                  setShowCloseModal(false);
                  setClosingNotes('');
                  alert('Caixa fechado com sucesso!');
                }}
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sangria e Reforço */}
      {showMovementModal && (
        <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <button 
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              onClick={() => setShowMovementModal(false)}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-dark)' }}>
              Registrar {movementType === 'sangria' ? 'Sangria (Retirada)' : 'Reforço (Entrada)'}
            </h2>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const val = parseFloat(movementAmount);
              if (isNaN(val) || val <= 0) {
                alert('Por favor, insira um valor válido maior que zero.');
                return;
              }
              if (movementType === 'sangria' && val > finalCash) {
                alert(`Valor de sangria (R$ ${val.toFixed(2)}) não pode ser maior que o saldo em dinheiro em caixa (R$ ${finalCash.toFixed(2)}).`);
                return;
              }
              onRegisterMovement(movementType, val, movementReason);
              setShowMovementModal(false);
              setMovementAmount('');
              setMovementReason('');
              alert(`${movementType === 'sangria' ? 'Sangria' : 'Reforço'} registrado com sucesso!`);
            }}>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  required
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '18px', fontWeight: 'bold' }}
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                  Motivo / Justificativa
                </label>
                <input
                  type="text"
                  className="form-input"
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={movementType === 'sangria' ? 'Ex: Depósito bancário, pagamento de fornecedor...' : 'Ex: Troco inicial extra, moedas...'}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={() => setShowMovementModal(false)}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn primary" 
                  style={{ flex: 1, backgroundColor: movementType === 'sangria' ? 'var(--danger)' : 'var(--mint)' }} 
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Operador */}
      {showOperatorModal && (
        <div className="modal-overlay" onClick={() => setShowOperatorModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '90%' }}>
            <button
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              onClick={() => setShowOperatorModal(false)}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingOperator ? <Pencil size={18} /> : <UserPlus size={18} />}
              {editingOperator ? 'Editar Operador' : 'Novo Operador'}
            </h2>

            {opError && (
              <div style={{ backgroundColor: 'rgba(239,71,111,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '16px' }}>
                {opError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setOpError('');
              if (!opName.trim()) { setOpError('Nome é obrigatório.'); return; }
              if (!editingOperator && opPin.length !== 4) { setOpError('O PIN deve ter exatamente 4 dígitos.'); return; }
              if (!editingOperator && opPin !== opPinConfirm) { setOpError('Os PINs não coincidem.'); return; }
              if (opPin && opPin.length > 0 && opPin.length !== 4) { setOpError('O PIN deve ter exatamente 4 dígitos.'); return; }
              if (opPin && opPinConfirm && opPin !== opPinConfirm) { setOpError('Os PINs não coincidem.'); return; }
              if (opPin && !/^\d{4}$/.test(opPin)) { setOpError('O PIN deve conter apenas números.'); return; }

              setOpLoading(true);
              try {
                if (editingOperator) {
                  await onUpdateOperator({
                    ...editingOperator,
                    name: opName.trim(),
                    role: opRole,
                    pin: opPin.length === 4 ? opPin : editingOperator.pin,
                  });
                } else {
                  await onAddOperator({ name: opName.trim(), role: opRole, pin: opPin });
                }
                setShowOperatorModal(false);
              } catch (err: any) {
                setOpError(err.message || 'Erro ao salvar operador.');
              } finally {
                setOpLoading(false);
              }
            }}>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12px', display: 'block', marginBottom: '6px' }}>Nome</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={opName}
                  onChange={e => setOpName(e.target.value)}
                  placeholder="Nome do operador"
                  required
                />
              </div>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12px', display: 'block', marginBottom: '6px' }}>Função / Perfil</label>
                <select
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', height: '44px' }}
                  value={opRole}
                  onChange={e => setOpRole(e.target.value as 'operator' | 'admin')}
                >
                  <option value="operator">🧾 Operador de Caixa</option>
                  <option value="admin">🔑 Gerente (Admin)</option>
                </select>
              </div>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                  PIN (4 dígitos){editingOperator && ' — deixe em branco para manter o atual'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', letterSpacing: '8px', fontSize: '18px' }}
                  value={opPin}
                  onChange={e => setOpPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  required={!editingOperator}
                />
              </div>

              {(!editingOperator || opPin.length > 0) && (
                <div className="form-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12px', display: 'block', marginBottom: '6px' }}>Confirmar PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box', letterSpacing: '8px', fontSize: '18px' }}
                    value={opPinConfirm}
                    onChange={e => setOpPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    required={!editingOperator || opPin.length > 0}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={() => setShowOperatorModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={opLoading}>
                  {opLoading ? 'Salvando…' : <><Save size={14} /> Salvar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
