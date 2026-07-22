import React, { useState, useEffect } from 'react';
import type { Product, Category } from '../types';
import { Plus, Edit2, Trash2, RotateCcw, Save, Search, X } from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'company_id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id' | 'company_id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  currentCompany?: any; // any to avoid circular import if needed, or we can just import Company
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
  onDeleteCategory,
  currentCompany
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  // --- Product State ---
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'all');
  const [color, setColor] = useState(PASTEL_COLORS[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Category State ---
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Package');
  const [catError, setCatError] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');

  // Update form fields when editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setPrice(editingProduct.price.toString());
      setCostPrice(editingProduct.cost_price?.toString() || '');
      setCategory(editingProduct.category);
      setColor(editingProduct.color);
      setDescription(editingProduct.description || '');
      setIsProductModalOpen(true);
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
    setCostPrice('');
    setCategory(categories[0]?.id || 'all');
    setColor(PASTEL_COLORS[0]);
    setDescription('');
    setError('');
    setIsProductModalOpen(false);
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon('Package');
    setCatError('');
    setIsCategoryModalOpen(false);
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
      cost_price: currentCompany?.enable_cost_price && costPrice ? parseFloat(costPrice) : 0,
      category,
      color,
      description: description.trim() || undefined
    };

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
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
        ...editingCategory,
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
    setIsProductModalOpen(true);
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
    setIsCategoryModalOpen(true);
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Modal Container */}
          {isProductModalOpen && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}>
              <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                <button 
                  onClick={resetProductForm}
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
                >
                  <X size={24} />
                </button>
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
            <label className="form-label">Nome do Produto *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Produto X"
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

            {currentCompany?.enable_cost_price && (
              <div className="form-group">
                <label className="form-label">Preço de Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}
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

          {(currentCompany?.enable_product_colors ?? true) && (
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
          )}

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
            </div>
          )}

      {/* Catalog Table */}
      <div className="card" style={{ marginTop: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Catálogo ({products.length})</h3>
            <button 
              className="btn primary new-product-btn" 
              onClick={() => setIsProductModalOpen(true)}
              title="Novo Produto"
            >
              <Plus size={22} />
            </button>
          </div>
          
          <div className="search-box" style={{ width: '100%' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
            <p>Nenhum produto cadastrado no catálogo.</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Use o formulário para adicionar novos itens à loja.</p>
          </div>
        ) : (
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  {currentCompany?.enable_cost_price && <th>Custo</th>}
                  {currentCompany?.enable_inventory && <th>Estoque</th>}
                  <th>Preço</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="table-product-cell">
                        {(currentCompany?.enable_product_colors ?? true) && (
                          <div 
                            className="table-color-dot" 
                            style={{ backgroundColor: product.color }} 
                          />
                        )}
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
                    {currentCompany?.enable_cost_price && (
                      <td className="table-price" style={{ color: 'var(--text-light)' }}>
                        R$ {(product.cost_price || 0).toFixed(2)}
                      </td>
                    )}
                    {currentCompany?.enable_inventory && (
                      <td style={{ fontWeight: 600, color: (product.stock_quantity || 0) > 0 ? 'var(--mint)' : (product.stock_quantity || 0) === 0 ? 'var(--text-light)' : 'var(--danger)' }}>
                        Estoque: {product.stock_quantity || 0}
                      </td>
                    )}
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
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Category Modal Container */}
        {isCategoryModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button 
                onClick={resetCategoryForm}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              >
                <X size={24} />
              </button>
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
                <option value="Package">Pacote / Genérico</option>
                <option value="Beer">Cerveja / Lata</option>
                <option value="Wine">Vinho / Garrafa</option>
                <option value="CupSoda">Bebida / Copo</option>
                <option value="Coffee">Café / Quente</option>
                <option value="ShoppingBag">Sacola / Loja</option>
                <option value="Tag">Etiqueta / Variedade</option>
                <option value="Store">Loja Física</option>
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
          </div>
        )}

        {/* Categories Catalog Table */}
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Catálogo de Categorias ({categories.length})</h3>
              <button 
                className="btn primary new-product-btn" 
                onClick={() => setIsCategoryModalOpen(true)}
                title="Nova Categoria"
              >
                <Plus size={22} />
              </button>
            </div>

            <div className="search-box" style={{ width: '100%' }}>
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar categoria..."
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          
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
                  {categories
                    .filter(cat => cat.name.toLowerCase().includes(catSearchQuery.toLowerCase()))
                    .map((cat) => (
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
