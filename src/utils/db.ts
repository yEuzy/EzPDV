/**
 * db.ts
 * Camada de abstração de dados do EzPDV.
 *
 * Estratégia:
 *  - Online  → Lê/Escreve no Supabase. Atualiza cache LocalStorage.
 *  - Offline → Lê do cache LocalStorage. Escreve na fila offline (offlineQueue).
 *
 * Todas as funções recebem `isOnline: boolean` para decidir o modo.
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
} from '../types';

// ─── Chaves do LocalStorage (cache) ───────────────────────────────────────────
export const LS = {
  PRODUCTS: 'ezpdv_products_v2',
  CATEGORIES: 'ezpdv_categories_v2',
  OPERATORS: 'ezpdv_operators_v2',
  SALES: 'ezpdv_sales_v2',
  CASH_REGISTER: 'ezpdv_cash_register_v2',
  PAST_SESSIONS: 'ezpdv_past_sessions_v2',
  CURRENT_USER: 'ezpdv_current_user_v2',
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
// OPERADORES
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchOperators(isOnline: boolean): Promise<Operator[]> {
  if (isOnline && supabase) {
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .order('created_at');
    if (error) throw error;
    const operators = (data || []) as Operator[];
    lsSet(LS.OPERATORS, operators);
    return operators;
  }
  return lsGet<Operator[]>(LS.OPERATORS) ?? [];
}

export async function addOperator(
  isOnline: boolean,
  operator: Operator
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase.from('operators').insert(operator);
    if (error) throw error;
  } else {
    enqueue('INSERT_OPERATOR', 'operators', operator as unknown as Record<string, unknown>);
  }
  const current = lsGet<Operator[]>(LS.OPERATORS) ?? [];
  lsSet(LS.OPERATORS, [...current, operator]);
}

export async function updateOperator(
  isOnline: boolean,
  operator: Operator
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('operators')
      .update({ name: operator.name, role: operator.role, pin: operator.pin })
      .eq('id', operator.id);
    if (error) throw error;
  } else {
    enqueue(
      'UPDATE_OPERATOR',
      'operators',
      { name: operator.name, role: operator.role, pin: operator.pin },
      { column: 'id', value: operator.id }
    );
  }
  const current = lsGet<Operator[]>(LS.OPERATORS) ?? [];
  lsSet(LS.OPERATORS, current.map(o => (o.id === operator.id ? operator : o)));
}

export async function deleteOperator(
  isOnline: boolean,
  id: string
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase.from('operators').delete().eq('id', id);
    if (error) throw error;
  } else {
    enqueue('DELETE_OPERATOR', 'operators', {}, { column: 'id', value: id });
  }
  const current = lsGet<Operator[]>(LS.OPERATORS) ?? [];
  lsSet(LS.OPERATORS, current.filter(o => o.id !== id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIAS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchCategories(isOnline: boolean): Promise<Category[]> {
  if (isOnline && supabase) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    const categories = (data || []) as Category[];
    lsSet(LS.CATEGORIES, categories);
    return categories;
  }
  return lsGet<Category[]>(LS.CATEGORIES) ?? [];
}

export async function addCategory(
  isOnline: boolean,
  category: Category
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase.from('categories').insert(category);
    if (error) throw error;
  } else {
    enqueue('INSERT_CATEGORY', 'categories', category as unknown as Record<string, unknown>);
  }
  const current = lsGet<Category[]>(LS.CATEGORIES) ?? [];
  lsSet(LS.CATEGORIES, [...current, category]);
}

export async function updateCategory(
  isOnline: boolean,
  category: Category
): Promise<void> {
  const { id, ...fields } = category;
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('categories')
      .update(fields)
      .eq('id', id);
    if (error) throw error;
  } else {
    enqueue('UPDATE_CATEGORY', 'categories', fields as Record<string, unknown>, {
      column: 'id',
      value: id,
    });
  }
  const current = lsGet<Category[]>(LS.CATEGORIES) ?? [];
  lsSet(LS.CATEGORIES, current.map(c => (c.id === id ? category : c)));
}

export async function deleteCategory(
  isOnline: boolean,
  id: string
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  } else {
    enqueue('DELETE_CATEGORY', 'categories', {}, { column: 'id', value: id });
  }
  const current = lsGet<Category[]>(LS.CATEGORIES) ?? [];
  lsSet(LS.CATEGORIES, current.filter(c => c.id !== id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUTOS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchProducts(isOnline: boolean): Promise<Product[]> {
  if (isOnline && supabase) {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    const products = (data || []).map(p => ({
      ...p,
      price: Number(p.price),
    })) as Product[];
    lsSet(LS.PRODUCTS, products);
    return products;
  }
  return lsGet<Product[]>(LS.PRODUCTS) ?? [];
}

export async function addProduct(
  isOnline: boolean,
  product: Product
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase.from('products').insert(product);
    if (error) throw error;
  } else {
    enqueue('INSERT_PRODUCT', 'products', product as unknown as Record<string, unknown>);
  }
  const current = lsGet<Product[]>(LS.PRODUCTS) ?? [];
  lsSet(LS.PRODUCTS, [...current, product]);
}

export async function updateProduct(
  isOnline: boolean,
  product: Product
): Promise<void> {
  const { id, ...fields } = product;
  if (isOnline && supabase) {
    const { error } = await supabase
      .from('products')
      .update(fields)
      .eq('id', id);
    if (error) throw error;
  } else {
    enqueue('UPDATE_PRODUCT', 'products', fields as Record<string, unknown>, {
      column: 'id',
      value: id,
    });
  }
  const current = lsGet<Product[]>(LS.PRODUCTS) ?? [];
  lsSet(LS.PRODUCTS, current.map(p => (p.id === id ? product : p)));
}

export async function deleteProduct(
  isOnline: boolean,
  id: string
): Promise<void> {
  if (isOnline && supabase) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  } else {
    enqueue('DELETE_PRODUCT', 'products', {}, { column: 'id', value: id });
  }
  const current = lsGet<Product[]>(LS.PRODUCTS) ?? [];
  lsSet(LS.PRODUCTS, current.filter(p => p.id !== id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// VENDAS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchSales(isOnline: boolean): Promise<Sale[]> {
  if (isOnline && supabase) {
    // Buscar vendas
    const { data: salesData, error: salesErr } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });
    if (salesErr) throw salesErr;

    // Buscar itens de todas as vendas
    const { data: itemsData, error: itemsErr } = await supabase
      .from('sale_items')
      .select('*');
    if (itemsErr) throw itemsErr;

    // Buscar pagamentos de todas as vendas
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
          },
          quantity: i.quantity,
          notes: i.notes ?? '',
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
      };
    });

    lsSet(LS.SALES, sales);
    return sales;
  }

  return lsGet<Sale[]>(LS.SALES) ?? [];
}

export async function insertSale(
  isOnline: boolean,
  sale: Sale,
  cashSessionId: string | null
): Promise<void> {
  const saleRow = {
    id: sale.id,
    date: sale.date,
    total: sale.total,
    sold_by: sale.soldBy,
    cash_session_id: cashSessionId,
  };

  const itemRows = sale.items.map(item => ({
    sale_id: sale.id,
    product_id: item.product.id,
    product_name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    notes: item.notes ?? null,
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

  // Atualizar cache local
  const current = lsGet<Sale[]>(LS.SALES) ?? [];
  lsSet(LS.SALES, [sale, ...current]);
}

export async function deleteSales(isOnline: boolean): Promise<void> {
  if (isOnline && supabase) {
    // CASCADE apaga sale_items e sale_payments automaticamente
    const { error } = await supabase.from('sales').delete().neq('id', '');
    if (error) throw error;
  }
  lsSet(LS.SALES, []);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSÕES DE CAIXA
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchCashData(isOnline: boolean): Promise<{
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
  };

  if (isOnline && supabase) {
    // Buscar todas as sessões
    const { data: sessions, error: sessErr } = await supabase
      .from('cash_sessions')
      .select('*')
      .order('opened_at', { ascending: false });
    if (sessErr) throw sessErr;

    // Buscar todas as movimentações
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
          notes: s.notes ?? undefined,
          movements: sessionMovements,
        };
      });

    lsSet(LS.CASH_REGISTER, register);
    lsSet(LS.PAST_SESSIONS, pastSessions);

    return { register, pastSessions };
  }

  return {
    register: lsGet<CashRegister>(LS.CASH_REGISTER) ?? emptyRegister,
    pastSessions: lsGet<CashRegisterSession[]>(LS.PAST_SESSIONS) ?? [],
  };
}

export async function openCashSession(
  isOnline: boolean,
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
    notes: summary.notes ?? null,
  };

  if (isOnline && supabase) {
    const { error } = await supabase
      .from('cash_sessions')
      .update(update)
      .eq('id', sessionId);
    if (error) throw error;
  } else {
    enqueue('UPDATE_CASH_SESSION', 'cash_sessions', update as Record<string, unknown>, {
      column: 'id',
      value: sessionId,
    });
  }
}

export async function deleteAllCashSessions(isOnline: boolean): Promise<void> {
  if (isOnline && supabase) {
    await supabase.from('cash_sessions').delete().neq('id', '');
  }
  lsSet(LS.CASH_REGISTER, {
    id: null,
    isOpen: false,
    openedAt: null,
    openedBy: null,
    startingCash: 0,
    movements: [],
  });
  lsSet(LS.PAST_SESSIONS, []);
}
