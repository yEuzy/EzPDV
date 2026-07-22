import React, { useState, useEffect, useRef } from 'react';
import type { Company, Operator, ThemeId } from '../types';
import { THEMES } from '../utils/themes';
import * as DB from '../utils/db';
import {
  X, Plus, Pencil, Trash2, Building2, Lock, CheckCircle2,
  AlertCircle, Loader2, Save, Eye, EyeOff, Users, ArrowLeft,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MasterAdminPanelProps {
  onClose: () => void;
}

type PanelView = 'auth' | 'companies' | 'company-form' | 'operators' | 'operator-form';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

// ─── Estilos reutilizáveis ────────────────────────────────────────────────────

const S = {
  input: {
    width: '100%', padding: '12px 14px', boxSizing: 'border-box' as const,
    background: '#0f1623', border: '1px solid #243044', borderRadius: '10px',
    color: '#e2e8f0', fontSize: '14px', outline: 'none',
  },
  label: {
    display: 'block', fontSize: '12px', fontWeight: 700, color: '#7a8fa6',
    marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  btn: (variant: 'primary' | 'ghost' | 'danger' = 'ghost') => ({
    padding: '12px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '14px',
    cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px',
    ...(variant === 'primary' ? { background: '#38bdf8', color: '#0f1623' }
      : variant === 'danger'  ? { background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }
      : { background: '#0f1623', border: '1px solid #243044', color: '#7a8fa6' }),
  }),
};

// ─── Componente ───────────────────────────────────────────────────────────────

export const MasterAdminPanel: React.FC<MasterAdminPanelProps> = ({ onClose }) => {
  const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD || 'master123';

  const [view, setView] = useState<PanelView>('auth');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);

  const passwordRef = useRef<HTMLInputElement>(null);

  // ─── Forms ───────────────────────────────────────────────────────────────────
  const emptyCompanyForm: Omit<Company, 'created_at'> = { id: '', name: '', tagline: '', theme_id: 'gelato', icon: 'Store' };
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);

  const emptyOpForm = { id: '', name: '', role: 'operator' as Operator['role'], pin: '' };
  const [opForm, setOpForm] = useState(emptyOpForm);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (view === 'auth') passwordRef.current?.focus();
  }, [view]);

  // ─── Auth ─────────────────────────────────────────────────────────────────────
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === MASTER_PASSWORD) {
      setView('companies');
      loadCompanies();
    } else {
      setAuthError('Senha incorreta.');
      setPassword('');
    }
  };

  // ─── Empresas ─────────────────────────────────────────────────────────────────
  const loadCompanies = async () => {
    setLoading(true);
    try {
      setCompanies(await DB.fetchAllCompanies());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const openCreateCompany = () => {
    setCompanyForm(emptyCompanyForm);
    setEditingCompany(null);
    setView('company-form');
  };

  const openEditCompany = (c: Company) => {
    setCompanyForm({ id: c.id, name: c.name, tagline: c.tagline, theme_id: c.theme_id, icon: c.icon });
    setEditingCompany(c);
    setView('company-form');
  };

  const handleDeleteCompany = async (id: string) => {
    if (deletingId !== id) { setDeletingId(id); return; }
    try { await DB.deleteCompany(id); setCompanies(p => p.filter(c => c.id !== id)); showSuccess('Empresa excluída.'); }
    catch (e: any) { setError(e.message); }
    finally { setDeletingId(null); }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim() || !companyForm.id.trim()) { setError('Nome e ID são obrigatórios.'); return; }
    setLoading(true); setError('');
    try {
      if (editingCompany) {
        await DB.updateCompany(companyForm as Company);
        setCompanies(p => p.map(c => c.id === companyForm.id ? companyForm as Company : c));
        showSuccess('Empresa atualizada!');
      } else {
        await DB.addCompany(companyForm as Company);
        setCompanies(p => [...p, companyForm as Company]);
        showSuccess('Empresa criada!');
      }
      setView('companies');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ─── Operadores ───────────────────────────────────────────────────────────────
  const openOperators = async (company: Company) => {
    setSelectedCompany(company);
    setLoading(true);
    try {
      const ops = await DB.fetchOperators(true, company.id);
      setOperators(ops);
      setView('operators');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const openCreateOperator = () => {
    setOpForm({ id: `op-${generateId()}`, name: '', role: 'operator', pin: '' });
    setEditingOperator(null);
    setView('operator-form');
  };

  const openEditOperator = (op: Operator) => {
    setOpForm({ id: op.id, name: op.name, role: op.role, pin: op.pin });
    setEditingOperator(op);
    setView('operator-form');
  };

  const handleDeleteOperator = async (id: string) => {
    if (deletingId !== id) { setDeletingId(id); return; }
    if (!selectedCompany) return;
    try {
      await DB.deleteOperator(true, selectedCompany.id, id);
      setOperators(p => p.filter(o => o.id !== id));
      showSuccess('Operador excluído.');
    } catch (e: any) { setError(e.message); }
    finally { setDeletingId(null); }
  };

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opForm.name.trim()) { setError('Nome é obrigatório.'); return; }
    if (opForm.pin.length !== 4 || !/^\d{4}$/.test(opForm.pin)) { setError('PIN deve ter exatamente 4 dígitos numéricos.'); return; }
    if (!selectedCompany) return;
    setLoading(true); setError('');
    try {
      const op: Operator = { ...opForm, company_id: selectedCompany.id };
      if (editingOperator) {
        await DB.updateOperator(true, selectedCompany.id, op);
        setOperators(p => p.map(o => o.id === op.id ? op : o));
        showSuccess('Operador atualizado!');
      } else {
        await DB.addOperator(true, selectedCompany.id, op);
        setOperators(p => [...p, op]);
        showSuccess('Operador criado!');
      }
      setView('operators');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  // ─── Header label ─────────────────────────────────────────────────────────────
  const headerTitle = {
    auth: 'Acesso Master',
    companies: 'Admin do Sistema',
    'company-form': editingCompany ? 'Editar Empresa' : 'Nova Empresa',
    operators: `Operadores — ${selectedCompany?.name ?? ''}`,
    'operator-form': editingOperator ? 'Editar Operador' : 'Novo Operador',
  }[view];

  const canGoBack = view !== 'auth' && view !== 'companies';
  const handleBack = () => {
    if (view === 'company-form') setView('companies');
    else if (view === 'operators') { setView('companies'); setSelectedCompany(null); }
    else if (view === 'operator-form') setView('operators');
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const selectedTheme = THEMES.find(t => t.id === companyForm.theme_id)!;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#1a2235', color: '#e2e8f0',
        borderRadius: '20px', width: '100%', maxWidth: '560px',
        maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        border: '1px solid #243044',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #243044',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#0f1623',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {canGoBack && (
              <button onClick={handleBack} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid #243044',
                borderRadius: '8px', width: '30px', height: '30px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#7a8fa6',
              }}><ArrowLeft size={14} /></button>
            )}
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px',
              background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {view === 'operators' || view === 'operator-form'
                ? <Users size={16} color="#38bdf8" />
                : <Building2 size={16} color="#38bdf8" />}
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#e2e8f0', display: 'block' }}>
                {headerTitle}
              </span>
              {view === 'companies' && (
                <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                  {companies.length} empresa{companies.length !== 1 ? 's' : ''}
                </span>
              )}
              {view === 'operators' && (
                <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                  {operators.length} operador{operators.length !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid #243044',
            borderRadius: '8px', width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#7a8fa6',
          }}><X size={14} /></button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>

          {/* Mensagens */}
          {successMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '10px', marginBottom: '14px', color: '#34d399', fontSize: '13px', fontWeight: 600 }}>
              <CheckCircle2 size={15} />{successMsg}
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', marginBottom: '14px', color: '#f87171', fontSize: '13px', fontWeight: 600 }}>
              <AlertCircle size={15} />{error}
              <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><X size={13} /></button>
            </div>
          )}

          {/* ══ AUTH ══════════════════════════════════════════════════════════ */}
          {view === 'auth' && (
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(56,189,248,0.1)', border: '2px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Lock size={24} color="#38bdf8" />
                </div>
                <p style={{ color: '#7a8fa6', fontSize: '13px', lineHeight: 1.5 }}>
                  Acesso restrito ao administrador do sistema.<br />Digite a senha mestra para continuar.
                </p>
              </div>
              {authError && (
                <div style={{ padding: '10px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', textAlign: 'center' }}>
                  {authError}
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setAuthError(''); }}
                  placeholder="Senha mestra"
                  style={{ ...S.input, paddingRight: '44px' }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#7a8fa6', cursor: 'pointer',
                }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="submit" disabled={!password} style={{
                ...S.btn('primary'), width: '100%', padding: '13px',
                opacity: password ? 1 : 0.5, cursor: password ? 'pointer' : 'not-allowed',
              }}>
                Entrar
              </button>
            </form>
          )}

          {/* ══ LISTA DE EMPRESAS ════════════════════════════════════════════ */}
          {view === 'companies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={openCreateCompany} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px', background: 'rgba(56,189,248,0.08)', border: '1px dashed rgba(56,189,248,0.35)',
                borderRadius: '12px', color: '#38bdf8', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              }}>
                <Plus size={16} /> Nova Empresa
              </button>

              {loading && <div style={{ textAlign: 'center', padding: '28px', color: '#7a8fa6' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />Carregando…</div>}

              {!loading && companies.length === 0 && (
                <div style={{ textAlign: 'center', padding: '28px', color: '#7a8fa6' }}>
                  <Building2 size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                  Nenhuma empresa cadastrada.
                </div>
              )}

              {companies.map(company => {
                const theme = THEMES.find(t => t.id === company.theme_id)!;
                return (
                  <div key={company.id} style={{
                    background: '#0f1623', border: '1px solid #243044', borderRadius: '12px',
                    padding: '14px', display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                      background: `${theme.vars['--primary']}20`, border: `1px solid ${theme.vars['--primary']}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                    }}>{theme.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: theme.vars['--primary'] }}>{company.name}</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa6' }}>{company.tagline}</div>
                      <div style={{ fontSize: '10px', color: '#3d5270', fontFamily: 'monospace', marginTop: '1px' }}>{company.id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {/* Gerenciar operadores */}
                      <button onClick={() => openOperators(company)} title="Gerenciar Operadores" style={{
                        width: '30px', height: '30px', borderRadius: '7px',
                        background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)',
                        color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Users size={13} /></button>
                      {/* Editar empresa */}
                      <button onClick={() => openEditCompany(company)} title="Editar" style={{
                        width: '30px', height: '30px', borderRadius: '7px',
                        background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                        color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Pencil size={13} /></button>
                      {/* Excluir empresa */}
                      <button onClick={() => handleDeleteCompany(company.id)} title={deletingId === company.id ? 'Confirmar exclusão' : 'Excluir'} style={{
                        width: '30px', height: '30px', borderRadius: '7px',
                        background: deletingId === company.id ? 'rgba(248,113,113,0.25)' : 'rgba(248,113,113,0.05)',
                        border: `1px solid ${deletingId === company.id ? 'rgba(248,113,113,0.5)' : 'rgba(248,113,113,0.15)'}`,
                        color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 800,
                      }}>{deletingId === company.id ? '!' : <Trash2 size={13} />}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ FORM EMPRESA ══════════════════════════════════════════════════ */}
          {view === 'company-form' && (
            <form onSubmit={handleSaveCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Preview */}
              <div style={{
                padding: '14px', borderRadius: '12px',
                background: `${selectedTheme.vars['--primary']}12`,
                border: `1px solid ${selectedTheme.vars['--primary']}30`,
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '26px' }}>{selectedTheme.emoji}</span>
                <div style={{ fontSize: '11px', color: selectedTheme.vars['--primary'], fontWeight: 700, marginTop: '4px' }}>
                  Tema: {selectedTheme.name}
                </div>
              </div>

              <div>
                <label style={S.label}>ID da Empresa {editingCompany && <span style={{ color: '#f87171' }}>(fixo)</span>}</label>
                <input value={companyForm.id}
                  onChange={e => !editingCompany && setCompanyForm(p => ({ ...p, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  readOnly={!!editingCompany}
                  placeholder="ex: gelateria-bella"
                  style={{ ...S.input, fontFamily: 'monospace', ...(editingCompany ? { color: '#3d5270', background: '#090d14' } : {}) }}
                />
                <p style={{ fontSize: '11px', color: '#3d5270', marginTop: '3px' }}>
                  Use no <code style={{ color: '#38bdf8' }}>VITE_COMPANY_ID</code> do .env de cada instalação.
                </p>
              </div>

              <div>
                <label style={S.label}>Nome da Empresa</label>
                <input value={companyForm.name}
                  onChange={e => {
                    const name = e.target.value;
                    setCompanyForm(p => ({ ...p, name, id: editingCompany ? p.id : generateSlug(name) }));
                  }}
                  placeholder="ex: Gelateria Bella"
                  style={S.input} />
              </div>

              <div>
                <label style={S.label}>Tagline</label>
                <input value={companyForm.tagline}
                  onChange={e => setCompanyForm(p => ({ ...p, tagline: e.target.value }))}
                  placeholder="ex: Loja Centro"
                  style={S.input} />
              </div>

              <div>
                <label style={S.label}>Tema de Cores</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {THEMES.map(theme => (
                    <button key={theme.id} type="button"
                      onClick={() => setCompanyForm(p => ({ ...p, theme_id: theme.id as ThemeId }))}
                      style={{
                        padding: '11px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                        background: companyForm.theme_id === theme.id ? `${theme.vars['--primary']}18` : '#0f1623',
                        border: companyForm.theme_id === theme.id ? `2px solid ${theme.vars['--primary']}` : '1px solid #243044',
                        display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                      <span style={{ fontSize: '18px' }}>{theme.emoji}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: theme.vars['--primary'] }}>{theme.name}</div>
                        <div style={{ fontSize: '10px', color: '#3d5270' }}>{theme.dark ? 'Dark' : 'Light'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button type="button" onClick={handleBack} style={{ ...S.btn(), flex: 1 }}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ ...S.btn('primary'), flex: 2, opacity: loading ? 0.7 : 1 }}>
                  {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                  {editingCompany ? 'Salvar' : 'Criar Empresa'}
                </button>
              </div>
            </form>
          )}

          {/* ══ LISTA DE OPERADORES ═══════════════════════════════════════════ */}
          {view === 'operators' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={openCreateOperator} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px', background: 'rgba(129,140,248,0.08)', border: '1px dashed rgba(129,140,248,0.35)',
                borderRadius: '12px', color: '#818cf8', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              }}>
                <Plus size={16} /> Novo Operador
              </button>

              {loading && <div style={{ textAlign: 'center', padding: '28px', color: '#7a8fa6' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />Carregando…</div>}

              {!loading && operators.length === 0 && (
                <div style={{ textAlign: 'center', padding: '28px', color: '#7a8fa6' }}>
                  <Users size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                  Nenhum operador cadastrado.
                </div>
              )}

              {operators.map(op => (
                <div key={op.id} style={{
                  background: '#0f1623', border: '1px solid #243044', borderRadius: '12px',
                  padding: '14px', display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                    background: op.role === 'admin' ? 'rgba(56,189,248,0.12)' : 'rgba(129,140,248,0.12)',
                    border: `1px solid ${op.role === 'admin' ? 'rgba(56,189,248,0.3)' : 'rgba(129,140,248,0.3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px',
                  }}>
                    {op.role === 'admin' ? '👑' : '👤'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: op.role === 'admin' ? '#38bdf8' : '#818cf8' }}>{op.name}</div>
                    <div style={{ fontSize: '11px', color: '#7a8fa6' }}>{op.role === 'admin' ? 'Admin' : 'Operador'} · PIN: {'•'.repeat(op.pin.length)}</div>
                    <div style={{ fontSize: '10px', color: '#3d5270', fontFamily: 'monospace', marginTop: '1px' }}>{op.id}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => openEditOperator(op)} style={{
                      width: '30px', height: '30px', borderRadius: '7px',
                      background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                      color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Pencil size={13} /></button>
                    <button onClick={() => handleDeleteOperator(op.id)} style={{
                      width: '30px', height: '30px', borderRadius: '7px',
                      background: deletingId === op.id ? 'rgba(248,113,113,0.25)' : 'rgba(248,113,113,0.05)',
                      border: `1px solid ${deletingId === op.id ? 'rgba(248,113,113,0.5)' : 'rgba(248,113,113,0.15)'}`,
                      color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 800,
                    }}>{deletingId === op.id ? '!' : <Trash2 size={13} />}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ FORM OPERADOR ═════════════════════════════════════════════════ */}
          {view === 'operator-form' && (
            <form onSubmit={handleSaveOperator} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={S.label}>Nome do Operador</label>
                <input value={opForm.name}
                  onChange={e => setOpForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="ex: Maria Silva"
                  autoFocus
                  style={S.input} />
              </div>

              <div>
                <label style={S.label}>Função</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['operator', 'admin'] as const).map(role => (
                    <button key={role} type="button"
                      onClick={() => setOpForm(p => ({ ...p, role }))}
                      style={{
                        padding: '12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                        background: opForm.role === role ? (role === 'admin' ? 'rgba(56,189,248,0.18)' : 'rgba(129,140,248,0.18)') : '#0f1623',
                        border: opForm.role === role ? `2px solid ${role === 'admin' ? '#38bdf8' : '#818cf8'}` : '1px solid #243044',
                      }}>
                      <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>
                        {role === 'admin' ? '👑' : '👤'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: opForm.role === role ? (role === 'admin' ? '#38bdf8' : '#818cf8') : '#7a8fa6' }}>
                        {role === 'admin' ? 'Admin' : 'Operador'}
                      </span>
                      <div style={{ fontSize: '10px', color: '#3d5270', marginTop: '2px' }}>
                        {role === 'admin' ? 'Acesso total' : 'Apenas POS'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={S.label}>PIN (4 dígitos)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    value={opForm.pin}
                    onChange={e => setOpForm(p => ({ ...p, pin: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
                    placeholder="••••"
                    style={{ ...S.input, paddingRight: '44px', letterSpacing: '8px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}
                  />
                  <button type="button" onClick={() => setShowPin(p => !p)} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#7a8fa6', cursor: 'pointer',
                  }}>
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button type="button" onClick={handleBack} style={{ ...S.btn(), flex: 1 }}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ ...S.btn('primary'), flex: 2, opacity: loading ? 0.7 : 1 }}>
                  {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                  {editingOperator ? 'Salvar' : 'Criar Operador'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterAdminPanel;
