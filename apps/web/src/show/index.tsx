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
  return <div className="show-opening" role="dialog" aria-label={language === 'fr' ? 'Générique EN VRILLE' : 'EN VRILLE opening'}><motion.div initial={{ opacity: 0, scale: .75, rotate: -7 }} animate={{ opacity: 1, scale: 1, rotate: -3 }} transition={{ type: 'spring', damping: 13 }}><span>{language === 'fr' ? 'LE CALME AVANT LE CHAOS' : 'THE CALM BEFORE THE CHAOS'}</span><strong>EN<br/>VRILLE<em>✳</em></strong><p>{language === 'fr' ? 'La soirée va déraper.' : 'Tonight is going off the rails.'}</p></motion.div><button onClick={() => { cue('confirm'); dismiss(); }}>{language === 'fr' ? 'Passer le générique' : 'Skip opening'} <ArrowRight size={17}/></button></div>;
}
export function MainMenu({ onCreate, onJoin, onRules, onSettings, onCredits, desktopOffline = false, onStart, starting = false }: { onCreate: () => void; onJoin: () => void; onRules: () => void; onSettings: () => void; onCredits: () => void; desktopOffline?: boolean; onStart?: () => void | Promise<void>; starting?: boolean }) {
  const { reducedMotion, cue, setMusicScene, fadeMusic, preferences, updatePreferences } = useShowPreferences();
  const { language, t } = useI18n(), fr = language === 'fr';
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { setMusicScene(true); return () => setMusicScene(false); }, [setMusicScene]);
  const click = (callback: () => void) => { cue('confirm'); callback(); };
  const start = async () => { if (starting || leaving) return; setLeaving(true); cue('confirm'); try { await fadeMusic(450); await onStart?.(); } finally { setLeaving(false); } };
  return <section className={`show-menu ${reducedMotion ? 'show-reduced-motion' : ''}`} aria-label="Menu principal EN VRILLE">
    <div className="show-menu-grain" aria-hidden/>
    <div className="show-menu-top"><span><i/>{fr ? 'LE PARTY GAME QUI DÉRAILLE' : 'THE PARTY GAME GOING OFF THE RAILS'}</span><div className="show-menu-top-actions"><button className="show-icon-button" aria-label={fr ? 'Activer ou couper la musique' : 'Toggle music'} onClick={() => updatePreferences({ musicEnabled: !preferences.musicEnabled })}>{preferences.musicEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button><FullscreenButton/></div></div>
    <div className="show-menu-layout"><div className="show-menu-copy"><span className="show-menu-kicker"><Sparkles size={16}/>{fr ? 'VOS AMIS. VOS PIRES IDÉES.' : 'YOUR FRIENDS. YOUR WORST IDEAS.'}</span><h1>{fr ? <>Ce soir,<br/>on part<br/></> : <>Tonight,<br/>we go<br/></>}<em>EN VRILLE.</em></h1><p>{fr ? <>Cinq jeux, un plateau, zéro filtre.<br/>Votre téléphone devient votre manette.</> : <>Five games. One stage. No filter.<br/>Your phone becomes your controller.</>}</p><div className="show-menu-primary-actions">{desktopOffline ? <><button className="show-menu-play" disabled={starting || leaving} onMouseEnter={() => cue('hover')} onClick={() => void start()}><span><PlayMark/>{starting || leaving ? t('menu.starting') : t('menu.play')}</span><ArrowRight size={24}/></button><button className="show-menu-join" onMouseEnter={() => cue('hover')} onClick={() => click(onSettings)}><Settings size={20}/>{t('menu.settings')}</button><div className="show-menu-offline-secondary"><button onMouseEnter={() => cue('hover')} onClick={() => click(onCredits)}>{t('menu.credits')}</button><button onMouseEnter={() => cue('hover')} onClick={() => void desktop?.quit()}><Power size={17}/>{t('menu.quit')}</button></div></> : <><button className="show-menu-play" aria-label={t('menu.create')} onMouseEnter={() => cue('hover')} onClick={() => click(onCreate)}><span><PlayMark/>{t('menu.create')}</span><ArrowRight size={24}/></button><button className="show-menu-join" aria-label={t('menu.join')} onMouseEnter={() => cue('hover')} onClick={() => click(onJoin)}><LogIn size={20}/>{t('menu.join')}</button></>}</div><div className="show-menu-details"><span><Users size={17}/>{fr ? '3 à 12 joueurs' : '3–12 players'}</span><span><Gamepad2 size={17}/>{fr ? 'Sur place ou à distance' : 'Together or online'}</span></div></div><div className="show-menu-art"><span className="show-menu-sticker">{fr ? <>LE BON SENS<br/>EST EN PAUSE</> : <>COMMON SENSE<br/>IS ON A BREAK</>} <ArrowDownRight size={22}/></span><div className="show-menu-orbit orbit-one"/><div className="show-menu-orbit orbit-two"/><Presenter expression="enthusiastic"/><div className="show-menu-speech">{fr ? <>« Vous êtes prêts ?<br/>Moi non plus. »</> : <>“Are you ready?<br/>Me neither.”</>}</div><span className="show-menu-presenter-tag">VRILL <small>{fr ? 'VOTRE MAÎTRE DU CHAOS' : 'YOUR MASTER OF CHAOS'}</small></span></div></div>
    <div className="show-menu-bottom"><div className="show-menu-games show-menu-game-tickets" aria-label={fr ? 'Cinq mini-jeux inclus' : 'Five mini-games included'}>{GAMES.map((g, i) => <span key={g.id}><GameArt gameId={g.id} decorative variant="thumb"/><b>0{i + 1}</b><span>{t(`games.${g.id}.short`)}</span></span>)}</div><nav aria-label={fr ? 'Options du jeu' : 'Game options'}><button onClick={() => click(onRules)}><HelpCircle size={17}/>{t('menu.howToPlay')}</button>{!desktopOffline && <><button onClick={() => click(onSettings)}><Settings size={17}/>{t('menu.settings')}</button><button onClick={onCredits}>{t('menu.credits')}</button>{desktop && <button onClick={() => void desktop?.quit()}><Power size={17}/>{t('menu.quit')}</button>}</>}</nav></div><LanguageSelect className="show-menu-language"/>
  </section>;
}
function PlayMark() { return <svg width="20" height="23" viewBox="0 0 20 23" aria-hidden><path d="M2 2 18 11.5 2 21Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>; }
