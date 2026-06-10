import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Product,
  CartItem,
  Sale,
  SalePayment,
  Operator,
  CashMovement,
  CashRegister,
  CashRegisterSession,
  Category,
} from './types';
import { PosView } from './components/PosView';
import { ProductsView } from './components/ProductsView';
import { ReportsView } from './components/ReportsView';
import { LoginScreen } from './components/LoginScreen';
import { useConnectionStatus } from './utils/connectionMonitor';
import { syncQueue, getPendingCount } from './utils/offlineQueue';
import { LS } from './utils/db';
import * as DB from './utils/db';
import {
  ShoppingBag,
  Tag,
  BarChart3,
  CheckCircle2,
  X,
  RefreshCw,
  WifiOff,
  Wifi,
  IceCreamCone
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'reports'>('pos');

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  // App states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<Operator | null>(null);
  const [isCartMobileVisible, setIsCartMobileVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);

  // Cash Register states
  const [cashRegister, setCashRegister] = useState<CashRegister>({
    id: null,
    isOpen: false,
    openedAt: null,
    openedBy: null,
    startingCash: 0,
    movements: [],
  });
  const [pastSessions, setPastSessions] = useState<CashRegisterSession[]>([]);

  const [pendingOps, setPendingOps] = useState(0);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Connection status (ping periódico ao Supabase)
  const { isOnline, isChecking } = useConnectionStatus();
  const prevOnlineRef = useRef<boolean | null>(null);

  // ─── Carregamento inicial de operadores ───────────────────────────────────

  const initialOpsDone = useRef(false);
  useEffect(() => {
    // Aguarda o ping de conexão terminar antes de tentar carregar
    if (isChecking) return;

    const loadOperators = async () => {
      setIsLoadingOperators(true);
      try {
        const ops = await DB.fetchOperators(isOnline);
        if (ops.length > 0) {
          setOperators(ops);
        } else if (!isOnline) {
          // Sem conexão e sem cache: mostra loading até reconectar
          const cached = lsGet<Operator[]>(LS.OPERATORS);
          if (cached && cached.length > 0) setOperators(cached);
        }
      } catch (err) {
        console.warn('[App] Erro ao carregar operadores:', err);
        const cached = lsGet<Operator[]>(LS.OPERATORS);
        if (cached && cached.length > 0) setOperators(cached);
      } finally {
        setIsLoadingOperators(false);
        initialOpsDone.current = true;
      }
    };
    loadOperators();
  }, [isChecking, isOnline]);

  // ─── Carregamento inicial de dados (produtos, vendas, caixa) ─────────────

  const loadAllData = useCallback(
    async (online: boolean) => {
      try {
        const [prods, salesData, cashData, catsData] = await Promise.all([
          DB.fetchProducts(online),
          DB.fetchSales(online),
          DB.fetchCashData(online),
          DB.fetchCategories(online),
        ]);
        setProducts(prods);
        setSales(salesData);
        setCashRegister(cashData.register);
        setPastSessions(cashData.pastSessions);
        setCategories(catsData.length > 0 ? catsData : [
          { id: 'all', name: 'Todos', icon: 'IceCreamCone', sort_order: 0 },
          { id: 'casquinhas', name: 'Casquinhas', icon: 'IceCreamCone', sort_order: 1 },
          { id: 'milkshakes', name: 'Milkshakes', icon: 'CupSoda', sort_order: 2 },
          { id: 'sundaes', name: 'Sundaes & Taças', icon: 'IceCreamBowl', sort_order: 3 },
          { id: 'bebidas', name: 'Bebidas', icon: 'CupSoda', sort_order: 4 }
        ]);
      } catch (err) {
        console.warn('[App] Erro ao carregar dados:', err);
        // Fallback para cache local se não conseguiu do Supabase
        const cachedProducts = lsGet<Product[]>(LS.PRODUCTS) ?? [];
        const cachedSales = lsGet<Sale[]>(LS.SALES) ?? [];
        const cachedRegister = lsGet<CashRegister>(LS.CASH_REGISTER) ?? {
          id: null,
          isOpen: false,
          openedAt: null,
          openedBy: null,
          startingCash: 0,
          movements: [],
        };
        const cachedSessions = lsGet<CashRegisterSession[]>(LS.PAST_SESSIONS) ?? [];
        const cachedCategories = lsGet<Category[]>(LS.CATEGORIES) ?? [];
        setProducts(cachedProducts);
        setSales(cachedSales);
        setCashRegister(cachedRegister);
        setPastSessions(cachedSessions);
        setCategories(cachedCategories.length > 0 ? cachedCategories : [
          { id: 'all', name: 'Todos', icon: 'IceCreamCone', sort_order: 0 },
          { id: 'casquinhas', name: 'Casquinhas', icon: 'IceCreamCone', sort_order: 1 },
          { id: 'milkshakes', name: 'Milkshakes', icon: 'CupSoda', sort_order: 2 },
          { id: 'sundaes', name: 'Sundaes & Taças', icon: 'IceCreamBowl', sort_order: 3 },
          { id: 'bebidas', name: 'Bebidas', icon: 'CupSoda', sort_order: 4 }
        ]);
      }
    },
    []
  );

  // Primeira carga: aguarda o status de conexão estar definido
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!isChecking && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadAllData(isOnline);
    }
  }, [isChecking, isOnline, loadAllData]);

  // ─── Sincronização automática ao reconectar ───────────────────────────────

  useEffect(() => {
    if (prevOnlineRef.current === false && isOnline) {
      // Acabou de reconectar
      const sync = async () => {
        const count = getPendingCount();
        if (count > 0) {
          setSyncMessage(`Sincronizando ${count} operação(ões) pendente(s)…`);
          const synced = await syncQueue();
          if (synced > 0) {
            setSyncMessage(`✅ ${synced} operação(ões) sincronizada(s) com sucesso!`);
            // Recarregar dados frescos do Supabase
            await loadAllData(true);
          }
          setTimeout(() => setSyncMessage(null), 4000);
        }
        setPendingOps(getPendingCount());
      };
      sync();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, loadAllData]);

  // Atualizar contagem de pendentes
  useEffect(() => {
    setPendingOps(getPendingCount());
  }, [isOnline]);

  // Restaurar usuário logado do LocalStorage
  useEffect(() => {
    const stored = lsGet<Operator>(LS.CURRENT_USER);
    if (stored) setCurrentUser(stored);
  }, []);

  // ─── Login / Logout ───────────────────────────────────────────────────────

  const handleLogin = (operatorId: string, pin: string): boolean => {
    const operator = operators.find(op => op.id === operatorId);
    if (operator && operator.pin === pin) {
      setCurrentUser(operator);
      lsSet(LS.CURRENT_USER, operator);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(LS.CURRENT_USER);
  };

  // ─── Operadores CRUD ──────────────────────────────────────────────────────

  const handleAddOperator = async (operatorData: Omit<Operator, 'id' | 'created_at'>): Promise<void> => {
    const newOp: Operator = { ...operatorData, id: `op-${generateId()}` };
    try {
      await DB.addOperator(isOnline, newOp);
      setOperators(prev => [...prev, newOp]);
    } catch (err: any) {
      alert('Erro ao adicionar operador: ' + err.message);
    }
  };

  const handleUpdateOperator = async (operator: Operator): Promise<void> => {
    try {
      await DB.updateOperator(isOnline, operator);
      setOperators(prev => prev.map(o => (o.id === operator.id ? operator : o)));
      // Atualiza currentUser se for o mesmo
      if (currentUser?.id === operator.id) {
        setCurrentUser(operator);
        lsSet(LS.CURRENT_USER, operator);
      }
    } catch (err: any) {
      alert('Erro ao atualizar operador: ' + err.message);
    }
  };

  const handleDeleteOperator = async (id: string): Promise<void> => {
    if (currentUser?.id === id) {
      alert('Não é possível excluir o operador atualmente logado.');
      return;
    }
    try {
      await DB.deleteOperator(isOnline, id);
      setOperators(prev => prev.filter(o => o.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir operador: ' + err.message);
    }
  };

  // ─── Caixa ────────────────────────────────────────────────────────────────

  const handleOpenRegister = async (startingCash: number) => {
    const sessionId = generateId();
    const openedAt = new Date().toISOString();
    const openedBy = currentUser?.name ?? 'Caixa';

    const newRegister: CashRegister = {
      id: sessionId,
      isOpen: true,
      openedAt,
      openedBy,
      startingCash,
      movements: [],
    };

    try {
      await DB.openCashSession(isOnline, sessionId, openedAt, openedBy, startingCash);
      setCashRegister(newRegister);
      lsSet(LS.CASH_REGISTER, newRegister);
    } catch (err: any) {
      alert('Erro ao abrir caixa: ' + err.message);
    }
  };

  const handleRegisterMovement = async (
    type: 'sangria' | 'reforco',
    amount: number,
    reason?: string
  ) => {
    if (!cashRegister.isOpen || !cashRegister.id) return;

    const newMovement: CashMovement = {
      id: generateId(),
      type,
      amount,
      timestamp: new Date().toISOString(),
      operator: currentUser?.name ?? 'Caixa',
      reason: reason?.trim() || undefined,
    };

    try {
      await DB.insertCashMovement(isOnline, newMovement, cashRegister.id);
      const updatedMovements = [...cashRegister.movements, newMovement];
      const updated: CashRegister = { ...cashRegister, movements: updatedMovements };
      setCashRegister(updated);
      lsSet(LS.CASH_REGISTER, updated);
    } catch (err: any) {
      alert('Erro ao registrar movimentação: ' + err.message);
    }
  };

  const handleCloseRegister = async (notes?: string) => {
    if (!cashRegister.isOpen || !cashRegister.openedAt || !cashRegister.id) return;

    const sessionSales = sales.filter(
      s => new Date(s.date) >= new Date(cashRegister.openedAt!)
    );

    const sum = (method: SalePayment['method']) =>
      sessionSales.reduce((acc, s) => {
        const p = s.payments?.find(p => p.method === method);
        return acc + (p ? p.amount : 0);
      }, 0);

    const cashSales = sum('Dinheiro');
    const pixSales = sum('PIX');
    const creditSales = sum('Cartão de Crédito');
    const debitSales = sum('Cartão de Débito');

    const totalReforcos = cashRegister.movements
      .filter(m => m.type === 'reforco')
      .reduce((a, m) => a + m.amount, 0);
    const totalSangrias = cashRegister.movements
      .filter(m => m.type === 'sangria')
      .reduce((a, m) => a + m.amount, 0);

    const totalSales = sessionSales.reduce((a, s) => a + s.total, 0);
    const finalCash = cashRegister.startingCash + cashSales + totalReforcos - totalSangrias;

    const closedAt = new Date().toISOString();
    const closedBy = currentUser?.name ?? 'Caixa';
    const sessionId = cashRegister.id;

    const summary = {
      cashSales,
      pixSales,
      creditSales,
      debitSales,
      totalReforcos,
      totalSangrias,
      totalSales,
      finalCash,
      notes: notes?.trim() || undefined,
    };

    try {
      await DB.closeCashSession(isOnline, sessionId, closedAt, closedBy, summary);

      const newSession: CashRegisterSession = {
        id: sessionId,
        openedAt: cashRegister.openedAt,
        closedAt,
        openedBy: cashRegister.openedBy ?? 'Caixa',
        closedBy,
        startingCash: cashRegister.startingCash,
        ...summary,
        movements: cashRegister.movements,
      };

      const updatedSessions = [newSession, ...pastSessions];
      setPastSessions(updatedSessions);
      lsSet(LS.PAST_SESSIONS, updatedSessions);

      const resetRegister: CashRegister = {
        id: null,
        isOpen: false,
        openedAt: null,
        openedBy: null,
        startingCash: 0,
        movements: [],
      };
      setCashRegister(resetRegister);
      lsSet(LS.CASH_REGISTER, resetRegister);
      clearCart();
    } catch (err: any) {
      alert('Erro ao fechar caixa: ' + err.message);
    }
  };

  // ─── Carrinho ─────────────────────────────────────────────────────────────

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const removeFromCart = (productId: string) =>
    setCart(prev => prev.filter(i => i.product.id !== productId));

  const updateQuantity = (productId: string, amount: number) =>
    setCart(prev =>
      prev
        .map(i => {
          if (i.product.id !== productId) return i;
          const newQty = i.quantity + amount;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        })
        .filter(Boolean) as CartItem[]
    );

  const updateNotes = (productId: string, notes: string) =>
    setCart(prev =>
      prev.map(i => (i.product.id === productId ? { ...i, notes } : i))
    );

  const clearCart = () => setCart([]);

  // ─── Checkout ─────────────────────────────────────────────────────────────

  const handleCheckout = async (payments: SalePayment[]) => {
    if (!cashRegister.isOpen) {
      alert('O caixa está fechado! Por favor, abra o caixa antes de fazer vendas.');
      return;
    }

    const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const saleId = generateId();
    const dateStr = new Date().toISOString();

    const newSale: Sale = {
      id: saleId,
      date: dateStr,
      items: [...cart],
      total,
      payments,
      soldBy: currentUser?.name ?? 'Caixa',
    };

    try {
      await DB.insertSale(isOnline, newSale, cashRegister.id ?? null);
      setSales(prev => [newSale, ...prev]);
      setPendingOps(getPendingCount());
      setLastSaleTotal(total);
      clearCart();
      setShowSuccessModal(true);
    } catch (err: any) {
      alert('Erro ao registrar venda: ' + err.message);
    }
  };

  // ─── Produtos CRUD ────────────────────────────────────────────────────────

  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...productData, id: generateId() };
    try {
      await DB.addProduct(isOnline, newProduct);
      setProducts(prev => [...prev, newProduct]);
    } catch (err: any) {
      alert('Erro ao adicionar produto: ' + err.message);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      await DB.updateProduct(isOnline, updatedProduct);
      setProducts(prev =>
        prev.map(p => (p.id === updatedProduct.id ? updatedProduct : p))
      );
    } catch (err: any) {
      alert('Erro ao atualizar produto: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await DB.deleteProduct(isOnline, id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir produto: ' + err.message);
    }
  };

  // ─── Categorias CRUD ──────────────────────────────────────────────────────

  const handleAddCategory = async (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = { ...categoryData, id: `cat-${generateId()}` };
    try {
      await DB.addCategory(isOnline, newCategory);
      setCategories(prev => [...prev, newCategory]);
    } catch (err: any) {
      alert('Erro ao adicionar categoria: ' + err.message);
    }
  };

  const handleUpdateCategory = async (updatedCategory: Category) => {
    try {
      await DB.updateCategory(isOnline, updatedCategory);
      setCategories(prev =>
        prev.map(c => (c.id === updatedCategory.id ? updatedCategory : c))
      );
    } catch (err: any) {
      alert('Erro ao atualizar categoria: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await DB.deleteCategory(isOnline, id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir categoria: ' + err.message);
    }
  };

  // ─── Ações administrativas ────────────────────────────────────────────────

  const handleClearSales = async () => {
    try {
      await DB.deleteSales(isOnline);
      setSales([]);
    } catch (err: any) {
      alert('Erro ao limpar vendas: ' + err.message);
    }
  };

  const handleResetAllData = async () => {
    try {
      if (isOnline) {
        await DB.deleteSales(isOnline);
        await DB.deleteAllCashSessions(isOnline);
      }
      setSales([]);
      setCart([]);
      setCashRegister({
        id: null,
        isOpen: false,
        openedAt: null,
        openedBy: null,
        startingCash: 0,
        movements: [],
      });
      setPastSessions([]);
      lsSet(LS.SALES, []);
      lsSet(LS.PAST_SESSIONS, []);
      lsSet(LS.CASH_REGISTER, {
        id: null,
        isOpen: false,
        openedAt: null,
        openedBy: null,
        startingCash: 0,
        movements: [],
      });
    } catch (err: any) {
      alert('Erro ao redefinir dados: ' + err.message);
    }
  };

  // ─── Derivados do caixa ───────────────────────────────────────────────────

  const currentCashSales = sales
    .filter(
      s => cashRegister.openedAt && new Date(s.date) >= new Date(cashRegister.openedAt)
    )
    .reduce((sum, s) => {
      const p = s.payments?.find(p => p.method === 'Dinheiro');
      return sum + (p ? p.amount : 0);
    }, 0);

  const totalReforcos = cashRegister.movements
    .filter(m => m.type === 'reforco')
    .reduce((sum, m) => sum + m.amount, 0);
  const totalSangrias = cashRegister.movements
    .filter(m => m.type === 'sangria')
    .reduce((sum, m) => sum + m.amount, 0);

  const currentCash =
    cashRegister.startingCash + currentCashSales + totalReforcos - totalSangrias;

  // ─── Tela de login ────────────────────────────────────────────────────────

  if (!currentUser) {
    return (
      <LoginScreen
        operators={operators}
        onLogin={handleLogin}
        isLoading={isLoadingOperators || isChecking}
      />
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      {/* Sidebar - Desktop Navigation */}
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-icon" style={{ display: 'flex', alignItems: 'center' }}><IceCreamCone size={24} /></div>
            <div>
              <span className="brand-name">EzPDV</span>
              <span className="brand-tagline">Quiosque de Sorvete</span>
            </div>
          </div>

          {/* Status de Conexão */}
          <div
            style={{
              margin: '0 12px 24px 12px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isOnline ? 'var(--mint-light)' : 'rgba(239, 71, 111, 0.08)',
              color: isOnline ? 'var(--mint)' : 'var(--danger)',
              border: `1px solid ${isOnline ? 'rgba(6, 214, 160, 0.2)' : 'rgba(239, 71, 111, 0.2)'}`,
            }}
          >
            {isChecking ? (
              <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
            ) : isOnline ? (
              <Wifi size={10} />
            ) : (
              <WifiOff size={10} />
            )}
            {isChecking
              ? 'Verificando conexão…'
              : isOnline
              ? 'Nuvem Conectada'
              : `Modo Offline${pendingOps > 0 ? ` (${pendingOps} pendente${pendingOps > 1 ? 's' : ''})` : ''}`}
          </div>

          <nav className="nav-menu">
            <button
              className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`}
              onClick={() => setActiveTab('pos')}
            >
              <ShoppingBag size={20} />
              Vender (Caixa)
            </button>

            <button
              className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <Tag size={20} />
              Produtos
            </button>

            <button
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <BarChart3 size={20} />
              Relatórios
            </button>
          </nav>
        </div>

        <div
          className="sidebar-footer"
          style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}
        >
          {currentUser && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--bg-app)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                width: '100%',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>
                Operador Ativo
              </span>
              <strong style={{ fontSize: '14px', color: 'var(--text-dark)' }}>
                {currentUser.name}
              </strong>
              <button
                className="btn secondary"
                onClick={handleLogout}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  width: 'auto',
                  flex: 'none',
                  height: '24px',
                  border: 'none',
                  color: 'var(--danger)',
                  marginTop: '4px',
                  cursor: 'pointer',
                }}
              >
                Sair / Deslogar
              </button>
            </div>
          )}
          <span>EzPDV v2.0.0</span>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center' }}><IceCreamCone size={24} color="var(--primary)" /></span>
          <div>
            <span
              style={{
                fontWeight: 700,
                fontSize: '16px',
                color: 'var(--primary)',
                display: 'block',
                lineHeight: 1.1,
              }}
            >
              EzPDV
            </span>
            <span
              style={{
                fontSize: '9px',
                color: isOnline ? 'var(--mint)' : 'var(--danger)',
                fontWeight: 700,
              }}
            >
              {isChecking ? 'Verificando…' : isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser && (
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-dark)',
                  display: 'block',
                }}
              >
                {currentUser.name}
              </span>
              <span
                style={{ fontSize: '9px', color: 'var(--danger)', fontWeight: 700, cursor: 'pointer' }}
                onClick={handleLogout}
              >
                Sair
              </span>
            </div>
          )}
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-light)',
              borderLeft: '1px solid var(--border-color)',
              paddingLeft: '10px',
            }}
          >
            {activeTab === 'pos' && 'Caixa'}
            {activeTab === 'products' && 'Produtos'}
            {activeTab === 'reports' && 'Relatórios'}
          </div>
        </div>
      </header>

      {/* Sync notification banner */}
      {syncMessage && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: 'var(--primary)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <RefreshCw size={14} style={{ animation: syncMessage.startsWith('✅') ? 'none' : 'spin 1s linear infinite' }} />
          {syncMessage}
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        <div className="page-title-section">
          <div>
            <h1 className="page-title">
              {activeTab === 'pos' && 'Fazer Vendas'}
              {activeTab === 'products' && 'Gerenciar Produtos'}
              {activeTab === 'reports' && 'Faturamento e Relatórios'}
            </h1>
            <span className="page-subtitle">
              {activeTab === 'pos' && 'Selecione os sorvetes e finalize o pagamento.'}
              {activeTab === 'products' && 'Cadastre, edite ou exclua sorvetes do quiosque.'}
              {activeTab === 'reports' &&
                'Monitore o caixa diário e veja o histórico de transações.'}
            </span>
          </div>
        </div>

        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeTab === 'pos' && (
            <PosView
              products={products}
              cart={cart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              updateQuantity={updateQuantity}
              updateNotes={updateNotes}
              clearCart={clearCart}
              onCheckout={handleCheckout}
              isCartMobileVisible={isCartMobileVisible}
              setIsCartMobileVisible={setIsCartMobileVisible}
              cashRegister={cashRegister}
              categories={categories}
              onOpenRegister={handleOpenRegister}
              currentCash={currentCash}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              products={products}
              categories={categories}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              sales={sales}
              onClearSales={handleClearSales}
              onResetAllData={handleResetAllData}
              cashRegister={cashRegister}
              pastSessions={pastSessions}
              onCloseRegister={handleCloseRegister}
              onRegisterMovement={handleRegisterMovement}
              currentUser={currentUser!}
              operators={operators}
              onAddOperator={handleAddOperator}
              onUpdateOperator={handleUpdateOperator}
              onDeleteOperator={handleDeleteOperator}
              isOnline={isOnline}
            />
          )}
        </div>
      </main>

      {/* Mobile Footer Navigation */}
      <nav className="mobile-footer-nav">
        <button
          className={`mobile-nav-item ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
        >
          <ShoppingBag className="mobile-nav-icon" />
          <span>Caixa</span>
        </button>
        <button
          className={`mobile-nav-item ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Tag className="mobile-nav-icon" />
          <span>Produtos</span>
        </button>
        <button
          className={`mobile-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <BarChart3 className="mobile-nav-icon" />
          <span>Relatórios</span>
        </button>
      </nav>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-light)',
              }}
              onClick={() => setShowSuccessModal(false)}
            >
              <X size={20} />
            </button>
            <div className="modal-icon">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="modal-title">Pedido Concluído!</h2>
            <p className="modal-body">
              A venda foi registrada com sucesso
              {!isOnline ? ' (modo offline — será sincronizada ao reconectar)' : ' no banco de dados'}.
            </p>
            <div
              style={{
                backgroundColor: 'var(--bg-app)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '24px',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-light)', display: 'block' }}>
                Valor Recebido
              </span>
              <strong style={{ fontSize: '24px', color: 'var(--mint)' }}>
                R$ {lastSaleTotal.toFixed(2)}
              </strong>
            </div>
            <button
              className="btn primary"
              onClick={() => setShowSuccessModal(false)}
              style={{ width: '100%' }}
            >
              Iniciar Nova Venda
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
