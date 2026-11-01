import { useEffect, useState, type FormEvent } from 'react';
import { Check, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import type { DecoyProduct } from '@en-vrille/shared';
import { serverFetch } from './backend';
import { useI18n } from './i18n';

const blank = (): Omit<DecoyProduct, 'id'> => ({ name: '', description: '', category: 'inventions', keywords: [], nameEn: '', descriptionEn: '', tagline: '', taglineEn: '' });
export function ProductAdmin({ token }: { token: string }) {
  const { t, language } = useI18n();
  const [items, setItems] = useState<DecoyProduct[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<DecoyProduct>>(blank);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function call(path = '', method = 'GET', body?: unknown) {
    const response = await serverFetch(`/api/admin/decoys${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || t('admin.failed')); return data;
  }
  async function refresh() { try { setItems((await call()).items); } catch (error) { setMessage(error instanceof Error ? error.message : t('admin.failed')); } }
  useEffect(() => { void refresh(); }, [token]);
  const reset = () => { setSelected(null); setDraft(blank()); setConfirmDelete(false); };
  const change = (key: keyof DecoyProduct, value: string) => setDraft((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try { const body = { ...draft }; delete body.id; if (!body.tagline) delete body.tagline; if (!body.taglineEn) delete body.taglineEn; if (!body.nameEn) delete body.nameEn; if (!body.descriptionEn) delete body.descriptionEn; await call(selected ? `/${encodeURIComponent(selected)}` : '', selected ? 'PUT' : 'POST', body); await refresh(); reset(); setMessage(t('admin.saved')); } catch (error) { setMessage(error instanceof Error ? error.message : t('admin.failed')); } finally { setBusy(false); }
  };
  return <section className="product-admin"><div className="panel-heading"><div><h2>House Decoy</h2><p>{t('admin.decoyHelp')}</p></div><strong>{items.length}</strong></div>{message && <p role="status" className="admin-message">{message}</p>}<div className="admin-layout"><section className="panel"><label className="field-label">{t('admin.search')}<input value={filter} onChange={(event) => setFilter(event.target.value)}/></label><div className="admin-items">{items.filter((item) => `${item.name} ${item.nameEn || ''} ${item.category}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map((item) => <button type="button" className={selected === item.id ? 'selected' : ''} key={item.id} onClick={() => { setSelected(item.id); setDraft({ ...item }); setConfirmDelete(false); }}><small>{item.category}</small><strong>{language === 'en' && item.nameEn ? item.nameEn : item.name}</strong><span>{language === 'en' && item.descriptionEn ? item.descriptionEn : item.description}</span></button>)}</div></section><form className="panel admin-editor" onSubmit={submit}><div className="panel-heading"><h2>{t(selected ? 'admin.editProduct' : 'admin.newProduct')}</h2><button type="button" className="icon-button" aria-label={t('admin.newProduct')} onClick={reset}><Plus size={20}/></button></div>{(['name', 'description', 'nameEn', 'descriptionEn', 'tagline', 'taglineEn', 'category'] as const).map((key) => <label className="field-label" key={key}>{t(`admin.${key}`)}{key === 'description' || key === 'descriptionEn' ? <textarea required={key === 'description'} maxLength={220} rows={3} value={draft[key] || ''} onChange={(event) => change(key, event.target.value)}/> : <input required={key === 'name' || key === 'category'} maxLength={key === 'name' || key === 'nameEn' ? 70 : key === 'category' ? 60 : 160} value={draft[key] || ''} onChange={(event) => change(key, event.target.value)}/>}</label>)}<label className="field-label">{t('admin.keywords')}<input value={(draft.keywords || []).join(', ')} onChange={(event) => setDraft((previous) => ({ ...previous, keywords: event.target.value.split(',').map((word) => word.trim()).filter(Boolean).slice(0, 12) }))}/></label><button disabled={busy} className="button primary full">{busy ? <LoaderCircle className="spin" size={18}/> : <Check size={18}/>} {t('common.save')}</button>{selected && <>{confirmDelete ? <div className="decoy-confirm"><p>{t('admin.deleteConfirm')}</p><button type="button" className="button primary" disabled={busy} onClick={() => { setBusy(true); void call(`/${encodeURIComponent(selected)}`, 'DELETE').then(refresh).then(() => { reset(); setMessage(t('admin.deleted')); }).catch((error) => setMessage(error.message)).finally(() => setBusy(false)); }}>{t('admin.delete')}</button><button type="button" className="button outline" onClick={() => setConfirmDelete(false)}>{t('common.back')}</button></div> : <button type="button" className="button outline full danger" onClick={() => setConfirmDelete(true)}><Trash2 size={18}/>{t('admin.delete')}</button>}</>}</form></div></section>;
}
