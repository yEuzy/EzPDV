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
  Company,
  ThemeId,
} from './types';
import { PosView } from './components/PosView';
import { ProductsView } from './components/ProductsView';
import { ReportsView } from './components/ReportsView';
import { LoginScreen } from './components/LoginScreen';
import { MasterAdminPanel } from './components/MasterAdminPanel';
import { SettingsView } from './components/SettingsView';
import { InventoryView } from './components/InventoryView';
import { useConnectionStatus } from './utils/connectionMonitor';
import { syncQueue, getPendingCount } from './utils/offlineQueue';
import { LS } from './utils/db';
import * as DB from './utils/db';
import { applyTheme, getStoredTheme, THEMES } from './utils/themes';
import {
  ShoppingBag,
  Tag,
  BarChart3,
  CheckCircle2,
  X,
  RefreshCw,
  WifiOff,
  Wifi,
  Store,
  Settings,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

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

// Resolve ícone da empresa pelo nome (string)
function CompanyIcon({ name, size = 24 }: { name?: string; size?: number }) {
  const iconName = name || 'Store';
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ size?: number }>>)[iconName];
  if (!Icon) return <Store size={size} />;
  return <Icon size={size} />;
}

// ─── Constante do .env ────────────────────────────────────────────────────────

const COMPANY_ID = import.meta.env.VITE_COMPANY_ID as string | undefined;

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'reports' | 'settings' | 'inventory'>('pos');

  // Painel master (acessível em qualquer estado da app)
  const [showMasterPanel, setShowMasterPanel] = useState(false);

  // Modal de Temas (apenas para admin)
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Empresa atual
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

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
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Connection status
  const { isOnline, isChecking } = useConnectionStatus();
  const prevOnlineRef = useRef<boolean | null>(null);

  // ─── Atalho global Ctrl+Shift+M → painel master ───────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setShowMasterPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Carregar empresa do Supabase ──────────────────────────────────────────

  const loadCompany = useCallback(async () => {
    setIsLoadingCompany(true);
    setCompanyError(null);
    try {
      if (!COMPANY_ID) {
        const cached = lsGet<Company>(LS.COMPANY);
        if (cached) {
          setCurrentCompany(cached);
          applyTheme(getStoredTheme(cached.id, cached.theme_id));
        }
        return;
      }
      try {
        const company = await DB.fetchCompany(COMPANY_ID);
        if (company) {
          setCurrentCompany(company);
          lsSet(LS.COMPANY, company);
          applyTheme(getStoredTheme(company.id, company.theme_id));
        } else {
          setCompanyError(`Empresa "${COMPANY_ID}" não encontrada. Abra o painel admin e crie-a.`);
        }
      } catch {
        const cached = lsGet<Company>(LS.COMPANY);
        if (cached && cached.id === COMPANY_ID) {
          setCurrentCompany(cached);
          applyTheme(getStoredTheme(cached.id, cached.theme_id));
        } else {
          setCompanyError('Sem conexão e sem cache. Conecte-se à internet para o primeiro acesso.');
        }
      }
    } finally {
      setIsLoadingCompany(false);
    }
  }, []);

  useEffect(() => {
    if (isChecking) return;

    const isFirstLoad = prevOnlineRef.current === null;
    const justCameOnline = prevOnlineRef.current === false && isOnline === true;

    if (isFirstLoad || justCameOnline || !currentCompany) {
      loadCompany();
    }

    prevOnlineRef.current = isOnline;
  }, [isChecking, isOnline, currentCompany, loadCompany]);


  const companyId = currentCompany?.id ?? COMPANY_ID ?? '';

  // ─── Carregamento inicial de operadores ───────────────────────────────────

  const initialOpsDone = useRef(false);
  useEffect(() => {
    if (isChecking || !currentCompany) return;

    const loadOperators = async () => {
      try {
        const ops = await DB.fetchOperators(isOnline, companyId);
        if (ops.length > 0) {
          setOperators(ops);
        } else if (!isOnline) {
          const cached = lsGet<Operator[]>(LS.OPERATORS(companyId));
          if (cached && cached.length > 0) setOperators(cached);
        }
      } catch (err) {
        console.warn('[App] Erro ao carregar operadores:', err);
        const cached = lsGet<Operator[]>(LS.OPERATORS(companyId));
        if (cached && cached.length > 0) setOperators(cached);
      } finally {
        initialOpsDone.current = true;
      }
    };
    loadOperators();
  }, [isChecking, isOnline, currentCompany]);

  // ─── Carregamento inicial de dados (produtos, vendas, caixa) ─────────────

  const defaultCategories: Category[] = [
    { id: 'all', name: 'Todos', icon: 'Grid', sort_order: 0, company_id: companyId },
  ];

  const loadAllData = useCallback(
    async (online: boolean) => {
      if (!companyId) return;
      try {
        const [prods, salesData, cashData, catsData] = await Promise.all([
          DB.fetchProducts(online, companyId),
          DB.fetchSales(online, companyId),
          DB.fetchCashData(online, companyId),
          DB.fetchCategories(online, companyId),
        ]);
        setProducts(prods);
        setSales(salesData);
        setCashRegister(cashData.register);
        setPastSessions(cashData.pastSessions);
        setCategories(catsData.length > 0 ? catsData : defaultCategories);
      } catch (err) {
        console.warn('[App] Erro ao carregar dados:', err);
        const cachedProducts = lsGet<Product[]>(LS.PRODUCTS(companyId)) ?? [];
        const cachedSales = lsGet<Sale[]>(LS.SALES(companyId)) ?? [];
        const cachedRegister = lsGet<CashRegister>(LS.CASH_REGISTER(companyId)) ?? {
          id: null, isOpen: false, openedAt: null, openedBy: null, startingCash: 0, movements: [],
        };
        const cachedSessions = lsGet<CashRegisterSession[]>(LS.PAST_SESSIONS(companyId)) ?? [];
        const cachedCategories = lsGet<Category[]>(LS.CATEGORIES(companyId)) ?? [];
        setProducts(cachedProducts);
        setSales(cachedSales);
        setCashRegister(cachedRegister);
        setPastSessions(cachedSessions);
        setCategories(cachedCategories.length > 0 ? cachedCategories : defaultCategories);
      }
    },
    [companyId]
  );

  // Primeira carga baseada na empresa
  const [loadedCompanyId, setLoadedCompanyId] = useState<string | null>(null);
  useEffect(() => {
    if (!isChecking && currentCompany && loadedCompanyId !== currentCompany.id) {
      setLoadedCompanyId(currentCompany.id);
      loadAllData(isOnline);
    }
  }, [isChecking, isOnline, currentCompany, loadAllData, loadedCompanyId]);

  // ─── Sincronização automática ao reconectar ───────────────────────────────

  useEffect(() => {
    if (prevOnlineRef.current === false && isOnline && currentCompany) {
      const sync = async () => {
        const count = getPendingCount();
        if (count > 0) {
          setSyncMessage(`Sincronizando ${count} operação(ões) pendente(s)…`);
          const synced = await syncQueue();
          if (synced > 0) {
            setSyncMessage(`✅ ${synced} operação(ões) sincronizada(s) com sucesso!`);
            await loadAllData(true);
          }
          setTimeout(() => setSyncMessage(null), 4000);
        }
        setPendingOps(getPendingCount());
      };
      sync();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, loadAllData, currentCompany]);

  useEffect(() => {
    setPendingOps(getPendingCount());
  }, [isOnline]);

  // Restaurar usuário logado do LocalStorage
  useEffect(() => {
    if (companyId) {
      const stored = lsGet<Operator>(LS.CURRENT_USER(companyId));
      if (stored) setCurrentUser(stored);
    }
  }, [companyId]);

  // ─── Login / Logout ───────────────────────────────────────────────────────

  const handleLogin = async (username: string, pin: string): Promise<boolean> => {
    try {
      const operator = await DB.authenticateUser(username, pin, isOnline);
      if (operator) {
        const company = await DB.fetchCompany(operator.company_id);
        if (company) {
          setCurrentCompany(company);
          lsSet(LS.COMPANY, company);
          applyTheme(getStoredTheme(company.id, company.theme_id));
          
          setCurrentUser(operator);
          lsSet(LS.CURRENT_USER(company.id), operator);
          return true;
        }
      }
    } catch (err) {
      console.error('[App] Erro no login:', err);
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (companyId) localStorage.removeItem(LS.CURRENT_USER(companyId));
    
    // Se não há empresa fixa no .env, descarrega a empresa para voltar ao login neutro
    if (!COMPANY_ID) {
      setCurrentCompany(null);
      localStorage.removeItem(LS.COMPANY);
      setLoadedCompanyId(null);
      
      // Limpa os dados em memória para não vazar para a próxima empresa
      setProducts([]);
      setCategories([]);
      setSales([]);
      setCashRegister({
        id: null, isOpen: false, openedAt: null, openedBy: null, startingCash: 0, movements: [],
      });
      setPastSessions([]);
      setOperators([]);
    }
  };

  // ─── Operadores CRUD ──────────────────────────────────────────────────────

  const handleAddOperator = async (data: Omit<Operator, 'id' | 'created_at' | 'company_id'>): Promise<void> => {
    const newOp: Operator = { ...data, id: `op-${generateId()}`, company_id: companyId };
    try {
      await DB.addOperator(isOnline, companyId, newOp);
      setOperators(prev => [...prev, newOp]);
    } catch (err: any) {
      alert('Erro ao adicionar operador: ' + err.message);
    }
  };

  const handleUpdateOperator = async (operator: Operator): Promise<void> => {
    try {
      await DB.updateOperator(isOnline, companyId, operator);
      setOperators(prev => prev.map(o => (o.id === operator.id ? operator : o)));
      if (currentUser?.id === operator.id) {
        setCurrentUser(operator);
        lsSet(LS.CURRENT_USER(companyId), operator);
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
      await DB.deleteOperator(isOnline, companyId, id);
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
      id: sessionId, isOpen: true, openedAt, openedBy, startingCash, movements: [], company_id: companyId,
    };

    try {
      await DB.openCashSession(isOnline, companyId, sessionId, openedAt, openedBy, startingCash);
      setCashRegister(newRegister);
      lsSet(LS.CASH_REGISTER(companyId), newRegister);
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
      id: generateId(), type, amount,
      timestamp: new Date().toISOString(),
      operator: currentUser?.name ?? 'Caixa',
      reason: reason?.trim() || undefined,
    };

    try {
      await DB.insertCashMovement(isOnline, newMovement, cashRegister.id);
      const updatedMovements = [...cashRegister.movements, newMovement];
      const updated: CashRegister = { ...cashRegister, movements: updatedMovements };
      setCashRegister(updated);
      lsSet(LS.CASH_REGISTER(companyId), updated);
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
      .filter(m => m.type === 'reforco').reduce((a, m) => a + m.amount, 0);
    const totalSangrias = cashRegister.movements
      .filter(m => m.type === 'sangria').reduce((a, m) => a + m.amount, 0);

    const totalSales = sessionSales.reduce((a, s) => a + s.total, 0);
    const finalCash = cashRegister.startingCash + cashSales + totalReforcos - totalSangrias;
    
    let totalProfit = 0;
    if (currentCompany?.enable_cost_price) {
      const totalCost = sessionSales.reduce((acc, s) => {
        const saleCost = s.items.reduce((sum, item) => sum + ((item.cost_price || 0) * item.quantity), 0);
        return acc + saleCost;
      }, 0);
      totalProfit = totalSales - totalCost;
    }

    const closedAt = new Date().toISOString();
    const closedBy = currentUser?.name ?? 'Caixa';
    const sessionId = cashRegister.id;

    const summary = { cashSales, pixSales, creditSales, debitSales, totalReforcos, totalSangrias, totalSales, finalCash, totalProfit, notes: notes?.trim() || undefined };

    try {
      await DB.closeCashSession(isOnline, companyId, sessionId, closedAt, closedBy, summary);

      const newSession: CashRegisterSession = {
        id: sessionId,
        openedAt: cashRegister.openedAt,
        closedAt,
        openedBy: cashRegister.openedBy ?? 'Caixa',
        closedBy,
        startingCash: cashRegister.startingCash,
        ...summary,
        movements: cashRegister.movements,
        company_id: companyId,
      };

      const updatedSessions = [newSession, ...pastSessions];
      setPastSessions(updatedSessions);
      lsSet(LS.PAST_SESSIONS(companyId), updatedSessions);

      const resetRegister: CashRegister = {
        id: null, isOpen: false, openedAt: null, openedBy: null, startingCash: 0, movements: [], company_id: companyId,
      };
      setCashRegister(resetRegister);
      lsSet(LS.CASH_REGISTER(companyId), resetRegister);
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
      return [...prev, { product, quantity: 1, cost_price: product.cost_price || 0, notes: '' }];
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
    setCart(prev => prev.map(i => (i.product.id === productId ? { ...i, notes } : i)));

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
      id: saleId, date: dateStr, items: [...cart], total, payments,
      soldBy: currentUser?.name ?? 'Caixa',
      company_id: companyId,
    };

    try {
      await DB.insertSale(isOnline, companyId, newSale, cashRegister.id ?? null);
      
      // Decrement stock if inventory control is enabled
      if (currentCompany?.enable_inventory) {
        let updatedProductsList = [...products];
        for (const item of cart) {
          const product = updatedProductsList.find(p => p.id === item.product.id);
          if (product) {
            const newStock = (product.stock_quantity || 0) - item.quantity;
            const updatedProduct = { ...product, stock_quantity: newStock };
            DB.updateProduct(isOnline, companyId, updatedProduct).catch(e => console.error(e));
            updatedProductsList = updatedProductsList.map(p => p.id === product.id ? updatedProduct : p);
          }
        }
        setProducts(updatedProductsList);
      }

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

  const handleAddProduct = async (data: Omit<Product, 'id' | 'company_id'>) => {
    const newProduct: Product = { ...data, id: generateId(), company_id: companyId };
    try {
      await DB.addProduct(isOnline, companyId, newProduct);
      setProducts(prev => [...prev, newProduct]);
    } catch (err: any) {
      alert('Erro ao adicionar produto: ' + err.message);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      await DB.updateProduct(isOnline, companyId, updatedProduct);
      setProducts(prev => prev.map(p => (p.id === updatedProduct.id ? updatedProduct : p)));
    } catch (err: any) {
      alert('Erro ao atualizar produto: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await DB.deleteProduct(isOnline, companyId, id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir produto: ' + err.message);
    }
  };

  // ─── Categorias CRUD ──────────────────────────────────────────────────────

  const handleAddCategory = async (data: Omit<Category, 'id' | 'company_id'>) => {
    const newCategory: Category = { ...data, id: `cat-${generateId()}`, company_id: companyId };
    try {
      await DB.addCategory(isOnline, companyId, newCategory);
      setCategories(prev => [...prev, newCategory]);
    } catch (err: any) {
      alert('Erro ao adicionar categoria: ' + err.message);
    }
  };

  const handleUpdateCategory = async (updatedCategory: Category) => {
    try {
      await DB.updateCategory(isOnline, companyId, updatedCategory);
      setCategories(prev => prev.map(c => (c.id === updatedCategory.id ? updatedCategory : c)));
    } catch (err: any) {
      alert('Erro ao atualizar categoria: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await DB.deleteCategory(isOnline, companyId, id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Erro ao excluir categoria: ' + err.message);
    }
  };

  // ─── Ações administrativas ────────────────────────────────────────────────

  const handleClearSales = async () => {
    try {
      await DB.deleteSales(isOnline, companyId);
      setSales([]);
    } catch (err: any) {
      alert('Erro ao limpar vendas: ' + err.message);
    }
  };

  const handleResetAllData = async () => {
    try {
      if (isOnline) {
        await DB.deleteSales(isOnline, companyId);
        await DB.deleteAllCashSessions(isOnline, companyId);
      }
      setSales([]);
      setCart([]);
      const resetRegister: CashRegister = {
        id: null, isOpen: false, openedAt: null, openedBy: null, startingCash: 0, movements: [], company_id: companyId,
      };
      setCashRegister(resetRegister);
      setPastSessions([]);
      lsSet(LS.SALES(companyId), []);
      lsSet(LS.PAST_SESSIONS(companyId), []);
      lsSet(LS.CASH_REGISTER(companyId), resetRegister);
    } catch (err: any) {
      alert('Erro ao redefinir dados: ' + err.message);
    }
  };

  const handleCancelSale = async (saleId: string) => {
    try {
      await DB.deleteSale(isOnline, companyId, saleId);
      setSales(prev => prev.filter(s => s.id !== saleId));
    } catch (err: any) {
      alert('Erro ao cancelar venda: ' + err.message);
    }
  };

  const handleUpdateSalePayments = async (saleId: string, newPayments: SalePayment[]) => {
    try {
      await DB.updateSalePayments(isOnline, companyId, saleId, newPayments);
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, payments: newPayments } : s));
    } catch (err: any) {
      alert('Erro ao atualizar forma de pagamento: ' + err.message);
    }
  };

  // ─── Derivados do caixa ───────────────────────────────────────────────────

  const currentCashSales = sales
    .filter(s => cashRegister.openedAt && new Date(s.date) >= new Date(cashRegister.openedAt))
    .reduce((sum, s) => {
      const p = s.payments?.find(p => p.method === 'Dinheiro');
      return sum + (p ? p.amount : 0);
    }, 0);

  const totalReforcos = cashRegister.movements
    .filter(m => m.type === 'reforco').reduce((sum, m) => sum + m.amount, 0);
  const totalSangrias = cashRegister.movements
    .filter(m => m.type === 'sangria').reduce((sum, m) => sum + m.amount, 0);

  const currentCash = cashRegister.startingCash + currentCashSales + totalReforcos - totalSangrias;

  // ─── Sempre renderizar o MasterAdminPanel acima dos early returns ──────────────────
  // (evita reset de estado interno ao re-renderizar o App)
  const masterPanelEl = showMasterPanel ? (
    <MasterAdminPanel
      onClose={() => {
        setShowMasterPanel(false);
        // Recarregar empresa apenas quando houver erro (empresa ainda não configurada)
        if (companyError) loadCompany();
      }}
    />
  ) : null;

  // ─── Loading / Error de empresa ───────────────────────────────────────────

  if (isLoadingCompany || (isChecking && !currentCompany)) {
    return (
      <>
        {masterPanelEl}
        <div style={{
          height: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          background: 'var(--bg-app)', color: 'var(--text-light)',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'var(--primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Store size={24} color="var(--primary)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-dark)', marginBottom: '4px' }}>
              EzPDV
            </div>
            <div style={{ fontSize: '13px' }}>Carregando empresa…</div>
          </div>
        </div>
      </>
    );
  }

  if (companyError) {
    return (
      <>
        {masterPanelEl}
        <div style={{
          height: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          background: 'var(--bg-app)', color: 'var(--text-light)',
          padding: '32px', textAlign: 'center',
        }}>
          <div
            style={{ fontSize: '40px', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowMasterPanel(true)}
            title="Clique para abrir o painel admin"
          >
            ⚠️
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--danger)', marginBottom: '8px' }}>
              Empresa não configurada
            </div>
            <div style={{ fontSize: '13px', maxWidth: '400px', lineHeight: 1.6 }}>{companyError}</div>
          </div>
          <button
            onClick={() => setShowMasterPanel(true)}
            style={{
              marginTop: '8px', padding: '10px 20px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px', color: 'var(--text-light)',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            🔑 Abrir Painel Admin (Ctrl+Shift+M)
          </button>
        </div>
      </>
    );
  }

  // ─── Tela de login ────────────────────────────────────────────────────────

  if (!currentUser) {
    return (
      <>
        {showMasterPanel && <MasterAdminPanel onClose={() => { setShowMasterPanel(false); }} />}
        <LoginScreen
          company={currentCompany}
          onLogin={handleLogin}
          isLoading={isLoadingCompany}
          onOpenMasterPanel={() => setShowMasterPanel(true)}
        />
      </>
    );
  }

  // ─── Render principal ─────────────────────────────────────────────────────

  return (
    <div className="app-container">
      {/* Sidebar - Desktop Navigation */}
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <CompanyIcon name={currentCompany?.icon} size={24} />
            </div>
            <div>
              <span className="brand-name">{currentCompany?.name ?? 'EzPDV'}</span>
              <span className="brand-tagline">{currentCompany?.tagline ?? ''}</span>
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

            {currentCompany?.enable_inventory && (
              <button
                className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                <LucideIcons.Package size={20} />
                Estoque
              </button>
            )}

            {currentUser?.role === 'admin' && (
              <button
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={20} />
                Configurações
              </button>
            )}
          </nav>
        </div>

        <div
          className="sidebar-footer"
          style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}
        >
          {currentUser && (
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                backgroundColor: 'var(--bg-app)', padding: '8px 12px',
                borderRadius: 'var(--radius-md)', width: '100%',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>
                Operador Ativo
              </span>
              <strong style={{ fontSize: '14px', color: 'var(--text-dark)' }}>
                {currentUser.name}
              </strong>
              {currentUser.role === 'admin' && (
                <button
                  className="btn secondary"
                  onClick={() => setShowThemeModal(true)}
                  style={{
                    padding: '4px 8px', fontSize: '11px', width: 'auto',
                    flex: 'none', height: '24px', border: '1px solid var(--primary)',
                    color: 'var(--primary)', marginTop: '4px', cursor: 'pointer',
                    background: 'var(--primary-light)',
                  }}
                >
                  🎨 Mudar Tema
                </button>
              )}
              <button
                className="btn secondary"
                onClick={handleLogout}
                style={{
                  padding: '4px 8px', fontSize: '11px', width: 'auto',
                  flex: 'none', height: '24px', border: 'none',
                  color: 'var(--danger)', marginTop: '4px', cursor: 'pointer',
                }}
              >
                Sair / Deslogar
              </button>
            </div>
          )}
          <span>EzPDV v2.1.0</span>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)' }}>
            <CompanyIcon name={currentCompany?.icon} size={24} />
          </span>
          <div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary)', display: 'block', lineHeight: 1.1 }}>
              {currentCompany?.name ?? 'EzPDV'}
            </span>
            <span style={{ fontSize: '9px', color: isOnline ? 'var(--mint)' : 'var(--danger)', fontWeight: 700 }}>
              {isChecking ? 'Verificando…' : isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser?.role === 'admin' && (
            <div
              style={{ fontSize: '16px', cursor: 'pointer', background: 'var(--primary-light)', padding: '6px', borderRadius: '8px' }}
              onClick={() => setShowThemeModal(true)}
              title="Mudar Tema"
            >
              🎨
            </div>
          )}
          {currentUser && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)', display: 'block' }}>
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
          <div style={{
            fontSize: '12px', fontWeight: 600, color: 'var(--text-light)',
            borderLeft: '1px solid var(--border-color)', paddingLeft: '10px',
          }}>
            {activeTab === 'pos' && 'Caixa'}
            {activeTab === 'products' && 'Produtos'}
            {activeTab === 'reports' && 'Relatórios'}
            {activeTab === 'settings' && 'Configurações'}
          </div>
        </div>
      </header>

      {/* Sync notification banner */}
      {syncMessage && (
        <div
          style={{
            position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, backgroundColor: 'var(--primary)', color: '#fff',
            padding: '10px 20px', borderRadius: 'var(--radius-md)',
            fontSize: '13px', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: '8px',
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
              {activeTab === 'inventory' && 'Controle de Estoque'}
              {activeTab === 'settings' && 'Configurações da Empresa'}
            </h1>
            <span className="page-subtitle">
              {activeTab === 'pos' && 'Selecione os produtos e finalize o pagamento.'}
              {activeTab === 'products' && 'Cadastre, edite ou exclua produtos.'}
              {activeTab === 'reports' && 'Monitore o caixa diário e veja o histórico de transações.'}
              {activeTab === 'inventory' && 'Acompanhe e faça os acertos das quantidades em estoque.'}
              {activeTab === 'settings' && 'Gerencie configurações globais da sua loja.'}
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
              currentCompany={currentCompany}
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
              currentCompany={currentCompany}
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
              onCancelSale={handleCancelSale}
              onUpdateSalePayments={handleUpdateSalePayments}
              currentCompany={currentCompany!}
            />
          )}

          {activeTab === 'settings' && currentCompany && (
            <SettingsView
              currentCompany={currentCompany}
              setCurrentCompany={setCurrentCompany as any}
              isOnline={isOnline}
            />
          )}

          {activeTab === 'inventory' && currentCompany && (
            <InventoryView
              products={products}
              categories={categories}
              onUpdateProduct={handleUpdateProduct}
              currentCompany={currentCompany}
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
        {currentCompany?.enable_inventory && (
          <button
            className={`mobile-nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <LucideIcons.Package className="mobile-nav-icon" />
            <span>Estoque</span>
          </button>
        )}
        {currentUser?.role === 'admin' && (
          <button
            className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="mobile-nav-icon" />
            <span>Config.</span>
          </button>
        )}
      </nav>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button
              style={{
                position: 'absolute', right: '16px', top: '16px',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)',
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
            <div style={{
              backgroundColor: 'var(--bg-app)', padding: '16px',
              borderRadius: 'var(--radius-md)', marginBottom: '24px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-light)', display: 'block' }}>Valor Recebido</span>
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

      {/* Modal de Escolha de Temas (Apenas Admin) */}
      {showThemeModal && currentCompany && (
        <div className="modal-overlay" onClick={() => setShowThemeModal(false)} style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🎨 Mudar Tema</h2>
              <button className="btn-icon" onClick={() => setShowThemeModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-light)' }}>
                Selecione um esquema de cores para o sistema da sua empresa. A mudança é salva e aplicada para todos os operadores instantaneamente.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={async () => {
                      if (!isOnline) {
                        alert('Você precisa estar online para mudar o tema da empresa.');
                        return;
                      }
                      try {
                        const updatedCompany = { ...currentCompany, theme_id: theme.id as ThemeId };
                        setCurrentCompany(updatedCompany);
                        lsSet(LS.COMPANY, updatedCompany);
                        applyTheme(getStoredTheme(updatedCompany.id, updatedCompany.theme_id));
                        await DB.updateCompany(updatedCompany);
                        setShowThemeModal(false);
                      } catch (err: any) {
                        alert('Erro ao atualizar tema: ' + err.message);
                      }
                    }}
                    style={{
                      padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                      background: currentCompany.theme_id === theme.id ? `${theme.vars['--primary']}25` : 'var(--bg-app)',
                      border: currentCompany.theme_id === theme.id ? `2px solid ${theme.vars['--primary']}` : '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{theme.emoji}</span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: theme.vars['--primary'] }}>{theme.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{theme.dark ? 'Modo Escuro' : 'Modo Claro'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
