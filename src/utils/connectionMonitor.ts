/**
 * connectionMonitor.ts
 * Hook e utilitário para monitorar o status de conexão com o Supabase.
 * Usa navigator.onLine + eventos online/offline + ping periódico ao DB.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Intervalo de ping quando online (ms)
const PING_INTERVAL_ONLINE = 30_000;
// Intervalo de ping quando offline (tenta reconectar mais rápido)
const PING_INTERVAL_OFFLINE = 10_000;

async function pingDatabase(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1)
      .maybeSingle();
    return !error;
  } catch {
    return false;
  }
}

/**
 * Hook que retorna o status de conexão com o banco de dados.
 * - `isOnline`: true = Supabase acessível
 * - `isChecking`: true = verificação em andamento
 * - `checkNow()`: força uma verificação imediata
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsChecking(true);

    // Primeiro verifica navigator.onLine para não desperdiçar request
    if (!navigator.onLine) {
      if (mountedRef.current) {
        setIsOnline(false);
        setIsChecking(false);
      }
      return;
    }

    const result = await pingDatabase();
    if (mountedRef.current) {
      setIsOnline(result);
      setIsChecking(false);
    }
  }, []);

  const scheduleNext = useCallback((currentlyOnline: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      check().then(() => {
        // A próxima iteração será agendada pelo efeito que observa `isOnline`
      });
    }, currentlyOnline ? PING_INTERVAL_ONLINE : PING_INTERVAL_OFFLINE);
  }, [check]);

  // Verificação inicial
  useEffect(() => {
    mountedRef.current = true;
    check();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [check]);

  // Agendar próxima verificação quando o status muda
  useEffect(() => {
    if (!isChecking) {
      scheduleNext(isOnline);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOnline, isChecking, scheduleNext]);

  // Eventos nativos do browser
  useEffect(() => {
    const handleOnline = () => check();
    const handleOffline = () => {
      setIsOnline(false);
      setIsChecking(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [check]);

  return { isOnline, isChecking, checkNow: check };
}
