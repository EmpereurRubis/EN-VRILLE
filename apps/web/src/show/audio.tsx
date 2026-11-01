import { showText } from './text';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { desktop } from '../backend';
import { useI18n, type Language } from '../i18n';

export interface ShowPreferences {
  master: number; music: number; voice: number; sfx: number;
  musicEnabled: boolean; voiceEnabled: boolean; sfxEnabled: boolean;
  subtitles: boolean; textSpeed: 'slow' | 'normal' | 'fast'; reducedMotion: boolean;
}
const defaults: ShowPreferences = { master: .65, music: .32, voice: .8, sfx: .55, musicEnabled: true, voiceEnabled: false, sfxEnabled: true, subtitles: true, textSpeed: 'normal', reducedMotion: false };
const preferenceKey = 'vrille-show-preferences';
type NativePreferences = { preferences?: { show?: Partial<ShowPreferences> }; setPreferences?: (patch: { show: ShowPreferences }) => Promise<unknown> };
const nativePreferences = desktop as (typeof desktop & NativePreferences);
function stored(): ShowPreferences {
  try {
    const value = nativePreferences?.preferences?.show || JSON.parse(localStorage.getItem(preferenceKey) || '{}');
    const result = { ...defaults };
    for (const key of ['master', 'music', 'voice', 'sfx'] as const) if (typeof value[key] === 'number') result[key] = Math.max(0, Math.min(1, value[key]));
    for (const key of ['musicEnabled', 'voiceEnabled', 'sfxEnabled', 'subtitles', 'reducedMotion'] as const) if (typeof value[key] === 'boolean') result[key] = value[key];
    if (['slow', 'normal', 'fast'].includes(value.textSpeed)) result.textSpeed = value.textSpeed;
    return result;
  } catch { return defaults; }
}
type Cue = 'hover' | 'confirm' | 'reveal' | 'round' | 'win' | 'tick';
interface ShowContextValue {
  preferences: ShowPreferences; updatePreferences: (patch: Partial<ShowPreferences>) => void;
  reducedMotion: boolean; unlocked: boolean; voiceAvailable: boolean;
  cue: (cue: Cue) => void;
  speak: (text: string, recordedUrl?: string, language?: Language) => void;
  stopVoice: () => void;
  setMusicScene: (active: boolean) => void;
  fadeMusic: (durationMs?: number) => Promise<void>;
}
const Context = createContext<ShowContextValue | null>(null);
export function useShowPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('ShowProvider is required.');
  return value;
}

