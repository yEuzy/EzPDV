import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { Plus, Edit2, Trash2, RotateCcw, Save } from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

const PASTEL_COLORS = [
  '#FFF4D4', // Creme / Baunilha
  '#E2C4B1', // Chocolate
  '#FFD1DC', // Morango
  '#D4EDDA', // Menta
  '#E8D7F1', // Uva / Açaí
  '#E0F7FA', // Bebidas / Azul
  '#FFE5D9', // Doce de Leite / Caramelo
  '#FFF8DC', // Creme de Coco
  '#FFCDD2', // Framboesa
  '#F4E3D3', // Misto
  '#D8BCA3', // Trufado
  '#FCE4EC'  // Cereja
];

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('casquinhas');
  const [color, setColor] = useState(PASTEL_COLORS[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Update form fields when editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setPrice(editingProduct.price.toString());
      setCategory(editingProduct.category);
      setColor(editingProduct.color);
      setDescription(editingProduct.description || '');
    } else {
      resetForm();
    }
  }, [editingProduct]);

  const resetForm = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCategory('casquinhas');
    setColor(PASTEL_COLORS[0]);
    setDescription('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('O nome do produto é obrigatório.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError('Por favor, insira um preço válido maior que R$ 0,00.');
      return;
    }

    const productData = {
      name: name.trim(),
      price: numericPrice,
      category,
      color,
      description: description.trim() || undefined
    };

    if (editingProduct) {
      onUpdateProduct({
        ...productData,
        id: editingProduct.id
      });
    } else {
      onAddProduct(productData);
    }

    resetForm();
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    // Scroll to form on mobile devices
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este produto do catálogo?')) {
      onDeleteProduct(id);
      if (editingProduct?.id === id) {
        resetForm();
      }
    }
  };

  const getCategoryName = (catId: string) => {
    switch (catId) {
      case 'casquinhas': return 'Casquinhas';
      case 'milkshakes': return 'Milkshakes';
      case 'sundaes': return 'Sundaes';
      case 'bebidas': return 'Bebidas';
      default: return catId;
    }
  };

  return (
    <div className="crud-container">
      {/* Form Container (Right/Left depending on Grid) */}
      <div className="card" style={{ height: 'fit-content' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {editingProduct ? <Edit2 size={20} style={{ color: 'var(--accent)' }} /> : <Plus size={20} style={{ color: 'var(--primary)' }} />}
          {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ backgroundColor: '#ffeef2', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nome do Sorvete / Produto *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Milkshake Ovomaltine 500ml"
            />
          </div>

          <div className="form-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Categoria *</label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ height: '42px' }}
              >
                <option value="casquinhas">Casquinhas</option>
                <option value="milkshakes">Milkshakes</option>
                <option value="sundaes">Sundaes & Taças</option>
                <option value="bebidas">Bebidas</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Preço (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descrição (Opcional)</label>
            <textarea
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Com calda quente artesanal de morango"
              rows={2}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Cor de Exibição (Pastel)</label>
            <div className="color-picker-grid">
              {PASTEL_COLORS.map((c) => (
                <div
                  key={c}
                  className={`color-option ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            {editingProduct && (
              <button type="button" className="btn secondary" onClick={resetForm}>
                <RotateCcw size={16} />
                Cancelar
              </button>
            )}
            <button type="submit" className="btn primary">
              <Save size={16} />
              {editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
            </button>
          </div>
        </form>
      </div>

      {/* Catalog Table */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Catálogo de Produtos ({products.length})</h3>
        
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
            <p>Nenhum produto cadastrado no catálogo.</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Use o formulário para adicionar novos itens ao quiosque.</p>
          </div>
        ) : (
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="table-product-cell">
                        <div 
                          className="table-color-dot" 
                          style={{ backgroundColor: product.color }} 
                        />
                        <div>
                          <strong style={{ display: 'block', fontSize: '14px' }}>{product.name}</strong>
                          {product.description && (
                            <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {product.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-light)' }}>
                      {getCategoryName(product.category)}
                    </td>
                    <td className="table-price">
                      R$ {product.price.toFixed(2)}
                    </td>
                    <td>
                      <div className="table-actions" style={{ justifyContent: 'center' }}>
                        <button 
                          className="icon-btn edit" 
                          onClick={() => handleEditClick(product)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="icon-btn delete" 
                          onClick={() => handleDeleteClick(product.id)}
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
