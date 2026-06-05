/**
 * offlineQueue.ts
 * Fila de operações pendentes realizadas offline.
 * Persiste no LocalStorage e sincroniza com o Supabase ao reconectar.
 */
import { supabase } from './supabaseClient';

const QUEUE_KEY = 'ezpdv_offline_queue_v2';

export type OperationType =
  | 'INSERT_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'INSERT_SALE'
  | 'INSERT_SALE_ITEMS'
  | 'INSERT_SALE_PAYMENTS'
  | 'INSERT_CASH_SESSION'
  | 'UPDATE_CASH_SESSION'
  | 'INSERT_CASH_MOVEMENT'
  | 'INSERT_OPERATOR'
  | 'UPDATE_OPERATOR'
  | 'DELETE_OPERATOR';

export interface QueuedOperation {
  id: string;
  type: OperationType;
  table: string;
  payload: Record<string, unknown> | Record<string, unknown>[];
  filter?: { column: string; value: unknown };
  createdAt: string;
  retries: number;
}

function getQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOperation[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Adiciona uma operação à fila offline */
export function enqueue(
  type: OperationType,
  table: string,
  payload: Record<string, unknown> | Record<string, unknown>[],
  filter?: { column: string; value: unknown }
): void {
  const queue = getQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    table,
    payload,
    filter,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
  saveQueue(queue);
}

/** Retorna quantas operações estão pendentes na fila */
export function getPendingCount(): number {
  return getQueue().length;
}

/** Limpa toda a fila (use com cautela) */
export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Tenta sincronizar todas as operações da fila com o Supabase.
 * Retorna o número de operações sincronizadas com sucesso.
 */
export async function syncQueue(): Promise<number> {
  if (!supabase) return 0;

  const queue = getQueue();
  if (queue.length === 0) return 0;

  let successCount = 0;
  const remaining: QueuedOperation[] = [];

  for (const op of queue) {
    try {
      let error: unknown = null;

      if (op.type.startsWith('INSERT_')) {
        const payload = op.payload;
        const result = await supabase
          .from(op.table)
          .insert(payload as Record<string, unknown> | Record<string, unknown>[]);
        error = result.error;
      } else if (op.type.startsWith('UPDATE_')) {
        if (!op.filter) { remaining.push(op); continue; }
        const result = await supabase
          .from(op.table)
          .update(op.payload as Record<string, unknown>)
          .eq(op.filter.column, op.filter.value);
        error = result.error;
      } else if (op.type.startsWith('DELETE_')) {
        if (!op.filter) { remaining.push(op); continue; }
        const result = await supabase
          .from(op.table)
          .delete()
          .eq(op.filter.column, op.filter.value);
        error = result.error;
      }

      if (error) throw error;
      successCount++;
    } catch (err) {
      console.warn(`[OfflineQueue] Falha ao sincronizar operação ${op.id}:`, err);
      op.retries++;
      // Descarta após 5 tentativas
      if (op.retries < 5) {
        remaining.push(op);
      } else {
        console.error(`[OfflineQueue] Descartando operação ${op.id} após 5 tentativas.`);
      }
    }
  }

  saveQueue(remaining);
  return successCount;
}
