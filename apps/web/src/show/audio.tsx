import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ShowPreferences {
  master: number; music: number; voice: number; sfx: number;
  musicEnabled: boolean; voiceEnabled: boolean; sfxEnabled: boolean;
  subtitles: boolean; textSpeed: 'slow' | 'normal' | 'fast'; reducedMotion: boolean;
}
const defaults: ShowPreferences = { master: .65, music: .25, voice: .8, sfx: .55, musicEnabled: false, voiceEnabled: false, sfxEnabled: true, subtitles: true, textSpeed: 'normal', reducedMotion: false };
const preferenceKey = 'vrille-show-preferences';
function stored(): ShowPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(preferenceKey) || '{}');
    const result = { ...defaults };
    for (const key of ['master', 'music', 'voice', 'sfx'] as const) if (typeof value[key] === 'number') result[key] = Math.max(0, Math.min(1, value[key]));
    for (const key of ['musicEnabled', 'voiceEnabled', 'sfxEnabled', 'subtitles', 'reducedMotion'] as const) if (typeof value[key] === 'boolean') result[key] = value[key];
    if (['slow', 'normal', 'fast'].includes(value.textSpeed)) result.textSpeed = value.textSpeed;
    return result;
  } catch { return defaults; }
}
type Cue = 'confirm' | 'reveal' | 'round' | 'win' | 'tick';
interface ShowContextValue {
  preferences: ShowPreferences; updatePreferences: (patch: Partial<ShowPreferences>) => void;
  reducedMotion: boolean; unlocked: boolean; voiceAvailable: boolean;
  cue: (cue: Cue) => void;
  speak: (text: string, recordedUrl?: string) => void;
  stopVoice: () => void;
}
const Context = createContext<ShowContextValue | null>(null);
export function useShowPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('ShowProvider est requis pour cette interface.');
  return value;
}
export function ShowProvider({ children, reducedMotion = false }: { children: ReactNode; reducedMotion?: boolean }) {
  const [preferences, setPreferences] = useState(stored);
  const [unlocked, setUnlocked] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const recording = useRef<HTMLAudioElement | null>(null);
  const prefs = useRef(preferences); prefs.current = preferences;
  const getContext = useCallback(() => {
    try { if (!context.current || context.current.state === 'closed') context.current = new AudioContext(); return context.current; } catch { return null; }
  }, []);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(query.matches); update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const unlock = () => { setUnlocked(true); void getContext()?.resume().catch(() => {}); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    const refreshVoices = () => setVoiceAvailable('speechSynthesis' in window && speechSynthesis.getVoices().some(v => v.lang.toLowerCase().startsWith('fr')));
    refreshVoices();
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); if ('speechSynthesis' in window) speechSynthesis.removeEventListener('voiceschanged', refreshVoices); };
  }, [getContext]);
  useEffect(() => {
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch { /* Storage can be disabled. */ }
  }, [preferences]);
  const stopVoice = useCallback(() => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    recording.current?.pause(); recording.current = null;
  }, []);
  const cue = useCallback((kind: Cue) => {
    const p = prefs.current;
    if (!unlocked || !p.sfxEnabled || document.hidden) return;
    const ac = getContext(); if (!ac || ac.state !== 'running') return;
    const notes: Record<Cue, number[]> = { confirm: [523, 659], reveal: [294, 440, 587], round: [220, 330, 440, 660], win: [392, 494, 587, 784], tick: [880] };
    notes[kind].forEach((frequency, index) => {
      const oscillator = ac.createOscillator(), gain = ac.createGain(), start = ac.currentTime + index * .095;
      oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(p.master * p.sfx * .12, start + .012); gain.gain.exponentialRampToValueAtTime(.0001, start + .2);
      oscillator.connect(gain); gain.connect(ac.destination); oscillator.start(start); oscillator.stop(start + .23);
    });
  }, [unlocked, getContext]);
  const speak = useCallback((text: string, recordedUrl?: string) => {
    stopVoice(); const p = prefs.current;
    if (!unlocked || !p.voiceEnabled || !p.master || !p.voice || document.hidden) return;
    const synthesized = () => {
      if (!('speechSynthesis' in window)) return;
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.toLowerCase() === 'fr-fr') || voices.find(v => v.lang.toLowerCase().startsWith('fr'));
      if (!voice) return;
      const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'fr-FR'; utterance.voice = voice;
      utterance.volume = p.master * p.voice; utterance.rate = p.textSpeed === 'slow' ? .86 : p.textSpeed === 'fast' ? 1.2 : 1.02;
      speechSynthesis.speak(utterance);
    };
    if (recordedUrl) {
      const track = new Audio(recordedUrl); track.volume = p.master * p.voice; recording.current = track;
      track.onerror = synthesized; void track.play().catch(synthesized);
    } else synthesized();
  }, [stopVoice, unlocked]);
  useEffect(() => {
    if (!preferences.voiceEnabled) stopVoice();
  }, [preferences.voiceEnabled, stopVoice]);
  useEffect(() => {
    if (!unlocked || !preferences.musicEnabled || !preferences.master || !preferences.music) return;
    const ac = getContext(); if (!ac) return;
    let index = 0;
    const melody = [110, 0, 165, 146.83, 0, 130.81, 164.81, 0, 110, 0, 220, 196, 0, 164.81, 146.83, 0];
    const play = () => {
      const hz = melody[index++ % melody.length]; if (!hz || document.hidden || ac.state !== 'running') return;
      const oscillator = ac.createOscillator(), gain = ac.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = hz;
      const t = ac.currentTime; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(preferences.master * preferences.music * .055, t + .04); gain.gain.exponentialRampToValueAtTime(.0001, t + .48);
      oscillator.connect(gain); gain.connect(ac.destination); oscillator.start(); oscillator.stop(t + .5);
    };
    play(); const timer = window.setInterval(play, 380); return () => clearInterval(timer);
  }, [unlocked, preferences.musicEnabled, preferences.music, preferences.master, getContext]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stopVoice(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stopVoice]);
  useEffect(() => () => { stopVoice(); const previous = context.current; context.current = null; void previous?.close().catch(() => {}); }, [stopVoice]);
  const updatePreferences = useCallback((patch: Partial<ShowPreferences>) => setPreferences(p => ({ ...p, ...patch })), []);
  return <Context.Provider value={{ preferences, updatePreferences, reducedMotion: reducedMotion || systemReduced || preferences.reducedMotion, unlocked, voiceAvailable, cue, speak, stopVoice }}>{children}</Context.Provider>;
}

