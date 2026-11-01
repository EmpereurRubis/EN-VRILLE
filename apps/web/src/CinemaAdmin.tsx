import { useEffect, useState } from 'react';
import type { CinemaRights, CinemaScene } from '@en-vrille/shared';
import { serverFetch, serverResource } from './backend';
import { useI18n } from './i18n';
import messages from './i18n/cinema-admin.json';
import './cinemaAdmin.css';

const emptyRights = (): CinemaRights => ({ title: '', sourceUrl: '', license: '', licenseUrl: '', territories: ['worldwide'], credits: '', verifiedAt: new Date().toISOString().slice(0, 10), commercialUse: true });
export function CinemaAdmin({ token }: { token: string }) {
  const { language } = useI18n();
  const text = (key: keyof typeof messages.fr) => messages[language][key];
  const [items, setItems] = useState<CinemaScene[]>([]);
  const [scene, setScene] = useState<CinemaScene | null>(null);
  const [existing, setExisting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [source, setSource] = useState<{ sourceId: string; duration: number }>();
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(24);
  const [count, setCount] = useState(12);
  const [timecodes, setTimecodes] = useState('');
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cinema');
  const [rights, setRights] = useState<CinemaRights>(emptyRights);
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const headers = { Authorization: `Bearer ${token}` };
  const request = async (path: string, body?: unknown, method = 'POST') => {
    const response = await serverFetch(`/api/admin/cinema${path}`, { method, headers: { ...headers, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || text('error'));
    return data;
  };
  const refresh = async () => { const data = await request('', undefined, 'GET'); setItems(data.items); };
  useEffect(() => { let alive = true; serverFetch('/api/admin/cinema', { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); if (alive) setItems(data.items); }).catch((error: Error) => { if (alive) setNotice(error.message); }); return () => { alive = false; }; }, [token]);
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const run = async (operation: () => Promise<void>) => { setBusy(true); setNotice(''); try { await operation(); } catch (error) { setNotice(error instanceof Error ? error.message : text('error')); } finally { setBusy(false); } };
  const edit = (item: CinemaScene) => { setScene(structuredClone(item)); setTitle(item.title); setCategory(item.category); setRights(structuredClone(item.rights)); setAttest(false); setExisting(true); setCreating(false); setSource(undefined); setFile(undefined); setNotice(''); };
  const newClip = () => { setCreating(true); setExisting(false); setScene(null); setSource(undefined); setFile(undefined); setTitle(''); setRights(emptyRights()); setAttest(false); setNotice(''); };
  const upload = () => run(async () => {
    if (!file) return;
    const response = await serverFetch('/api/admin/cinema/video', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/octet-stream' }, body: file });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || text('error'));
    setSource(data); setEnd(Math.min(24, data.duration)); setNotice(text('uploaded'));
  });
  const extract = () => run(async () => {
    if (!source) return;
    const data = await request('/extract', { sourceId: source.sourceId, title, category, start, end, count, ...(timecodes.trim() ? { timecodes: timecodes.split(',').map((value) => Number(value.trim())) } : {}), subtitlePosition: position, rights });
    setScene(data.item); setExisting(false);
  });
  const save = () => run(async () => {
    if (!scene || !attest) return;
    await request(existing ? `/${scene.id}` : '', { ...scene, title, category, rights }, existing ? 'PUT' : 'POST');
    await refresh(); setExisting(true); setNotice(text('saved'));
  });
  const updateRights = <K extends keyof CinemaRights>(key: K, value: CinemaRights[K]) => { setRights((previous) => ({ ...previous, [key]: value })); setAttest(false); };
  const field = (label: string, value: string, change: (value: string) => void, type = 'text', required = true) => <label>{label}<input type={type} value={value} onChange={(event) => change(event.target.value)} required={required} /></label>;
  return <section className="cinema-admin">
    <div className="cinema-admin-heading"><div><h3>{text('title')}</h3><p>{text('intro')}</p></div><button type="button" onClick={newClip}>{text('new')}</button></div>
    {notice && <p role="status" className="cinema-admin-notice">{notice}</p>}
    <div className="cinema-admin-library" aria-label={text('library')}>{items.map((item) => <button type="button" key={item.id} onClick={() => edit(item)} className={scene?.id === item.id ? 'selected' : ''}><img src={serverResource(item.frames[0]!.url)} alt="" loading="lazy" /><strong>{item.title}</strong><small>{item.frames.length} · {item.rights.license}</small><span>{text('edit')}</span></button>)}</div>
    {(creating || scene) && <form onSubmit={(event) => { event.preventDefault(); if (scene) void save(); else void extract(); }}>
      <div className="cinema-admin-heading"><h4>{existing ? text('edit') : text('new')}</h4><button type="button" onClick={() => { setScene(null); setCreating(false); }}>{text('cancel')}</button></div>
      {creating && <fieldset disabled={busy}><legend>{text('video')}</legend><input type="file" accept="video/mp4,video/webm" aria-label={text('video')} onChange={(event) => { setFile(event.target.files?.[0]); setSource(undefined); setScene(null); }} />{preview && <video controls src={preview} preload="metadata" />}
        <button type="button" disabled={!file || busy || !!source} onClick={upload}>{text('upload')}</button>
        {source && <><p>{text('duration')}: {source.duration.toFixed(2)} s</p><div className="cinema-admin-fields"><label>{text('start')}<input type="number" min={0} max={source.duration} step="0.1" value={start} onChange={(event) => { setStart(Number(event.target.value)); setScene(null); }} /></label><label>{text('end')}<input type="number" min={start + 1} max={Math.min(source.duration, start + 90)} step="0.1" value={end} onChange={(event) => { setEnd(Number(event.target.value)); setScene(null); }} /></label><label>{text('count')}<input type="number" min={2} max={12} value={count} onChange={(event) => { setCount(Number(event.target.value)); setScene(null); }} /></label><label>{text('position')}<select value={position} onChange={(event) => { setPosition(event.target.value as 'top' | 'bottom'); setScene(null); }}><option value="bottom">{text('bottom')}</option><option value="top">{text('top')}</option></select></label></div>{field(text('timecodes'), timecodes, (value) => { setTimecodes(value); setScene(null); }, 'text', false)}<small>{text('timecodesHint')}</small><p>{text('silent')}</p></>}
      </fieldset>}
      <div className="cinema-admin-fields">{field(text('sceneTitle'), title, setTitle)}{field(text('category'), category, setCategory)}</div>
      <fieldset disabled={busy}><legend>{text('rights')}</legend><p>{text('rightsHint')}</p><div className="cinema-admin-fields">{field(text('work'), rights.title, (value) => updateRights('title', value))}{field(text('source'), rights.sourceUrl, (value) => updateRights('sourceUrl', value), 'url')}{field(text('license'), rights.license, (value) => updateRights('license', value))}{field(text('licenseUrl'), rights.licenseUrl, (value) => updateRights('licenseUrl', value), 'url')}{field(text('territories'), rights.territories.join(', '), (value) => updateRights('territories', value.split(',').map((entry) => entry.trim())))}{field(text('date'), rights.verifiedAt, (value) => updateRights('verifiedAt', value), 'date')}</div><label>{text('credits')}<textarea required minLength={10} maxLength={3000} value={rights.credits} onChange={(event) => updateRights('credits', event.target.value)} /></label><label className="cinema-admin-attestation"><input type="checkbox" checked={attest} required onChange={(event) => setAttest(event.target.checked)} />{text('attest')}</label></fieldset>
      {creating && source && <button type="button" disabled={busy || !attest || !title || !rights.credits || !rights.licenseUrl} onClick={extract}>{busy ? text('loading') : text('extract')}</button>}
      {scene && <><h4>{text('preview')}</h4><video controls muted src={serverResource(scene.clipUrl)} preload="metadata" /><div className="cinema-admin-frames">{scene.frames.map((frame, index) => <label key={frame.url}><img src={serverResource(frame.url)} alt={`${text('frame')} ${index + 1}`} /><span>{(frame.timecodeMs / 1000).toFixed(2)} s</span><select aria-label={`${text('position')} ${index + 1}`} value={frame.subtitlePosition} onChange={(event) => setScene({ ...scene, frames: scene.frames.map((item, i) => i === index ? { ...item, subtitlePosition: event.target.value as 'top' | 'bottom' } : item) })}><option value="bottom">{text('bottom')}</option><option value="top">{text('top')}</option></select></label>)}</div><div className="cinema-admin-actions"><button type="submit" disabled={busy || !attest}>{busy ? text('loading') : existing ? text('save') : text('publish')}</button>{existing && <button type="button" disabled={busy} onClick={() => { if (confirm(text('deleteConfirm'))) void run(async () => { await request(`/${scene.id}`, undefined, 'DELETE'); await refresh(); setScene(null); setCreating(false); setNotice(text('removed')); }); }}>{text('delete')}</button>}</div></>}
    </form>}
  </section>;
}
