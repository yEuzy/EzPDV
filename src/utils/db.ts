/**
 * db.ts
 * Camada de abstração de dados do EzPDV — Multi-empresa v2.
 *
 * Estratégia:
 *  - Online  → Lê/Escreve no Supabase (filtrado por company_id). Atualiza cache LocalStorage.
 *  - Offline → Lê do cache LocalStorage. Escreve na fila offline (offlineQueue).
 *
 * Todas as funções recebem `isOnline: boolean` e `companyId: string`.
 * As chaves do LocalStorage são prefixadas com o company_id para isolamento total.
 */

import { supabase } from './supabaseClient';
import { enqueue } from './offlineQueue';
import type {
  Product,
  Category,
  Operator,
  Sale,
  SalePayment,
  CartItem,
  CashRegister,
  CashRegisterSession,
  CashMovement,
  Company,
} from '../types';

// ─── Chaves do LocalStorage (prefixadas por empresa) ──────────────────────────
export const LS = {
  PRODUCTS:      (cid: string) => `ezpdv_${cid}_products_v2`,
  CATEGORIES:    (cid: string) => `ezpdv_${cid}_categories_v2`,
  OPERATORS:     (cid: string) => `ezpdv_${cid}_operators_v2`,
  SALES:         (cid: string) => `ezpdv_${cid}_sales_v2`,
  CASH_REGISTER: (cid: string) => `ezpdv_${cid}_cash_register_v2`,
  PAST_SESSIONS: (cid: string) => `ezpdv_${cid}_past_sessions_v2`,
  CURRENT_USER:  (cid: string) => `ezpdv_${cid}_current_user_v2`,
  COMPANY:                       'ezpdv_current_company',
  GLOBAL_LOGIN_CACHE:            'ezpdv_global_login_cache',
} as const;

// ─── Helpers LocalStorage ──────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// EMPRESAS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchAllCompanies(): Promise<Company[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return (data || []) as Company[];
  }
  return [];
}

export async function fetchCompany(id: string): Promise<Company | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (data) lsSet(LS.COMPANY, data);
    return data as Company;
  }
  return lsGet<Company>(LS.COMPANY);
}

export async function addCompany(company: Company): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase.from('companies').insert(company);
  if (error) throw error;
}