export function ShowSettings() {
  const { preferences: p, updatePreferences, voiceAvailable } = useShowPreferences();
  return <section className="show-settings" aria-label="Son et accessibilité du plateau">
    <h3>Le son du plateau</h3>
    <p>Ces réglages s’appliquent à cet appareil. Activez la voix sur l’écran TV pour éviter les échos.</p>
    <label>Volume général <output>{Math.round(p.master * 100)} %</output><input aria-label="Volume général" type="range" min="0" max="1" step=".05" value={p.master} onChange={e => updatePreferences({ master: +e.target.value })}/></label>
    {(['music', 'voice', 'sfx'] as const).map((kind) => {
      const title = { music: 'Musique originale', voice: 'Voix française du présentateur', sfx: 'Effets sonores' }[kind];
      const enabled = `${kind}Enabled` as 'musicEnabled' | 'voiceEnabled' | 'sfxEnabled';
      return <div className="show-sound-setting" key={kind}><label className="show-toggle"><span>{title}</span><input type="checkbox" checked={p[enabled]} onChange={e => updatePreferences({ [enabled]: e.target.checked })}/></label><label className="show-volume">Volume <output>{Math.round(p[kind] * 100)} %</output><input aria-label={`Volume ${title}`} type="range" min="0" max="1" step=".05" value={p[kind]} onChange={e => updatePreferences({ [kind]: +e.target.value })}/></label></div>;
    })}
    {!voiceAvailable && <p className="show-small-note">Aucune voix française disponible sur cet appareil. Le présentateur reste lisible grâce aux textes à l’écran.</p>}
    <h3>Lecture et animations</h3>
    <label className="show-toggle"><span>Sous-titres du présentateur</span><input type="checkbox" checked={p.subtitles} onChange={e => updatePreferences({ subtitles: e.target.checked })}/></label>
    <label>Vitesse de lecture<select value={p.textSpeed} onChange={e => updatePreferences({ textSpeed: e.target.value as ShowPreferences['textSpeed'] })}><option value="slow">Tranquille</option><option value="normal">Normale</option><option value="fast">Rapide</option></select></label>
  </section>;
}
