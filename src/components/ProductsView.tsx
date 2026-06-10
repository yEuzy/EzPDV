import React, { useState, useEffect } from 'react';
import type { Product, Category } from '../types';
import { Plus, Edit2, Trash2, RotateCcw, Save } from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
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
  onDeleteProduct,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  // --- Product State ---
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'all');
  const [color, setColor] = useState(PASTEL_COLORS[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // --- Category State ---
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('IceCreamCone');
  const [catError, setCatError] = useState('');

  // Update form fields when editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setPrice(editingProduct.price.toString());
      setCategory(editingProduct.category);
      setColor(editingProduct.color);
      setDescription(editingProduct.description || '');
    } else {
      resetProductForm();
    }
  }, [editingProduct]);

  // Update form fields when editingCategory changes
  useEffect(() => {
    if (editingCategory) {
      setCatName(editingCategory.name);
      setCatIcon(editingCategory.icon);
    } else {
      resetCategoryForm();
    }
  }, [editingCategory]);

  const resetProductForm = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCategory(categories[0]?.id || 'all');
    setColor(PASTEL_COLORS[0]);
    setDescription('');
    setError('');
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon('IceCreamCone');
    setCatError('');
  };

  const handleProductSubmit = (e: React.FormEvent) => {
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

    resetProductForm();
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');

    if (!catName.trim()) {
      setCatError('O nome da categoria é obrigatório.');
      return;
    }

    const catData = {
      name: catName.trim(),
      icon: catIcon,
      sort_order: editingCategory ? editingCategory.sort_order : categories.length
    };

    if (editingCategory) {
      onUpdateCategory({
        ...catData,
        id: editingCategory.id
      });
    } else {
      onAddCategory(catData);
    }

    resetCategoryForm();
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProductClick = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este produto do catálogo?')) {
      onDeleteProduct(id);
      if (editingProduct?.id === id) {
        resetProductForm();
      }
    }
  };

  const handleEditCategoryClick = (category: Category) => {
    setEditingCategory(category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCategoryClick = (id: string) => {
    if (products.some(p => p.category === id)) {
      alert('Não é possível excluir uma categoria que possui produtos vinculados. Exclua ou altere os produtos primeiro.');
      return;
    }
    if (window.confirm('Tem certeza que deseja remover esta categoria?')) {
      onDeleteCategory(id);
      if (editingCategory?.id === id) {
        resetCategoryForm();
      }
    }
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : catId;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          className={`btn ${activeTab === 'products' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('products')}
        >
          Gerenciar Produtos
        </button>
        <button
          className={`btn ${activeTab === 'categories' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('categories')}
        >
          Gerenciar Categorias
        </button>
      </div>

      {activeTab === 'products' && (
        <div className="crud-container">
          {/* Form Container (Right/Left depending on Grid) */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingProduct ? <Edit2 size={20} style={{ color: 'var(--accent)' }} /> : <Plus size={20} style={{ color: 'var(--primary)' }} />}
              {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h3>

        <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
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
              <button type="button" className="btn secondary" onClick={resetProductForm}>
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
                          onClick={() => handleEditProductClick(product)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="icon-btn delete" 
                          onClick={() => handleDeleteProductClick(product.id)}
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
    )}

    {activeTab === 'categories' && (
      <div className="crud-container">
        {/* Category Form Container */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingCategory ? <Edit2 size={20} style={{ color: 'var(--accent)' }} /> : <Plus size={20} style={{ color: 'var(--primary)' }} />}
            {editingCategory ? 'Editar Categoria' : 'Cadastrar Nova Categoria'}
          </h3>

          <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {catError && (
              <div style={{ backgroundColor: '#ffeef2', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 600 }}>
                {catError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nome da Categoria *</label>
              <input
                type="text"
                className="form-input"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ex: Açaí, Picolés..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ícone da Categoria *</label>
              <select
                className="form-input"
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                style={{ height: '42px' }}
              >
                <option value="IceCreamCone">Casquinha / Sorvete de Massa</option>
                <option value="CupSoda">Copo (Bebidas, Milkshakes, Açaí)</option>
                <option value="IceCreamBowl">Taça / Sundae</option>
                <option value="Cake">Bolos / Sobremesas Diversas</option>
                <option value="Store">Lojinha / Gerais</option>
              </select>
            </div>

            <div className="form-actions">
              {editingCategory && (
                <button type="button" className="btn secondary" onClick={resetCategoryForm}>
                  <RotateCcw size={16} />
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn primary">
                <Save size={16} />
                {editingCategory ? 'Salvar Categoria' : 'Adicionar Categoria'}
              </button>
            </div>
          </form>
        </div>

        {/* Categories Catalog Table */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Catálogo de Categorias ({categories.length})</h3>
          
          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
              <p>Nenhuma categoria cadastrada.</p>
            </div>
          ) : (
            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Qtd. Produtos</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        <strong style={{ display: 'block', fontSize: '14px' }}>{cat.name}</strong>
                      </td>
                      <td style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-light)' }}>
                        {products.filter(p => p.category === cat.id).length} itens
                      </td>
                      <td>
                        <div className="table-actions" style={{ justifyContent: 'center' }}>
                          <button 
                            className="icon-btn edit" 
                            onClick={() => handleEditCategoryClick(cat)}
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="icon-btn delete" 
                            onClick={() => handleDeleteCategoryClick(cat.id)}
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
    )}
  </div>
  );
};