export async function updateCompany(company: Company): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { id, ...fields } = company;
  const { error } = await supabase.from('companies').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteCompany(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTENTICAÇÃO (Login Dinâmico)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CachedLogin {
  username: string;
  pin: string;
  operator: Operator;
}

export async function authenticateUser(username: string, pin: string, isOnline: boolean, companyId?: string): Promise<Operator | null> {
  // Ignora maiúsculas e minúsculas no frontend
  const normalizedUsername = username.trim().toLowerCase();

  if (isOnline && supabase) {
    let query = supabase
      .from('operators')
      .select('*')
      .ilike('name', normalizedUsername)
      .eq('pin', pin);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.limit(1).single();

    if (!error && data) {
      const operator = data as Operator;
      // Salva no cache global para login offline futuro
      const cache = lsGet<CachedLogin[]>(LS.GLOBAL_LOGIN_CACHE) || [];
      const newCache = cache.filter(c => !(c.username.toLowerCase() === normalizedUsername && c.pin === pin));
      newCache.push({ username: normalizedUsername, pin, operator });
      lsSet(LS.GLOBAL_LOGIN_CACHE, newCache);
      return operator;
    }
  } else {
    // Offline fallback
    const cache = lsGet<CachedLogin[]>(LS.GLOBAL_LOGIN_CACHE) || [];
    const match = cache.find(c => 
      c.username.toLowerCase() === normalizedUsername && 
      c.pin === pin && 
      (!companyId || c.operator.company_id === companyId)
    );
    if (match) {
      return match.operator;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERADORES
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchOperators(isOnline: boolean, companyId: string): Promise<Operator[]> {
  if (isOnline && supabase) {
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at');
    if (error) throw error;
    const operators = (data || []) as Operator[];
    lsSet(LS.OPERATORS(companyId), operators);
    return operators;
  }
  return lsGet<Operator[]>(LS.OPERATORS(companyId)) ?? [];
}

export async function addOperator(
  isOnline: boolean,
  companyId: string,
  operator: Operator
): Promise<void> {
  const payload = { ...operator, company_id: companyId };
  if (isOnline && supabase) {
    const { error } = await supabase.from('operators').insert(payload);
    if (error) throw error;
  } else {
    enqueue('INSERT_OPERATOR', 'operators', payload as unknown as Record<string, unknown>);
  }
  const current = lsGet<Operator[]>(LS.OPERATORS(companyId)) ?? [];
  lsSet(LS.OPERATORS(companyId), [...current, { ...operator, company_id: companyId }]);
}

export async function updateOperator(
  isOnline: boolean,
  companyId: string,
  operator: Operator
): Promise<void> {
  const fields = { name: operator.name, role: operator.role, pin: operator.pin };
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('operators')
      .update(fields)
      .eq('id', operator.id)
      .eq('company_id', companyId);
    if (error) throw error;
  } else {
    enqueue('UPDATE_OPERATOR', 'operators', fields, { column: 'id', value: operator.id });
  }
  const current = lsGet<Operator[]>(LS.OPERATORS(companyId)) ?? [];
  lsSet(LS.OPERATORS(companyId), current.map(o => (o.id === operator.id ? { ...operator, company_id: companyId } : o)));
}

export async function deleteOperator(
  isOnline: boolean,
  companyId: string,
  id: string
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('operators')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
  } else {
    enqueue('DELETE_OPERATOR', 'operators', {}, { column: 'id', value: id });
  }
  const current = lsGet<Operator[]>(LS.OPERATORS(companyId)) ?? [];
  lsSet(LS.OPERATORS(companyId), current.filter(o => o.id !== id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIAS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchCategories(isOnline: boolean, companyId: string): Promise<Category[]> {
  if (isOnline && supabase) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order');
    if (error) throw error;
    const categories = (data || []) as Category[];
    lsSet(LS.CATEGORIES(companyId), categories);
    return categories;
  }
  return lsGet<Category[]>(LS.CATEGORIES(companyId)) ?? [];
}

export async function addCategory(
  isOnline: boolean,
  companyId: string,
  category: Category
): Promise<void> {
  const payload = { ...category, company_id: companyId };
  if (isOnline && supabase) {
    const { error } = await supabase.from('categories').insert(payload);
    if (error) throw error;
  } else {
    enqueue('INSERT_CATEGORY', 'categories', payload as unknown as Record<string, unknown>);
  }
  const current = lsGet<Category[]>(LS.CATEGORIES(companyId)) ?? [];
  lsSet(LS.CATEGORIES(companyId), [...current, payload]);
}

export async function updateCategory(
  isOnline: boolean,
  companyId: string,
  category: Category
): Promise<void> {
  const { id, ...fields } = category;
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('categories')
      .update(fields)
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
  } else {
    enqueue('UPDATE_CATEGORY', 'categories', fields as Record<string, unknown>, {
      column: 'id',
      value: id,
    });
  }
  const current = lsGet<Category[]>(LS.CATEGORIES(companyId)) ?? [];
  lsSet(LS.CATEGORIES(companyId), current.map(c => (c.id === id ? { ...category, company_id: companyId } : c)));
}

export async function deleteCategory(
  isOnline: boolean,
  companyId: string,
  id: string
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
  } else {
    enqueue('DELETE_CATEGORY', 'categories', {}, { column: 'id', value: id });
  }
  const current = lsGet<Category[]>(LS.CATEGORIES(companyId)) ?? [];
  lsSet(LS.CATEGORIES(companyId), current.filter(c => c.id !== id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUTOS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchProducts(isOnline: boolean, companyId: string): Promise<Product[]> {
  if (isOnline && supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId);
    if (error) throw error;
    const products = (data || []).map(p => ({
      ...p,
      price: Number(p.price),
      cost_price: Number(p.cost_price || 0),
      stock_quantity: Number(p.stock_quantity || 0),
    })) as Product[];
    lsSet(LS.PRODUCTS(companyId), products);
    return products;
  }
  return lsGet<Product[]>(LS.PRODUCTS(companyId)) ?? [];
}

export async function addProduct(
  isOnline: boolean,
  companyId: string,
  product: Product
): Promise<void> {
  const payload = { ...product, company_id: companyId };
  if (isOnline && supabase) {
    const { error } = await supabase.from('products').insert(payload);
    if (error) throw error;
  } else {
    enqueue('INSERT_PRODUCT', 'products', payload as unknown as Record<string, unknown>);
  }
  const current = lsGet<Product[]>(LS.PRODUCTS(companyId)) ?? [];
  lsSet(LS.PRODUCTS(companyId), [...current, payload]);
}

export async function updateProduct(
  isOnline: boolean,
  companyId: string,
  product: Product
): Promise<void> {
  const { id, ...fields } = product;
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('products')
      .update(fields)
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
  } else {
    enqueue('UPDATE_PRODUCT', 'products', fields as Record<string, unknown>, {
      column: 'id',
      value: id,
    });
  }
  const current = lsGet<Product[]>(LS.PRODUCTS(companyId)) ?? [];
  lsSet(LS.PRODUCTS(companyId), current.map(p => (p.id === id ? { ...product, company_id: companyId } : p)));
}

export async function deleteProduct(
  isOnline: boolean,
  companyId: string,
  id: string
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
  } else {
    enqueue('DELETE_PRODUCT', 'products', {}, { column: 'id', value: id });
  }
  const current = lsGet<Product[]>(LS.PRODUCTS(companyId)) ?? [];
  lsSet(LS.PRODUCTS(companyId), current.filter(p => p.id !== id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// VENDAS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchSales(isOnline: boolean, companyId: string): Promise<Sale[]> {
  if (isOnline && supabase) {
    const { data: salesData, error: salesErr } = await supabase
      .from('sales')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    if (salesErr) throw salesErr;

    const { data: itemsData, error: itemsErr } = await supabase
      .from('sale_items')
      .select('*');
    if (itemsErr) throw itemsErr;

    const { data: paymentsData, error: paymentsErr } = await supabase
      .from('sale_payments')
      .select('*');
    if (paymentsErr) throw paymentsErr;

    const sales: Sale[] = (salesData || []).map(s => {
      const items: CartItem[] = (itemsData || [])
        .filter(i => i.sale_id === s.id)
        .map(i => ({
          product: {
            id: i.product_id,
            name: i.product_name,
            price: Number(i.price),
            category: '',
            color: '',
            cost_price: Number(i.cost_price || 0),
            company_id: companyId,
          },
          quantity: i.quantity,
          notes: i.notes ?? '',
          cost_price: Number(i.cost_price || 0),
        }));

      const payments: SalePayment[] = (paymentsData || [])
        .filter(p => p.sale_id === s.id)
        .map(p => ({ method: p.method as SalePayment['method'], amount: Number(p.amount) }));

      return {
        id: s.id,
        date: s.date,
        total: Number(s.total),
        soldBy: s.sold_by,
        items,
        payments,
        company_id: companyId,
      };
    });

    lsSet(LS.SALES(companyId), sales);
    return sales;
  }

  return lsGet<Sale[]>(LS.SALES(companyId)) ?? [];
}

export async function insertSale(
  isOnline: boolean,
  companyId: string,
  sale: Sale,
  cashSessionId: string | null
): Promise<void> {
  const saleRow = {
    id: sale.id,
    date: sale.date,
    total: sale.total,
    sold_by: sale.soldBy,
    cash_session_id: cashSessionId,
    company_id: companyId,
  };

  const itemRows = sale.items.map(item => ({
    sale_id: sale.id,
    product_id: item.product.id,
    product_name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    notes: item.notes ?? null,
    cost_price: item.cost_price ?? item.product.cost_price ?? 0,
  }));

  const paymentRows = sale.payments.map(p => ({
    sale_id: sale.id,
    method: p.method,
    amount: p.amount,
  }));

  if (isOnline && supabase) {
    const { error: sErr } = await supabase.from('sales').insert(saleRow);
    if (sErr) throw sErr;

    const { error: iErr } = await supabase.from('sale_items').insert(itemRows);
    if (iErr) throw iErr;

    const { error: pErr } = await supabase.from('sale_payments').insert(paymentRows);
    if (pErr) throw pErr;
  } else {
    enqueue('INSERT_SALE', 'sales', saleRow as unknown as Record<string, unknown>);
    enqueue('INSERT_SALE_ITEMS', 'sale_items', itemRows as unknown as Record<string, unknown>[]);
    enqueue('INSERT_SALE_PAYMENTS', 'sale_payments', paymentRows as unknown as Record<string, unknown>[]);
  }

  const current = lsGet<Sale[]>(LS.SALES(companyId)) ?? [];
  lsSet(LS.SALES(companyId), [sale, ...current]);
}

export async function deleteSale(isOnline: boolean, companyId: string, saleId: string): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase.from('sales').delete().eq('id', saleId).eq('company_id', companyId);
    if (error) throw error;
  } else {
    enqueue('DELETE_SALE', 'sales', {}, { column: 'id', value: saleId });
  }
  const current = lsGet<Sale[]>(LS.SALES(companyId)) ?? [];
  lsSet(LS.SALES(companyId), current.filter(s => s.id !== saleId));
}

export async function updateSalePayments(
  isOnline: boolean,
  companyId: string,
  saleId: string,
  newPayments: SalePayment[]
): Promise<void> {
  const paymentRows = newPayments.map(p => ({
    sale_id: saleId,
    method: p.method,
    amount: p.amount,
  }));

  if (isOnline && supabase) {
    // Apaga os pagamentos antigos e insere os novos
    const { error: delErr } = await supabase.from('sale_payments').delete().eq('sale_id', saleId);
    if (delErr) throw delErr;
    
    const { error: insErr } = await supabase.from('sale_payments').insert(paymentRows);
    if (insErr) throw insErr;
  } else {
    enqueue('DELETE_SALE_PAYMENTS', 'sale_payments', {}, { column: 'sale_id', value: saleId });
    enqueue('INSERT_SALE_PAYMENTS', 'sale_payments', paymentRows as unknown as Record<string, unknown>[]);
  }

  const current = lsGet<Sale[]>(LS.SALES(companyId)) ?? [];
  lsSet(LS.SALES(companyId), current.map(s => s.id === saleId ? { ...s, payments: newPayments } : s));
}

export async function deleteSales(isOnline: boolean, companyId: string): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('company_id', companyId);
    if (error) throw error;
  }
  lsSet(LS.SALES(companyId), []);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSÕES DE CAIXA
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchCashData(
  isOnline: boolean,
  companyId: string
): Promise<{
  register: CashRegister;
  pastSessions: CashRegisterSession[];
}> {
  const emptyRegister: CashRegister = {
    id: null,
    isOpen: false,
    openedAt: null,
    openedBy: null,
    startingCash: 0,
    movements: [],
    company_id: companyId,
  };

  if (isOnline && supabase) {
    const { data: sessions, error: sessErr } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('company_id', companyId)
      .order('opened_at', { ascending: false });
    if (sessErr) throw sessErr;

    const { data: movements, error: movErr } = await supabase
      .from('cash_movements')
      .select('*')
      .order('timestamp', { ascending: true });
    if (movErr) throw movErr;

    const openSession = (sessions || []).find(s => !s.closed_at);
    let register = emptyRegister;

    if (openSession) {
      const sessionMovements: CashMovement[] = (movements || [])
        .filter(m => m.cash_session_id === openSession.id)
        .map(m => ({
          id: m.id,
          type: m.type as 'sangria' | 'reforco',
          amount: Number(m.amount),
          timestamp: m.timestamp,
          operator: m.operator,
          reason: m.reason ?? undefined,
        }));

      register = {
        id: openSession.id,
        isOpen: true,
        openedAt: openSession.opened_at,
        openedBy: openSession.opened_by,
        startingCash: Number(openSession.starting_cash),
        movements: sessionMovements,
        company_id: companyId,
      };
    }

    const pastSessions: CashRegisterSession[] = (sessions || [])
      .filter(s => s.closed_at)
      .map(s => {
        const sessionMovements: CashMovement[] = (movements || [])
          .filter(m => m.cash_session_id === s.id)
          .map(m => ({
            id: m.id,
            type: m.type as 'sangria' | 'reforco',
            amount: Number(m.amount),
            timestamp: m.timestamp,
            operator: m.operator,
            reason: m.reason ?? undefined,
          }));

        return {
          id: s.id,
          openedAt: s.opened_at,
          closedAt: s.closed_at,
          openedBy: s.opened_by,
          closedBy: s.closed_by ?? '',
          startingCash: Number(s.starting_cash),
          cashSales: Number(s.cash_sales ?? 0),
          pixSales: Number(s.pix_sales ?? 0),
          creditSales: Number(s.credit_sales ?? 0),
          debitSales: Number(s.debit_sales ?? 0),
          totalReforcos: Number(s.total_reforcos ?? 0),
          totalSangrias: Number(s.total_sangrias ?? 0),
          totalSales: Number(s.total_sales ?? 0),
          finalCash: Number(s.final_cash ?? 0),
          totalProfit: Number(s.total_profit ?? 0),
          notes: s.notes ?? undefined,
          movements: sessionMovements,
          company_id: companyId,
        };
      });

    lsSet(LS.CASH_REGISTER(companyId), register);
    lsSet(LS.PAST_SESSIONS(companyId), pastSessions);

    return { register, pastSessions };
  }

  return {
    register: lsGet<CashRegister>(LS.CASH_REGISTER(companyId)) ?? emptyRegister,
    pastSessions: lsGet<CashRegisterSession[]>(LS.PAST_SESSIONS(companyId)) ?? [],
  };
}

export async function openCashSession(
  isOnline: boolean,
  companyId: string,
  sessionId: string,
  openedAt: string,
  openedBy: string,
  startingCash: number
): Promise<void> {
  const row = {
    id: sessionId,
    opened_at: openedAt,
    opened_by: openedBy,
    starting_cash: startingCash,
    cash_sales: 0,
    pix_sales: 0,
    credit_sales: 0,
    debit_sales: 0,
    total_reforcos: 0,
    total_sangrias: 0,
    total_sales: 0,
    final_cash: 0,
    total_profit: 0,
    company_id: companyId,
  };

  if (isOnline && supabase) {
    const { error } = await supabase.from('cash_sessions').insert(row);
    if (error) throw error;
  } else {
    enqueue('INSERT_CASH_SESSION', 'cash_sessions', row as unknown as Record<string, unknown>);
  }
}

export async function insertCashMovement(
  isOnline: boolean,
  movement: CashMovement,
  cashSessionId: string
): Promise<void> {
  const row = {
    id: movement.id,
    cash_session_id: cashSessionId,
    type: movement.type,
    amount: movement.amount,
    timestamp: movement.timestamp,
    operator: movement.operator,
    reason: movement.reason ?? null,
  };

  if (isOnline && supabase) {
    const { error } = await supabase.from('cash_movements').insert(row);
    if (error) throw error;
  } else {
    enqueue('INSERT_CASH_MOVEMENT', 'cash_movements', row as unknown as Record<string, unknown>);
  }
}

export async function closeCashSession(
  isOnline: boolean,
  companyId: string,
  sessionId: string,
  closedAt: string,
  closedBy: string,
  summary: {
    cashSales: number;
    pixSales: number;
    creditSales: number;
    debitSales: number;
    totalReforcos: number;
    totalSangrias: number;
    totalSales: number;
    finalCash: number;
    totalProfit?: number;
    notes?: string;
  }
): Promise<void> {
  const update = {
    closed_at: closedAt,
    closed_by: closedBy,
    cash_sales: summary.cashSales,
    pix_sales: summary.pixSales,
    credit_sales: summary.creditSales,
    debit_sales: summary.debitSales,
    total_reforcos: summary.totalReforcos,
    total_sangrias: summary.totalSangrias,
    total_sales: summary.totalSales,
    final_cash: summary.finalCash,
    total_profit: summary.totalProfit ?? 0,
    notes: summary.notes ?? null,
  };

  if (isOnline && supabase) {
    const { error } = await supabase
      .from('cash_sessions')
      .update(update)
      .eq('id', sessionId)
      .eq('company_id', companyId);
    if (error) throw error;
  } else {
    enqueue('UPDATE_CASH_SESSION', 'cash_sessions', update as Record<string, unknown>, {
      column: 'id',
      value: sessionId,
    });
  }
}

export async function deleteAllCashSessions(isOnline: boolean, companyId: string): Promise<void> {
  if (isOnline && supabase) {
    await supabase.from('cash_sessions').delete().eq('company_id', companyId);
  }
  const emptyRegister: CashRegister = {
    id: null,
    isOpen: false,
    openedAt: null,
    openedBy: null,
    startingCash: 0,
    movements: [],
    company_id: companyId,
  };
  lsSet(LS.CASH_REGISTER(companyId), emptyRegister);
  lsSet(LS.PAST_SESSIONS(companyId), []);
}
