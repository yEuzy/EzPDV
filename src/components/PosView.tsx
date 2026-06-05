import React, { useState } from 'react';
import type { Product, CartItem, SalePayment } from '../types';
import { INITIAL_CATEGORIES } from '../utils/mockData';
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  QrCode, 
  DollarSign,
  Search,
  Check,
  ArrowLeft
} from 'lucide-react';

interface PosViewProps {
  products: Product[];
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, amount: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  onCheckout: (payments: SalePayment[]) => void;
  isCartMobileVisible: boolean;
  setIsCartMobileVisible: (visible: boolean) => void;
  cashRegister: { isOpen: boolean; openedAt: string | null; startingCash: number };
  onOpenRegister: (startingCash: number) => void;
  currentCash: number;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  cart,
  addToCart,
  removeFromCart,
  updateQuantity,
  updateNotes,
  clearCart,
  onCheckout,
  isCartMobileVisible,
  setIsCartMobileVisible,
  cashRegister,
  onOpenRegister,
  currentCash
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'PIX'>('PIX');
  const [openingCashInput, setOpeningCashInput] = useState<string>('250.00');
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitDinheiro, setSplitDinheiro] = useState<string>('');
  const [splitPix, setSplitPix] = useState<string>('');
  const [splitCredito, setSplitCredito] = useState<string>('');
  const [splitDebito, setSplitDebito] = useState<string>('');

  // Filter products based on category and search query
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutSubmit = () => {
    if (cart.length === 0) return;

    if (isSplitPayment) {
      const money = parseFloat(splitDinheiro) || 0;
      const pix = parseFloat(splitPix) || 0;
      const credit = parseFloat(splitCredito) || 0;
      const debit = parseFloat(splitDebito) || 0;
      const totalPaid = money + pix + credit + debit;

      if (Math.abs(totalPaid - cartTotal) > 0.01) {
        alert(`O total dos pagamentos (R$ ${totalPaid.toFixed(2)}) não bate com o valor total do pedido (R$ ${cartTotal.toFixed(2)})!`);
        return;
      }

      const payments: SalePayment[] = [];
      if (money > 0) payments.push({ method: 'Dinheiro', amount: money });
      if (pix > 0) payments.push({ method: 'PIX', amount: pix });
      if (credit > 0) payments.push({ method: 'Cartão de Crédito', amount: credit });
      if (debit > 0) payments.push({ method: 'Cartão de Débito', amount: debit });

      onCheckout(payments);
    } else {
      onCheckout([{ method: paymentMethod, amount: cartTotal }]);
    }

    setIsCartMobileVisible(false);
    setSplitDinheiro('');
    setSplitPix('');
    setSplitCredito('');
    setSplitDebito('');
    setIsSplitPayment(false);
  };

  // Helper to render Category Icons dynamically or fallback to fallback
  const getCategoryEmoji = (categoryId: string) => {
    switch (categoryId) {
      case 'all': return '🍦';
      case 'casquinhas': return '🍦';
      case 'milkshakes': return '🥤';
      case 'sundaes': return '🍧';
      case 'bebidas': return '🥤';
      default: return '🧁';
    }
  };

  if (!cashRegister.isOpen) {
    const handleOpenSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const val = parseFloat(openingCashInput);
      if (isNaN(val) || val < 0) {
        alert('Por favor, insira um valor inicial válido.');
        return;
      }
      onOpenRegister(val);
    };

    return (
      <div className="open-register-container">
        <div className="open-register-card card">
          <div className="open-register-icon">🏪</div>
          <h2 className="open-register-title">Caixa Fechado</h2>
          <p className="open-register-desc">
            Inicie o expediente abrindo o caixa e informando o saldo inicial em dinheiro para troco.
          </p>
          <form onSubmit={handleOpenSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ display: 'block', textAlign: 'center', fontSize: '14px' }}>
                Saldo Inicial em Dinheiro (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                style={{ fontSize: '22px', fontWeight: 'bold', textAlign: 'center', padding: '12px', width: '100%', boxSizing: 'border-box' }}
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="quick-cash-grid">
              {[0, 100, 150, 200, 250].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="btn secondary quick-cash-btn"
                  onClick={() => setOpeningCashInput(val.toFixed(2))}
                >
                  R$ {val}
                </button>
              ))}
            </div>

            <button type="submit" className="btn primary" style={{ width: '100%', padding: '14px', fontSize: '16px', borderRadius: 'var(--radius-lg)' }}>
              Abrir Caixa
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isSplitValid = (() => {
    if (!isSplitPayment) return true;
    const money = parseFloat(splitDinheiro) || 0;
    const pix = parseFloat(splitPix) || 0;
    const credit = parseFloat(splitCredito) || 0;
    const debit = parseFloat(splitDebito) || 0;
    const totalPaid = money + pix + credit + debit;
    return Math.abs(totalPaid - cartTotal) < 0.01;
  })();

  const formattedOpenTime = cashRegister.openedAt 
    ? new Date(cashRegister.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="pos-layout">
      {/* Products Side */}
      <div className="pos-products-side">
        {/* Cash Register Banner */}
        <div className="register-status-banner">
          <div className="register-status-badge">
            <span className="pulse-indicator" />
            <span>Caixa Aberto desde <strong>{formattedOpenTime}</strong></span>
          </div>
          <div className="register-cash-indicator">
            Dinheiro em Caixa: <span className="register-cash-val">R$ {currentCash.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '4px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}>
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Buscar sorvete, milkshake..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '38px', borderRadius: '50px' }}
            />
          </div>
        </div>

        {/* Categories Slider */}
        <div className="categories-slider">
          {INITIAL_CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span>{getCategoryEmoji(category.id)}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍦</div>
            <h3>Nenhum sorvete encontrado</h3>
            <p>Tente mudar a categoria ou limpar a sua busca.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => {
              const bgStyle = { 
                '--product-color': product.color || 'var(--primary)',
                '--product-color-light': `${product.color}20` || 'var(--primary-light)'
              } as React.CSSProperties;

              return (
                <div 
                  key={product.id} 
                  className="product-card" 
                  style={bgStyle}
                  onClick={() => addToCart(product)}
                >
                  <div className="product-avatar">
                    {getCategoryEmoji(product.category)}
                  </div>
                  <div className="product-info">
                    <span className="product-name">{product.name}</span>
                    {product.description && <span className="product-desc">{product.description}</span>}
                  </div>
                  <div className="product-price-row">
                    <span className="product-price">R$ {product.price.toFixed(2)}</span>
                    <button className="add-product-btn" onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Side */}
      <div className={`pos-cart-side ${isCartMobileVisible ? 'mobile-visible' : 'mobile-hidden'}`}>
        <div className="cart-header">
          {/* Botão voltar para mobile */}
          <button 
            className="cart-back-btn" 
            onClick={() => setIsCartMobileVisible(false)}
          >
            <ArrowLeft size={18} />
            Voltar
          </button>

          <div className="cart-title">
            <ShoppingCart size={20} />
            <span>Carrinho</span>
            {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
          </div>
          {cart.length > 0 && (
            <button className="clear-cart-btn" onClick={clearCart}>
              <Trash2 size={14} />
              Limpar
            </button>
          )}
        </div>

        <div className="cart-items-list">
          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <span className="cart-empty-icon">🍦</span>
              <h3>Carrinho Vazio</h3>
              <p>Toque em algum sorvete ao lado para adicionar ao pedido!</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="cart-item">
                <div className="cart-item-main">
                  <div>
                    <span className="cart-item-name">{item.product.name}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                      R$ {item.product.price.toFixed(2)} un.
                    </div>
                  </div>
                  <span className="cart-item-price">
                    R$ {(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                
                {/* Notes Input */}
                <input
                  type="text"
                  placeholder="Obs: calda extra, sem cobertura, sabor..."
                  value={item.notes || ''}
                  onChange={(e) => updateNotes(item.product.id, e.target.value)}
                  className="item-notes-input"
                />

                <div className="cart-item-controls">
                  <div className="quantity-selector">
                    <button className="qty-btn" onClick={() => updateQuantity(item.product.id, -1)}>
                      <Minus size={12} />
                    </button>
                    <span className="qty-val">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.product.id, 1)}>
                      <Plus size={12} />
                    </button>
                  </div>

                  <button className="remove-item-btn" onClick={() => removeFromCart(item.product.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-checkout-section">
          <div className="summary-row">
            <span>Itens</span>
            <span>{cartItemCount}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span className="total-val">R$ {cartTotal.toFixed(2)}</span>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="payment-label" style={{ margin: 0 }}>Forma de Pagamento</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isSplitPayment}
                  onChange={(e) => {
                    setIsSplitPayment(e.target.checked);
                    setSplitDinheiro('');
                    setSplitPix('');
                    setSplitCredito('');
                    setSplitDebito('');
                  }}
                />
                Dividir Valor
              </label>
            </div>

            {!isSplitPayment ? (
              <div className="payment-grid">
                <button 
                  type="button"
                  className={`payment-btn ${paymentMethod === 'PIX' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('PIX')}
                >
                  <QrCode size={14} />
                  PIX
                </button>
                <button 
                  type="button"
                  className={`payment-btn ${paymentMethod === 'Dinheiro' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Dinheiro')}
                >
                  <DollarSign size={14} />
                  Dinheiro
                </button>
                <button 
                  type="button"
                  className={`payment-btn ${paymentMethod === 'Cartão de Crédito' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Cartão de Crédito')}
                >
                  <CreditCard size={14} />
                  Crédito
                </button>
                <button 
                  type="button"
                  className={`payment-btn ${paymentMethod === 'Cartão de Débito' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Cartão de Débito')}
                >
                  <CreditCard size={14} />
                  Débito
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Dinheiro */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', minWidth: '54px', fontWeight: 700, color: 'var(--text-dark)' }}>Dinheiro:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    style={{ flexGrow: 1, padding: '6px 8px', fontSize: '13px' }}
                    value={splitDinheiro}
                    onChange={(e) => setSplitDinheiro(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn secondary" 
                    style={{ padding: '6px 8px', fontSize: '9px', flex: 'none', borderRadius: '4px', height: '31px' }}
                    onClick={() => {
                      const currentFilled = (parseFloat(splitPix) || 0) + (parseFloat(splitCredito) || 0) + (parseFloat(splitDebito) || 0);
                      const remaining = Math.max(0, cartTotal - currentFilled);
                      setSplitDinheiro(remaining.toFixed(2));
                    }}
                  >
                    Troco
                  </button>
                </div>

                {/* PIX */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', minWidth: '54px', fontWeight: 700, color: 'var(--text-dark)' }}>PIX:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    style={{ flexGrow: 1, padding: '6px 8px', fontSize: '13px' }}
                    value={splitPix}
                    onChange={(e) => setSplitPix(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn secondary" 
                    style={{ padding: '6px 8px', fontSize: '9px', flex: 'none', borderRadius: '4px', height: '31px' }}
                    onClick={() => {
                      const currentFilled = (parseFloat(splitDinheiro) || 0) + (parseFloat(splitCredito) || 0) + (parseFloat(splitDebito) || 0);
                      const remaining = Math.max(0, cartTotal - currentFilled);
                      setSplitPix(remaining.toFixed(2));
                    }}
                  >
                    Troco
                  </button>
                </div>

                {/* Crédito */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', minWidth: '54px', fontWeight: 700, color: 'var(--text-dark)' }}>Crédito:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    style={{ flexGrow: 1, padding: '6px 8px', fontSize: '13px' }}
                    value={splitCredito}
                    onChange={(e) => setSplitCredito(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn secondary" 
                    style={{ padding: '6px 8px', fontSize: '9px', flex: 'none', borderRadius: '4px', height: '31px' }}
                    onClick={() => {
                      const currentFilled = (parseFloat(splitDinheiro) || 0) + (parseFloat(splitPix) || 0) + (parseFloat(splitDebito) || 0);
                      const remaining = Math.max(0, cartTotal - currentFilled);
                      setSplitCredito(remaining.toFixed(2));
                    }}
                  >
                    Troco
                  </button>
                </div>

                {/* Débito */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', minWidth: '54px', fontWeight: 700, color: 'var(--text-dark)' }}>Débito:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    style={{ flexGrow: 1, padding: '6px 8px', fontSize: '13px' }}
                    value={splitDebito}
                    onChange={(e) => setSplitDebito(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn secondary" 
                    style={{ padding: '6px 8px', fontSize: '9px', flex: 'none', borderRadius: '4px', height: '31px' }}
                    onClick={() => {
                      const currentFilled = (parseFloat(splitDinheiro) || 0) + (parseFloat(splitPix) || 0) + (parseFloat(splitCredito) || 0);
                      const remaining = Math.max(0, cartTotal - currentFilled);
                      setSplitDebito(remaining.toFixed(2));
                    }}
                  >
                    Troco
                  </button>
                </div>

                {/* Balanço visual */}
                {(() => {
                  const money = parseFloat(splitDinheiro) || 0;
                  const pix = parseFloat(splitPix) || 0;
                  const credit = parseFloat(splitCredito) || 0;
                  const debit = parseFloat(splitDebito) || 0;
                  const totalPaid = money + pix + credit + debit;
                  const diff = totalPaid - cartTotal;

                  if (Math.abs(diff) < 0.01) {
                    return (
                      <div style={{ fontSize: '11px', color: 'var(--mint)', fontWeight: 700, textAlign: 'center', marginTop: '2px' }}>
                        ✓ Valores batem certinho!
                      </div>
                    );
                  } else if (diff > 0) {
                    return (
                      <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 700, textAlign: 'center', marginTop: '2px' }}>
                        ⚠ Excesso: + R$ {diff.toFixed(2)}
                      </div>
                    );
                  } else {
                    return (
                      <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 700, textAlign: 'center', marginTop: '2px' }}>
                        ⚠ Resta: R$ {Math.abs(diff).toFixed(2)}
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>

          <button 
            type="button"
            className="checkout-btn"
            disabled={cart.length === 0 || !isSplitValid}
            onClick={handleCheckoutSubmit}
          >
            <Check size={18} />
            Finalizar Pedido
          </button>
        </div>
      </div>

      {/* Floating cart toggle for mobile */}
      <button 
        className="mobile-cart-toggle"
        onClick={() => setIsCartMobileVisible(!isCartMobileVisible)}
      >
        <ShoppingCart size={20} />
        <span>
          {cartItemCount > 0 ? `Ver Carrinho (${cartItemCount} itens) • R$ ${cartTotal.toFixed(2)}` : 'Carrinho Vazio'}
        </span>
      </button>
    </div>
  );
};