/** Original 32-bar swing cue. Notes, voicings, rhythm and synthesis are local game resources. */
function startLounge(ac: AudioContext, output: AudioNode): () => void {
  const quarter = 60 / 108, bar = quarter * 4;
  const progression = [
    [48,55,59,62,64],[48,55,58,62,65],[53,60,64,67,69],[53,60,63,67,70],
    [48,55,59,62,64],[57,64,67,71,73],[50,57,60,64,65],[55,62,65,69,71],
    [48,55,59,62,64],[52,59,62,66,68],[53,60,64,67,69],[54,60,63,66,69],
    [48,55,59,62,64],[57,64,67,71,73],[50,57,60,64,65],[55,62,65,69,71],
    [53,60,64,67,69],[53,60,64,67,69],[52,59,62,66,68],[57,64,67,71,73],
    [50,57,60,64,65],[50,57,60,64,65],[55,62,65,69,71],[55,62,65,69,71],
    [48,55,59,62,64],[48,55,58,62,65],[53,60,64,67,69],[54,60,63,66,69],
    [48,55,59,62,64],[57,64,67,71,73],[50,57,60,64,65],[55,62,65,69,71],
  ];
  const tune = [
    [76,-1,79,81,79,-1,76,74],[72,-1,-1,74,76,-1,79,-1],[77,-1,81,79,77,-1,76,74],[75,-1,-1,77,78,-1,-1,-1],
    [76,-1,79,84,83,81,79,-1],[81,-1,79,76,73,-1,76,-1],[77,-1,76,74,72,-1,74,77],[79,-1,77,74,71,-1,-1,-1],
    [76,-1,79,81,84,-1,83,81],[80,-1,78,75,74,-1,-1,-1],[81,-1,79,77,76,-1,77,81],[81,-1,78,75,72,-1,-1,-1],
    [79,-1,76,72,74,-1,76,79],[81,-1,79,76,73,-1,71,-1],[72,-1,74,77,76,74,72,-1],[71,-1,74,77,79,-1,-1,-1],
    [81,-1,-1,79,77,-1,76,-1],[77,-1,79,81,84,-1,81,-1],[80,-1,-1,78,75,-1,74,-1],[73,-1,76,79,81,-1,-1,-1],
    [77,-1,-1,76,74,-1,72,-1],[74,-1,77,81,84,-1,81,-1],[83,-1,81,79,77,-1,74,71],[74,-1,-1,77,79,-1,-1,-1],
    [76,-1,79,81,79,-1,76,74],[72,-1,74,76,77,-1,79,-1],[81,-1,79,77,76,-1,77,81],[78,-1,81,78,75,-1,-1,-1],
    [76,-1,79,84,83,81,79,76],[73,-1,76,79,81,-1,79,-1],[77,-1,76,74,72,-1,74,77],[79,-1,77,74,71,-1,74,-1],
  ];
  const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
  const active = new Set<AudioScheduledSourceNode>();
  const tone = (note: number, start: number, length: number, volume: number, type: OscillatorType = 'triangle', filterHz = 3000) => {
    const oscillator = ac.createOscillator(), gain = ac.createGain(), filter = ac.createBiquadFilter();
    oscillator.type = type; oscillator.frequency.value = hz(note); filter.type = 'lowpass'; filter.frequency.value = filterHz;
    gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(volume,start+.012); gain.gain.exponentialRampToValueAtTime(.0001,start+length);
    oscillator.connect(filter); filter.connect(gain); gain.connect(output); active.add(oscillator);
    oscillator.onended = () => { active.delete(oscillator); oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start+length+.025);
  };
  const noise = ac.createBuffer(1,ac.sampleRate*.12,ac.sampleRate), samples = noise.getChannelData(0);
  let seed = 17383; for (let i=0;i<samples.length;i++) { seed = (seed*16807)%2147483647; samples[i]=(seed/2147483647*2-1)*Math.exp(-i/(ac.sampleRate*.027)); }
  const brush = (start:number, volume:number, high:boolean) => { const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();src.buffer=noise;filter.type='highpass';filter.frequency.value=high?7000:1500;gain.gain.value=volume;src.connect(filter);filter.connect(gain);gain.connect(output);active.add(src);src.onended=()=>{active.delete(src);src.disconnect();filter.disconnect();gain.disconnect();};src.start(start); };
  let barIndex = 0, nextBar = ac.currentTime+.1;
  const schedule = () => {
    if(ac.state !== 'running' || document.hidden) { nextBar=ac.currentTime+.1; return; }
    while(nextBar < ac.currentTime+1.25) {
      const index=barIndex++%32, chord=progression[index], start=nextBar;
      for(let beat=0;beat<4;beat++) {
        tone([chord[0]-12,chord[0]-5,chord[0],chord[0]-2][beat],start+beat*quarter,quarter*.82,.20,'sine',700);
        if(beat===1 || beat===3) chord.slice(1).forEach((n,i)=>tone(n,start+beat*quarter+.018+i*.009,.32,.035,'triangle',1800));
        brush(start+beat*quarter,.042,true); brush(start+beat*quarter+quarter*.66,.027,true);
        if(beat===1 || beat===3) brush(start+beat*quarter,.12,false);
      }
      tune[index].forEach((note,eighth)=>{ if(note>=0) tone(note,start+Math.floor(eighth/2)*quarter+(eighth%2?quarter*.66:0),eighth===7?.24:.32,.067,'triangle',2400); });
      nextBar+=bar;
    }
  };
  schedule(); const timer=window.setInterval(schedule,180);
  return()=>{clearInterval(timer);for(const node of active){try{node.stop();}catch{/* Already ended. */}}active.clear();};
}

