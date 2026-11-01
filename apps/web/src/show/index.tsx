import { showText } from './text';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, Gamepad2, HelpCircle, LogIn, Power, Settings, Sparkles, Users, Volume2, VolumeX } from 'lucide-react';
import { GAMES } from '@en-vrille/shared';
import { Presenter } from './Presenter';
import { useShowPreferences } from './audio';
import { FullscreenButton } from './controls';
import { desktop } from '../backend';
import { LanguageSelect, useI18n } from '../i18n';
import { GameArt } from './GameArt';
import './gameSelection.css';
export { ShowProvider, ShowSettings, useShowPreferences } from './audio';
export { Presenter, type PresenterExpression } from './Presenter';
export { SceneStage, getRuleCards, type ShowRequest } from './SceneStage';
export { FullscreenButton } from './controls';
export { GameSelection, GameCatalog } from './GameSelection';
export { GameArt, GameLogo, GAME_ART } from './GameArt';

export function IntroSplash() {
  const { language } = useI18n();
  const { reducedMotion, cue } = useShowPreferences();
  const [visible, setVisible] = useState(() => { try { return !sessionStorage.getItem('vrille-opening-seen'); } catch { return true; } });
  const dismiss = () => { setVisible(false); try { sessionStorage.setItem('vrille-opening-seen', '1'); } catch { /* Private browsing may reject writes. */ } };
  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) { dismiss(); return; }
    const timer = setTimeout(dismiss, 1700); return () => clearTimeout(timer);
  }, [visible, reducedMotion]);
  if (!visible || reducedMotion) return null;
  return <div className="show-opening" role="dialog" aria-label={showText(language,'ui.044')}><motion.div initial={{ opacity: 0, scale: .75, rotate: -7 }} animate={{ opacity: 1, scale: 1, rotate: -3 }} transition={{ type: 'spring', damping: 13 }}><span>{showText(language,'ui.045')}</span><strong>EN<br/>VRILLE<em>✳</em></strong><p>{showText(language,'ui.046')}</p></motion.div><button onClick={() => { cue('confirm'); dismiss(); }}>{showText(language,'ui.047')} <ArrowRight size={17}/></button></div>;
}
export function MainMenu({ onCreate, onJoin, onRules, onSettings, onCredits, desktopOffline = false, onStart, starting = false }: { onCreate: () => void; onJoin: () => void; onRules: () => void; onSettings: () => void; onCredits: () => void; desktopOffline?: boolean; onStart?: () => void | Promise<void>; starting?: boolean }) {
  const { reducedMotion, cue, setMusicScene, fadeMusic, preferences, updatePreferences } = useShowPreferences();
  const { language, t } = useI18n(), fr = language === 'fr';
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { setMusicScene(true); return () => setMusicScene(false); }, [setMusicScene]);
  const click = (callback: () => void) => { cue('confirm'); callback(); };
  const start = async () => { if (starting || leaving) return; setLeaving(true); cue('confirm'); try { await fadeMusic(450); await onStart?.(); } finally { setLeaving(false); } };
  return <section className={`show-menu ${desktopOffline ? 'show-launcher' : ''} ${reducedMotion ? 'show-reduced-motion' : ''}`} aria-label="Menu principal EN VRILLE">
    <div className="show-menu-grain" aria-hidden/>
    <div className="show-menu-top"><span><i/>{showText(language,'ui.048')}</span><div className="show-menu-top-actions"><button className="show-icon-button" aria-label={showText(language,'ui.049')} onClick={() => updatePreferences({ musicEnabled: !preferences.musicEnabled })}>{preferences.musicEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button><FullscreenButton/></div></div>
    <div className="show-menu-layout"><div className="show-menu-copy"><span className="show-menu-kicker"><Sparkles size={16}/>{showText(language,'ui.050')}</span><h1>{fr ? <>{showText(language,'ui.051')}<br/>{showText(language,'ui.052')}<br/></> : <>{showText(language,'ui.051')}<br/>{showText(language,'ui.052')}<br/></>}<em>EN VRILLE.</em></h1><p>{fr ? <>{showText(language,'ui.053')}<br/>{showText(language,'ui.054')}</> : <>{showText(language,'ui.053')}<br/>{showText(language,'ui.054')}</>}</p><div className="show-menu-primary-actions">{desktopOffline ? <><button className="show-menu-play" disabled={starting || leaving} onMouseEnter={() => cue('hover')} onClick={() => void start()}><span><PlayMark/>{starting || leaving ? t('menu.starting') : t('menu.play')}</span><ArrowRight size={24}/></button><button className="show-menu-join" onMouseEnter={() => cue('hover')} onClick={() => click(onSettings)}><Settings size={20}/>{t('menu.settings')}</button><div className="show-menu-offline-secondary"><button onMouseEnter={() => cue('hover')} onClick={() => click(onCredits)}>{t('menu.credits')}</button><button onMouseEnter={() => cue('hover')} onClick={() => void desktop?.quit()}><Power size={17}/>{t('menu.quit')}</button></div></> : <><button className="show-menu-play" aria-label={t('menu.create')} onMouseEnter={() => cue('hover')} onClick={() => click(onCreate)}><span><PlayMark/>{t('menu.create')}</span><ArrowRight size={24}/></button><button className="show-menu-join" aria-label={t('menu.join')} onMouseEnter={() => cue('hover')} onClick={() => click(onJoin)}><LogIn size={20}/>{t('menu.join')}</button></>}</div><div className="show-menu-details"><span><Users size={17}/>{showText(language,'ui.055')}</span><span><Gamepad2 size={17}/>{showText(language,'ui.056')}</span></div></div><div className="show-menu-art"><span className="show-menu-sticker">{fr ? <>{showText(language,'ui.057')}<br/>{showText(language,'ui.058')}</> : <>{showText(language,'ui.057')}<br/>{showText(language,'ui.058')}</>} <ArrowDownRight size={22}/></span><div className="show-menu-orbit orbit-one"/><div className="show-menu-orbit orbit-two"/><Presenter expression="enthusiastic"/><div className="show-menu-speech">{fr ? <>{showText(language,'ui.059')}<br/>{showText(language,'ui.060')}</> : <>{showText(language,'ui.059')}<br/>{showText(language,'ui.060')}</>}</div><span className="show-menu-presenter-tag">VRILL <small>{showText(language,'ui.061')}</small></span></div></div>
    <div className="show-menu-bottom"><div className="show-menu-games show-menu-game-tickets" aria-label={showText(language,'ui.062')}>{GAMES.map((g, i) => <span key={g.id}><GameArt gameId={g.id} decorative variant="thumb"/><b>0{i + 1}</b><span>{t(`games.${g.id}.short`)}</span></span>)}</div><nav aria-label={showText(language,'ui.063')}><button onClick={() => click(onRules)}><HelpCircle size={17}/>{t('menu.howToPlay')}</button>{!desktopOffline && <><button onClick={() => click(onSettings)}><Settings size={17}/>{t('menu.settings')}</button><button onClick={onCredits}>{t('menu.credits')}</button>{desktop && <button onClick={() => void desktop?.quit()}><Power size={17}/>{t('menu.quit')}</button>}</>}</nav></div><LanguageSelect className="show-menu-language"/>
  </section>;
}
function PlayMark() { return <svg width="20" height="23" viewBox="0 0 20 23" aria-hidden><path d="M2 2 18 11.5 2 21Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>; }
