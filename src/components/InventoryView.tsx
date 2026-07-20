import React, { useState } from 'react';
import type { Product, Category } from '../types';
import { Package, Search, Plus, Minus, Edit2, Check, X } from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  categories: Category[];
  onUpdateProduct: (product: Product) => void;
  currentCompany: any;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  categories,
  onUpdateProduct,
  currentCompany
}) => {
  const [search, setSearch] = useState('');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState<string>('');
  const [actionType, setActionType] = useState<'add' | 'sub' | 'set'>('set');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveStock = (product: Product) => {
    const val = parseInt(stockValue, 10);
    if (isNaN(val)) return;

    let newStock = product.stock_quantity || 0;
    if (actionType === 'set') newStock = val;
    if (actionType === 'add') newStock += val;
    if (actionType === 'sub') newStock = newStock - val;

    onUpdateProduct({ ...product, stock_quantity: newStock });
    setEditingStockId(null);
  };

  const startEdit = (product: Product, action: 'add' | 'sub' | 'set') => {
    setEditingStockId(product.id);
    setActionType(action);
    setStockValue(action === 'set' ? (product.stock_quantity || 0).toString() : '');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark)' }}>
            <Package size={24} style={{ color: 'var(--primary)' }} />
            Controle de Estoque
          </h3>
          <div className="search-box" style={{ maxWidth: '300px', width: '100%' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {!currentCompany?.enable_inventory ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)' }}>
            <Package size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '8px' }}>Estoque Desativado</p>
            <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>O controle de estoque está desativado nas configurações da empresa. Ative-o para começar a gerenciar suas quantidades.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Produto</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Categoria</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Em Estoque</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const cat = categories.find(c => c.id === product.category);
                  const isEditing = editingStockId === product.id;

                  return (
                    <tr key={product.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: product.color }}></span>
                          {product.name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-light)' }}>
                        {cat ? cat.name : 'Outros'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: (product.stock_quantity || 0) <= 0 ? 'var(--danger)' : 'var(--text-dark)', fontSize: '16px' }}>
                        {product.stock_quantity || 0}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>
                              {actionType === 'set' ? 'Novo:' : actionType === 'add' ? 'Somar:' : 'Subtrair:'}
                            </span>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '70px', padding: '6px', fontSize: '14px', textAlign: 'center' }}
                              value={stockValue}
                              onChange={e => setStockValue(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveStock(product);
                                if (e.key === 'Escape') setEditingStockId(null);
                              }}
                            />
                            <button className="btn primary" style={{ padding: '6px', backgroundColor: 'var(--mint)' }} onClick={() => handleSaveStock(product)}>
                              <Check size={16} />
                            </button>
                            <button className="btn secondary" style={{ padding: '6px' }} onClick={() => setEditingStockId(null)}>
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => startEdit(product, 'add')} title="Dar Entrada (+)">
                              <Plus size={14} style={{ color: 'var(--mint)' }} />
                            </button>
                            <button className="btn secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => startEdit(product, 'sub')} title="Baixa Manual (-)">
                              <Minus size={14} style={{ color: 'var(--danger)' }} />
                            </button>
                            <button className="btn secondary" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => startEdit(product, 'set')} title="Ajuste Exato (Definir)">
                              <Edit2 size={14} style={{ color: 'var(--primary)' }} />
                              <span style={{ marginLeft: '4px' }}>Ajustar</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-light)' }}>
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