export function ShowProvider({ children, reducedMotion = false }: { children: ReactNode; reducedMotion?: boolean }) {
  const { language } = useI18n();
  const [preferences, setPreferences] = useState(stored), [unlocked, setUnlocked] = useState(() => desktop?.isLauncher === true), [voiceAvailable,setVoiceAvailable]=useState(false), [systemReduced,setSystemReduced]=useState(false), [musicScene,setMusicScene]=useState(true);
  const context=useRef<AudioContext|null>(null),musicBus=useRef<GainNode|null>(null),recording=useRef<HTMLAudioElement|null>(null),hoverAt=useRef(0);
  const prefs=useRef(preferences);prefs.current=preferences;
  const getContext=useCallback(()=>{try{if(!context.current || context.current.state==='closed')context.current=new AudioContext();return context.current;}catch{return null;}},[]);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setSystemReduced(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  useEffect(()=>{const unlock=()=>{setUnlocked(true);void getContext()?.resume().catch(()=>{});};if(desktop?.isLauncher)unlock();window.addEventListener('pointerdown',unlock,{once:true});window.addEventListener('keydown',unlock,{once:true});return()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);};},[getContext]);
  useEffect(()=>{const refresh=()=>setVoiceAvailable('speechSynthesis'in window && speechSynthesis.getVoices().some(v=>v.lang.toLowerCase().startsWith(language)));refresh();if('speechSynthesis'in window)speechSynthesis.addEventListener('voiceschanged',refresh);return()=>{if('speechSynthesis'in window)speechSynthesis.removeEventListener('voiceschanged',refresh);};},[language]);
  useEffect(()=>{try{localStorage.setItem(preferenceKey,JSON.stringify(preferences));}catch{/* Storage is optional. */}void nativePreferences?.setPreferences?.({show:preferences}).catch(()=>{});},[preferences]);
  const stopVoice=useCallback(()=>{if('speechSynthesis'in window)speechSynthesis.cancel();recording.current?.pause();recording.current=null;},[]);
  const cue=useCallback((kind:Cue)=>{const p=prefs.current;if(!unlocked || !p.sfxEnabled || document.hidden)return;const ac=getContext();if(!ac || ac.state!=='running')return;if(kind==='hover'){if(Date.now()-hoverAt.current<110)return;hoverAt.current=Date.now();}const notes:Record<Cue,number[]>={hover:[392],confirm:[523,659],reveal:[294,440,587],round:[220,330,440,660],win:[392,494,587,784],tick:[880]};notes[kind].forEach((frequency,index)=>{const oscillator=ac.createOscillator(),gain=ac.createGain(),start=ac.currentTime+index*.095;oscillator.type='triangle';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(p.master*p.sfx*(kind==='hover'?.025:.12),start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+(kind==='hover'?.08:.2));oscillator.connect(gain);gain.connect(ac.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(start);oscillator.stop(start+.23);});},[unlocked,getContext]);
  const speak=useCallback((text:string,recordedUrl?:string,spokenLanguage:Language=language)=>{stopVoice();const p=prefs.current;if(!unlocked || !p.voiceEnabled || !p.master || !p.voice || document.hidden)return;const synthesized=()=>{if(!('speechSynthesis'in window))return;const voices=speechSynthesis.getVoices(),voice=voices.find(v=>v.lang.toLowerCase()===(spokenLanguage==='fr'?'fr-fr':'en-gb'))||voices.find(v=>v.lang.toLowerCase().startsWith(spokenLanguage));if(!voice)return;const utterance=new SpeechSynthesisUtterance(text);utterance.lang=voice.lang;utterance.voice=voice;utterance.volume=p.master*p.voice;utterance.rate=p.textSpeed==='slow'?.86:p.textSpeed==='fast'?1.2:1.02;speechSynthesis.speak(utterance);};if(recordedUrl){const track=new Audio(recordedUrl);track.volume=p.master*p.voice;recording.current=track;track.onerror=synthesized;void track.play().catch(synthesized);}else synthesized();},[stopVoice,unlocked,language]);
  useEffect(()=>{if(!preferences.voiceEnabled)stopVoice();},[preferences.voiceEnabled,stopVoice]);
  useEffect(()=>{if(!unlocked || !preferences.musicEnabled || !musicScene)return;const ac=getContext();if(!ac)return;const gain=ac.createGain();gain.gain.setValueAtTime(0,ac.currentTime);gain.gain.linearRampToValueAtTime(prefs.current.master*prefs.current.music*.6,ac.currentTime+.8);gain.connect(ac.destination);musicBus.current=gain;const stop=startLounge(ac,gain);return()=>{stop();if(musicBus.current===gain)musicBus.current=null;gain.disconnect();};},[unlocked,preferences.musicEnabled,musicScene,getContext]);
  useEffect(()=>{const ac=context.current,bus=musicBus.current;if(ac&&bus){bus.gain.cancelScheduledValues(ac.currentTime);bus.gain.setTargetAtTime(preferences.master*preferences.music*.6,ac.currentTime,.12);}},[preferences.master,preferences.music]);
  const fadeMusic=useCallback(async(durationMs=450)=>{const ac=context.current,bus=musicBus.current;if(ac&&bus){bus.gain.cancelScheduledValues(ac.currentTime);bus.gain.setValueAtTime(bus.gain.value,ac.currentTime);bus.gain.linearRampToValueAtTime(0,ac.currentTime+durationMs/1000);await new Promise<void>(resolve=>setTimeout(resolve,durationMs));}setMusicScene(false);},[]);
  useEffect(()=>{const hide=()=>{if(document.hidden)stopVoice();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[stopVoice]);
  useEffect(()=>()=>{stopVoice();const previous=context.current;context.current=null;void previous?.close().catch(()=>{});},[stopVoice]);
  const updatePreferences=useCallback((patch:Partial<ShowPreferences>)=>setPreferences(p=>({...p,...patch})),[]);
  return <Context.Provider value={{preferences,updatePreferences,reducedMotion:reducedMotion||systemReduced||preferences.reducedMotion,unlocked,voiceAvailable,cue,speak,stopVoice,setMusicScene,fadeMusic}}>{children}</Context.Provider>;
}

export function ShowSettings() {
  const {language}=useI18n(),fr=language==='fr';
  const {preferences:p,updatePreferences,voiceAvailable}=useShowPreferences();
  return <section className="show-settings" aria-label={showText(language,'ui.064')}><h3>{showText(language,'ui.065')}</h3><p>{showText(language,'ui.066')}</p><label>{showText(language,'ui.067')}<output>{Math.round(p.master*100)} %</output><input aria-label={showText(language,'ui.067')} type="range" min="0" max="1" step=".05" value={p.master} onChange={e=>updatePreferences({master:+e.target.value})}/></label>{(['music','voice','sfx']as const).map(kind=>{const title={music:showText(language,'ui.068'),voice:showText(language,'ui.069'),sfx:showText(language,'ui.070')}[kind],enabled=`${kind}Enabled`as'musicEnabled'|'voiceEnabled'|'sfxEnabled';return <div className="show-sound-setting" key={kind}><label className="show-toggle"><span>{title}</span><input type="checkbox" checked={p[enabled]} onChange={e=>updatePreferences({[enabled]:e.target.checked})}/></label><label className="show-volume">Volume<output>{Math.round(p[kind]*100)} %</output><input aria-label={`Volume ${title}`} type="range" min="0" max="1" step=".05" value={p[kind]} onChange={e=>updatePreferences({[kind]:+e.target.value})}/></label></div>;})}{!voiceAvailable&&<p className="show-small-note">{showText(language,'ui.071')}</p>}<h3>{showText(language,'ui.072')}</h3><label className="show-toggle"><span>{showText(language,'ui.073')}</span><input type="checkbox" checked={p.subtitles} onChange={e=>updatePreferences({subtitles:e.target.checked})}/></label><label>{showText(language,'ui.074')}<select value={p.textSpeed} onChange={e=>updatePreferences({textSpeed:e.target.value as ShowPreferences['textSpeed']})}><option value="slow">{showText(language,'ui.075')}</option><option value="normal">{showText(language,'ui.076')}</option><option value="fast">{showText(language,'ui.077')}</option></select></label></section>;
}
