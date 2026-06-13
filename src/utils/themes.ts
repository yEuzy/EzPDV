/**
 * themes.ts
 * Sistema de temas do EzPDV.
 * Define os tokens CSS de cada tema e aplica via CSS custom properties no :root.
 */

import type { ThemeId } from '../types';

// ─── Definição dos temas ──────────────────────────────────────────────────────

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  emoji: string;
  dark: boolean;
  vars: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'gelato',
    name: 'Gelato',
    emoji: '🍦',
    dark: false,
    vars: {
      '--primary':         '#ff6b8b',
      '--primary-hover':   '#ff4d73',
      '--primary-light':   '#ffebee',
      '--secondary':       '#ffd166',
      '--secondary-light': '#fff9e6',
      '--accent':          '#4cc9f0',
      '--accent-hover':    '#37b7de',
      '--accent-light':    '#eefcff',
      '--mint':            '#06d6a0',
      '--mint-light':      '#e6fbf5',
      '--bg-app':          '#fcf8f5',
      '--card-bg':         '#ffffff',
      '--text-dark':       '#2c2f3b',
      '--text-light':      '#7c8295',
      '--border-color':    '#f1eae4',
      '--danger':          '#ef476f',
      '--shadow-hover':    '0 20px 48px rgba(255, 107, 139, 0.15)',
      '--scrollbar-thumb': '#e0d5cd',
      '--scrollbar-hover': '#ccc1b7',
    },
  },
  {
    id: 'sky',
    name: 'Sky Blue',
    emoji: '🌤️',
    dark: true,
    vars: {
      '--primary':         '#38bdf8',
      '--primary-hover':   '#0ea5e9',
      '--primary-light':   'rgba(56, 189, 248, 0.12)',
      '--secondary':       '#818cf8',
      '--secondary-light': 'rgba(129, 140, 248, 0.12)',
      '--accent':          '#c084fc',
      '--accent-hover':    '#a855f7',
      '--accent-light':    'rgba(192, 132, 252, 0.12)',
      '--mint':            '#34d399',
      '--mint-light':      'rgba(52, 211, 153, 0.12)',
      '--bg-app':          '#0f1623',
      '--card-bg':         '#1a2235',
      '--text-dark':       '#e2e8f0',
      '--text-light':      '#7a8fa6',
      '--border-color':    '#243044',
      '--danger':          '#f87171',
      '--shadow-hover':    '0 20px 48px rgba(56, 189, 248, 0.15)',
      '--scrollbar-thumb': '#243044',
      '--scrollbar-hover': '#2e3f58',
    },
  },
  {
    id: 'forest',
    name: 'Floresta',
    emoji: '🌲',
    dark: true,
    vars: {
      '--primary':         '#22c55e',
      '--primary-hover':   '#16a34a',
      '--primary-light':   'rgba(34, 197, 94, 0.12)',
      '--secondary':       '#84cc16',
      '--secondary-light': 'rgba(132, 204, 22, 0.12)',
      '--accent':          '#facc15',
      '--accent-hover':    '#eab308',
      '--accent-light':    'rgba(250, 204, 21, 0.12)',
      '--mint':            '#06b6d4',
      '--mint-light':      'rgba(6, 182, 212, 0.12)',
      '--bg-app':          '#0a1109',
      '--card-bg':         '#111d0f',
      '--text-dark':       '#dcfce7',
      '--text-light':      '#6b8c6a',
      '--border-color':    '#1a2e18',
      '--danger':          '#f87171',
      '--shadow-hover':    '0 20px 48px rgba(34, 197, 94, 0.15)',
      '--scrollbar-thumb': '#1a2e18',
      '--scrollbar-hover': '#243d22',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    emoji: '🔥',
    dark: true,
    vars: {
      '--primary':         '#f97316',
      '--primary-hover':   '#ea580c',
      '--primary-light':   'rgba(249, 115, 22, 0.12)',
      '--secondary':       '#fbbf24',
      '--secondary-light': 'rgba(251, 191, 36, 0.12)',
      '--accent':          '#e879f9',
      '--accent-hover':    '#d946ef',
      '--accent-light':    'rgba(232, 121, 249, 0.12)',
      '--mint':            '#34d399',
      '--mint-light':      'rgba(52, 211, 153, 0.12)',
      '--bg-app':          '#130e0a',
      '--card-bg':         '#1c1511',
      '--text-dark':       '#fef3c7',
      '--text-light':      '#8c7560',
      '--border-color':    '#2c1e12',
      '--danger':          '#f87171',
      '--shadow-hover':    '0 20px 48px rgba(249, 115, 22, 0.15)',
      '--scrollbar-thumb': '#2c1e12',
      '--scrollbar-hover': '#3d2a1a',
    },
  },
];

// ─── Chave de persistência ────────────────────────────────────────────────────

const LS_THEME_KEY = (companyId: string) => `ezpdv_theme_${companyId}`;

// ─── Funções públicas ─────────────────────────────────────────────────────────

/** Retorna a definição completa de um tema pelo ID */
export function getTheme(themeId: ThemeId): ThemeDefinition {
  return THEMES.find(t => t.id === themeId) ?? THEMES[0];
}

/** Aplica um tema injetando as variáveis CSS no :root */
export function applyTheme(themeId: ThemeId): void {
  const theme = getTheme(themeId);
  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Marca o tema atual no atributo do HTML para estilos condicionais no CSS
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-dark', theme.dark ? 'true' : 'false');
}

/** Salva a preferência de tema de uma empresa no localStorage */
export function saveThemePreference(companyId: string, themeId: ThemeId): void {
  localStorage.setItem(LS_THEME_KEY(companyId), themeId);
}

/** Recupera a preferência de tema de uma empresa (ou usa o padrão da empresa) */
export function getStoredTheme(companyId: string, defaultTheme: ThemeId = 'gelato'): ThemeId {
  const stored = localStorage.getItem(LS_THEME_KEY(companyId));
  if (stored && THEMES.some(t => t.id === stored)) {
    return stored as ThemeId;
  }
  return defaultTheme;
}
