import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { io, type Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  Gamepad2,
  Gavel,
  HelpCircle,
  Link2,
  LoaderCircle,
  LogOut,
  Megaphone,
  MessageCircle,
  Monitor,
  Moon,
  Pause,
  Play,
  Plus,
  Radio,
  Settings,
  Shield,
  Shuffle,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  AVATARS,
  DEFAULT_CONFIG,
  PROTOCOL_VERSION,
  REACTIONS,
  GAMES,
  type Ack,
  type Action,
  type ClientEvents,
  type GameId,
  type PlayerView,
  type RoomConfig,
  type RoomSnapshot,
  type ServerEvents,
  type Session,
} from "@en-vrille/shared";
import { useTheme, type ThemePreference } from "./theme";
import { ShowProvider, ShowSettings, MainMenu, SceneStage, FullscreenButton, IntroSplash } from "./show";
import "./show/show.css";
import { desktop, isDesktop, serverOrigin, serverFetch, serverResource, validateServerUrl } from "./backend";
import { I18nProvider, LanguageSelect, useI18n, translate } from "./i18n";
import { GameSelection, GameCatalog } from "./show";
import cinemaCredits from "../../../packages/content/cinema/credits.json";
import { ProductAdmin } from './ProductAdmin';
import { CinemaAdmin } from './CinemaAdmin';

const socket: Socket<ServerEvents, ClientEvents> = io(serverOrigin || undefined, {
  autoConnect: false,
  reconnection: true,
  auth: { protocolVersion: PROTOCOL_VERSION, clientKind: isDesktop ? "desktop" : "web" },
});
const sessionStore = isDesktop ? localStorage : sessionStorage;
const SESSION_STORAGE_KEY = isDesktop ? `vrille-session:${serverOrigin}` : "vrille-session";
type Event = keyof ClientEvents;
type Screen = "home" | "games" | "rules";
const icons: Record<GameId, typeof Sparkles> = {
  mythos: MessageCircle,
  pitch: Megaphone,
  court: Gavel,
  who: Eye,
  captions: Radio,
};
const saved = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};
const gameInfo = (id: GameId) => {
  const game = GAMES.find((g) => g.id === id)!;
  const language = document.documentElement.lang === 'en' ? 'en' : 'fr';
  return { ...game, name: translate(`games.${id}.name`, language), shortName: translate(`games.${id}.short`, language), description: translate(`games.${id}.rules`, language) };
};
const styleColor = (color: string) => ({ "--accent": color }) as CSSProperties;

function BrandMark() {
  const { t } = useI18n();
  return (
    <>
      EN VR<span className="logo-i">{"I"}</span>LLE
      <span className="logo-spark" aria-hidden="true">✳</span>
    </>
  );
}

function Mascot({ small = false }: { small?: boolean }) {
  const { t } = useI18n();
  return (
    <svg
      className={small ? "mascot mascot-small" : "mascot"}
      viewBox="0 0 300 330"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M98 224 67 277 41 273M194 226l35 48 29-8"
        stroke="#232321"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m58 142-32 25-7-24m222 0 30 19 10-29"
        stroke="#232321"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M139 27c5-17 31-17 37-1l14 40 43 5c21 2 32 24 20 41l-24 32 18 50c7 22-7 42-29 42l-44-2-36 29c-17 14-40 5-44-15l-7-39-38-27c-16-12-15-36 3-46l37-23 10-45c4-16 20-23 34-16l25 14"
        fill="var(--brand-red, #ef3340)"
        stroke="#232321"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <ellipse
        cx="132"
        cy="130"
        rx="22"
        ry="30"
        fill="#f8f5ee"
        stroke="#232321"
        strokeWidth="5"
      />
      <ellipse
        cx="180"
        cy="126"
        rx="22"
        ry="30"
        fill="#f8f5ee"
        stroke="#232321"
        strokeWidth="5"
      />
      <ellipse cx="139" cy="135" rx="7" ry="12" fill="#232321" />
      <ellipse cx="186" cy="132" rx="7" ry="12" fill="#232321" />
      <path
        d="M125 178c16 25 45 26 63-5"
        stroke="#232321"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="m199 170 7 5m-95 3-6 6"
        stroke="#232321"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="m63 37-5-18m-5 29L31 39m204-12 11-14m-2 30 24-1"
        stroke="#232321"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function App() {
  const { language, t } = useI18n();
  const launcher = isDesktop && desktop?.isLauncher === true;
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(() => new URLSearchParams(location.search).has('connectionError'));
  const launchErrorReason = new URLSearchParams(location.search).get('connectionError');
  const { preference: theme, setPreference: setTheme, isDark } = useTheme();
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [dialog, setDialog] = useState<"create" | "join" | "settings" | "credits" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState("");
  const [reduced, setReduced] = useState(() =>
    desktop?.preferences?.reduced ?? saved("vrille-reduced", window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const [toast, setToast] = useState("");
  const resumedSocket = useRef<string | undefined>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }, []);
  const request = useCallback(
    async (event: Event, payload: unknown = {}): Promise<Ack> => {
      setError("");
      return await new Promise((resolve) => {
        if (!socket.connected) {
          const ack = {
            ok: false,
            error:
              "Connexion interrompue. Le salon sera retrouvé automatiquement.",
          };
          setError(ack.error);
          resolve(ack);
          return;
        }
        (
          socket.timeout(12000).emit as unknown as (
            event: Event,
            payload: unknown,
            callback: (error: Error | null, response: Ack) => void,
          ) => void
        )(event, payload, (err, response) => {
          const ack = err
            ? {
                ok: false,
                error: "Le serveur met du temps à répondre. Réessayez.",
              }
            : response;
          if (!ack?.ok)
            setError(ack?.error || "Cette action n’a pas pu être effectuée.");
          if (ack?.session)
            sessionStore.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify(ack.session),
            );
          if (ack?.room) setRoom(ack.room);
          resolve(ack);
        });
      });
    },
    [],
  );
  useEffect(() => {
    if (launcher) return;
    const connect = () => {
      setConnected(true);
      setConnectionError("");
      try {
        const s = JSON.parse(
          sessionStore.getItem(SESSION_STORAGE_KEY) || "null",
        ) as Session | null;
        if (s && resumedSocket.current !== socket.id) {
          resumedSocket.current = socket.id;
          void request("room:resume", s).then((ack) => {
            if (!ack.ok) sessionStore.removeItem(SESSION_STORAGE_KEY);
          });
        }
      } catch {
        sessionStore.removeItem(SESSION_STORAGE_KEY);
      }
    };
    const disconnect = () => setConnected(false);
    const connectionFailed = (error: Error) => setConnectionError(error.message || "Le serveur ne répond pas.");
    socket.on("connect", connect);
    socket.on("disconnect", disconnect);
    socket.on("connect_error", connectionFailed);
    socket.on("room:state", setRoom);
    socket.on("server:error", setError);
    socket.connect();
    if (socket.connected) connect();
    return () => {
      socket.off("connect", connect);
      socket.off("disconnect", disconnect);
      socket.off("connect_error", connectionFailed);
      socket.off("room:state", setRoom);
      socket.off("server:error", setError);
    };
  }, [request, launcher]);
  useEffect(() => {
    try { localStorage.setItem("vrille-reduced", JSON.stringify(reduced)); } catch { /* optional storage */ }
    void desktop?.setPreferences?.({ reduced }).catch(() => {});
  }, [reduced]);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("room")) setDialog("join");
  }, []);
  const leave = async () => {
    const ack = await request("room:leave");
    if (ack.ok) {
      sessionStore.removeItem(SESSION_STORAGE_KEY);
      setRoom(null);
      setScreen("home");
      setError("");
    }
  };
  const admin = location.pathname.startsWith("/admin");
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <ShowProvider reducedMotion={reduced}>
      <div
        className={`app ${isDesktop ? "desktop-client" : ""} ${launcher ? "desktop-launcher" : ""} ${room ? "in-room" : ""} ${reduced ? "reduce-motion" : ""}`}
      >
        <header className="site-header">
          <button
            className="wordmark"
            onClick={() => {
              if (!room) setScreen("home");
              window.scrollTo({
                top: 0,
                behavior: reduced ? "auto" : "smooth",
              });
            }}
            aria-label={t('legacy.s006')}
          >
            <BrandMark />
          </button>
          {!room && !admin && !launcher && (
            <nav className="desktop-nav" aria-label={t('legacy.s007')}>
              <button
                className={screen === "games" ? "nav-active" : ""}
                onClick={() => setScreen("games")}
              >
                {t('legacy.s009')}<span>05</span>
              </button>
              <button
                className={screen === "rules" ? "nav-active" : ""}
                onClick={() => setScreen("rules")}
              >
                {t('legacy.s010')}</button>
            </nav>
          )}
          <div className="header-actions">
            {!launcher && <LanguageSelect />}
            {isDesktop && !launcher && <button className="icon-button" title={t('menu.back')} aria-label={t('menu.back')} onClick={() => void desktop?.returnToLauncher?.()}><ArrowLeft size={20}/></button>}
            <FullscreenButton />
            {room && (
              <span className="room-chip">
                {t('legacy.s011')}<strong>{room.code}</strong>
              </span>
            )}
            {!launcher && <span
              className={`connection ${connected ? "online" : ""}`}
              title={connected ? t('legacy.s012') : t('legacy.s013')}
            >
              <i />
              <span className="connection-label">{connected ? t('legacy.s014') : t('legacy.s015')}</span>
            </span>}
            <button
              className="icon-button theme-toggle"
              aria-label={isDark ? t('legacy.s016') : t('legacy.s017')}
              title={isDark ? t('legacy.s016') : t('legacy.s017')}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              className="icon-button"
              aria-label={t('legacy.s018')}
              onClick={() => setDialog("settings")}
            >
              <Settings size={20} />
            </button>
            {room && (
              <button
                className="icon-button"
                onClick={() => void leave()}
                aria-label={t('legacy.s019')}
              >
                <LogOut size={19} />
              </button>
            )}
          </div>
        </header>
        {!connected && !isDesktop && (
          <div className="connection-banner" role="status">
            <LoaderCircle size={16} className="spin" /> {connectionError || t('legacy.s020')}
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button aria-label={t('legacy.s021')} onClick={() => setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
        {!launcher && isDesktop && !connected && !room && <DesktopConnection compact problem={connectionError} hasRoom={false} onSettings={() => setDialog("settings")} onRetry={() => { setConnectionError(""); socket.disconnect().connect(); }}/>}
        <main>
          {launcher ? <><IntroSplash />{launchError ? <section className="desktop-connection"><Radio size={52}/><h1>{t(launchErrorReason === 'protocol' ? 'connection.protocol' : 'connection.unavailable')}</h1><p>{serverOrigin}</p><button className="button primary" onClick={() => { setLaunchError(false); setLaunching(true); void desktop?.startGame?.(language).catch(() => { setLaunching(false); setLaunchError(true); }); }}>{language === 'en' ? t('legacy.s024') : t('legacy.s025')}</button><button className="button outline" onClick={() => setLaunchError(false)}>{t('menu.back')}</button></section> : screen === "rules" ? <><button className="button outline" onClick={() => setScreen("home")}>{t("menu.back")}</button><Rules create={() => setScreen("home")}/></> : <MainMenu desktopOffline starting={launching} onStart={() => { setLaunching(true); void desktop?.startGame?.(language).catch(() => { setLaunching(false); setLaunchError(true); }); }} onCreate={() => {}} onJoin={() => {}} onRules={() => setScreen('rules')} onSettings={() => setDialog('settings')} onCredits={() => setDialog('credits')}/>}</>
          : isDesktop && !connected && room ? (
            <DesktopConnection problem={connectionError} hasRoom={!!room} onSettings={() => setDialog("settings")} onRetry={() => { setConnectionError(""); socket.disconnect().connect(); }}/>
          ) : admin ? (
            <Admin />
          ) : room ? (
            <Room room={room} request={request} notify={notify} onLeave={() => void leave()} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {screen === "home" ? (
                  <>
                    <IntroSplash />
                    <MainMenu
                      onCreate={() => setDialog("create")}
                      onJoin={() => setDialog("join")}
                      onRules={() => setScreen("rules")}
                      onSettings={() => setDialog("settings")}
                      onCredits={() => setDialog("credits")}
                    />
                  </>
                ) : screen === "games" ? (
                  <GameCatalog onCreate={() => setDialog("create")} />
                ) : (
                  <Rules create={() => setDialog("create")} />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
        {!room && !launcher && (
          <footer className="site-footer">
            <span className="footer-logo"><BrandMark /></span>
            <p>{t('legacy.s026')}</p>
            <span>{t('legacy.s027')}</span>
            {!isDesktop && <a href="/admin" aria-label={t('legacy.s028')}>
              <Shield size={16} />
            </a>}
          </footer>
        )}
        <AnimatePresence>
          {dialog && (
            <Modal
              wide={dialog === 'create'}
              title={
                dialog === "credits" ? t('legacy.s029')
                : dialog === "settings"
                  ? t('legacy.s030')
                  : dialog === "create"
                    ? t('legacy.s031')
                    : t('legacy.s032')
              }
              close={() => setDialog(null)}
            >
              {dialog === "settings" ? (
                <div className="settings-content">
                  <label className="field-label">
                    {t('legacy.s033')}<select
                      className="theme-select"
                      aria-label={t('legacy.s033')}
                      value={theme}
                      onChange={(event) => setTheme(event.target.value as ThemePreference)}
                    >
                      <option value="system">{t('legacy.s034')}</option>
                      <option value="light">{t('legacy.s035')}</option>
                      <option value="dark">{t('legacy.s036')}</option>
                    </select>
                  </label>
                  <ShowSettings />
                  <LanguageSelect />
                  {launcher && <><DesktopDisplaySettings/><ServerSettings /></>}
                  <Toggle
                    label={t('legacy.s037')}
                    description={t('legacy.s038')}
                    checked={reduced}
                    onChange={setReduced}
                  />
                  <button
                    className="button primary full"
                    onClick={() => setDialog(null)}
                  >
                    {t('legacy.s039')}<Check size={18} />
                  </button>
                </div>
              ) : dialog === "credits" ? (
                <div className="settings-content">
                  <p><strong>EN VRILLE !</strong> {t('legacy.s040')}</p>
                  <p>{t('legacy.s041')}</p>
                  <p className="muted">{t('legacy.s042')}</p>
                  <CinemaCredits />
                  <button className="button primary full" onClick={() => setDialog(null)}>{t('legacy.s043')}</button>
                </div>
              ) : dialog === "create" ? (
                <CreateWizard busy={busy} submit={async (data, config) => {
                  setBusy(true);
                  const ack = await request("room:create", data);
                  if (ack.ok) {
                    const configured = await request("room:configure", config);
                    if (configured.ok) setDialog(null);
                  }
                  setBusy(false);
                }} />
              ) : (
                <IdentityForm mode="join" busy={busy} submit={async (data) => {
                  setBusy(true);
                  const ack = await request("room:join", data);
                  setBusy(false);
                  if (ack.ok) setDialog(null);
                }} />
              )}
            </Modal>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Check size={18} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </ShowProvider>
    </MotionConfig>
  );
}

function CinemaCredits() {
  const { t } = useI18n();
  const sources = cinemaCredits;
  const link = (url: string, text: string) => <a href={url} target="_blank" rel="noreferrer" onClick={(event) => { if (desktop) { event.preventDefault(); void desktop.openExternal(url); } }}>{text}</a>;
  return <section className="cinema-credits"><h3>{t('captions.credits')}</h3><p>{t('captions.adaptations')}</p>{sources.map((rights) => <article key={rights.title}><strong>{rights.title}</strong><p>{rights.credits}</p><small>{link(rights.sourceUrl, t('captions.source'))} · {link(rights.licenseUrl, rights.license)}</small></article>)}</section>;
}

function DesktopConnection({ problem, hasRoom, onSettings, onRetry, compact = false }: {
  problem: string; hasRoom: boolean; onSettings: () => void; onRetry: () => void; compact?: boolean;
}) {
  const { t } = useI18n();
  const Title = compact ? "h2" : "h1";
  return <section className={`desktop-connection ${compact ? "desktop-connection-compact" : ""}`} aria-live="polite">
    <div className="desktop-connection-signal"><Radio size={50}/>{!problem && <span/>}</div>
    <div className="eyebrow">{t('legacy.s044')}</div>
    <Title>{problem ? t('legacy.s045') : hasRoom ? t('legacy.s046') : t('legacy.s047')}</Title>
    <p>{hasRoom ? t('legacy.s048') : t('legacy.s049')}</p>
    <code>{serverOrigin}</code>
    {problem && <p className="desktop-connection-detail">{problem}</p>}
    <div><button className="button primary" onClick={onRetry}>{t('legacy.s050')}<ArrowRight size={18}/></button><button className="button outline" onClick={onSettings}>{t('legacy.s051')}<Settings size={18}/></button></div>
    <small>{t('legacy.s052')}</small>
  </section>;
}

function DesktopDisplaySettings() {
  const { t } = useI18n();
  const [windowSettings, setWindowSettings] = useState({ fullscreen: false, width: 1280, height: 720 });
  useEffect(() => { void desktop?.getWindowSettings?.().then(setWindowSettings).catch(() => {}); }, []);
  return <section className="desktop-server-settings"><h3>{t('settings.display')}</h3><Toggle label={t('settings.fullscreen')} checked={windowSettings.fullscreen} onChange={(fullscreen) => { void desktop?.setFullscreen(fullscreen).then((value) => setWindowSettings((settings) => ({ ...settings, fullscreen: value }))); }}/><label className="field-label">{t('settings.resolution')}<select disabled={windowSettings.fullscreen} value={`${windowSettings.width}x${windowSettings.height}`} onChange={(event) => { const [width, height] = event.target.value.split('x').map(Number); void desktop?.setResolution?.(width, height).then((value) => setWindowSettings((settings) => ({ ...settings, ...value }))); }}>{!['1280x720','1600x900','1920x1080'].includes(`${windowSettings.width}x${windowSettings.height}`) && <option value={`${windowSettings.width}x${windowSettings.height}`}>{windowSettings.width} × {windowSettings.height}</option>}{[[1280,720],[1600,900],[1920,1080]].map(([width,height]) => <option key={width} value={`${width}x${height}`}>{width} × {height}</option>)}</select></label></section>;
}

function ServerSettings() {
  const { t } = useI18n();
  const [address, setAddress] = useState(serverOrigin);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const bridge = desktop;
  if (!bridge) return null;
  return <section className="desktop-server-settings">
    <h3>{t('legacy.s053')}</h3>
    <p className="small muted">{t('legacy.s054')}{bridge.version} {t('legacy.s055')}{bridge.protocolVersion}</p>
    <label className="field-label">{t('legacy.s056')}<input type="url" aria-label={t('legacy.s056')} value={address} onChange={(event) => setAddress(event.target.value)} placeholder={t('legacy.s057')}/></label>
    <p className="fineprint">{t('legacy.s058')}</p>
    {message && <p role="alert" className="desktop-setting-error">{message}</p>}
    <button className="button outline full" disabled={saving} onClick={() => {
      try {
        const url = validateServerUrl(address);
        setSaving(true); setMessage("");
        void bridge.setServerUrl(url).then(() => {
          window.location.reload();
        }).catch((error: unknown) => { setSaving(false); setMessage(error instanceof Error ? error.message : "L’adresse n’a pas pu être enregistrée."); });
      } catch (error) { setMessage(error instanceof Error ? error.message : "Adresse invalide."); }
    }}>{saving ? t('legacy.s059') : t('legacy.s060')}<ArrowRight size={17}/></button>
  </section>;
}

function Rules({ create }: { create: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  return (
    <section className="page-width inner-page rules-page">
      <div className="eyebrow">{t('legacy.s105')}</div>
      <h1 className="page-title">{t('legacy.s106')}</h1>
      <div className="tutorial-controls" aria-label={t('legacy.s107')}>{[0,1,2,3,4].map((index) => <button key={index} aria-pressed={step === index} onClick={() => setStep(index)}><span>{index + 1}</span>{t(`tutorial.${index}.tab`)}</button>)}</div>
      <div className="rules-layout"><div>
        <div className="tutorial-screens" aria-hidden><div className="tutorial-stage"><Monitor size={64}/><strong>{t(`tutorial.${step}.stage`)}</strong><span>{t('legacy.s108')}</span></div><div className="tutorial-controller"><Gamepad2 size={32}/><strong>{t(`tutorial.${step}.phone`)}</strong><span>{t('legacy.s109')}</span></div></div>
        <article className="rule"><span>{step + 1}</span><div><h2>{t(`tutorial.${step}.title`)}</h2><p>{t(`tutorial.${step}.body`)}</p></div></article>
          <div className="wizard-navigation"><button className="button outline" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft size={17}/>{t('legacy.s110')}</button>{step < 4 ? <button className="button primary" onClick={() => setStep((value) => value + 1)}>{t('legacy.s111')}<ArrowRight size={17}/></button> : <button className="button primary" onClick={create}>{t('legacy.s112')}<ArrowRight size={17}/></button>}</div>
        </div>
        <aside className="rules-aside">
          <Mascot small />
          <h3>{t('legacy.s113')}</h3>
          <p>
            {t('legacy.s114')}</p>
          <button className="button primary full" onClick={create}>
            {t('legacy.s115')}<ArrowRight size={18} />
          </button>
        </aside>
      </div>
    </section>
  );
}

function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const focusable = ref.current?.querySelectorAll<HTMLElement>(
          "button, input, select, textarea, a[href]",
        );
        if (!focusable?.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    ref.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => {
      document.removeEventListener("keydown", fn);
      previous?.focus();
    };
  }, []);
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <motion.div
        ref={ref}
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 30, rotate: -1 }}
        animate={{ y: 0, rotate: 0 }}
      >
        <button
          className="icon-button modal-close"
          aria-label={t('legacy.s116')}
          onClick={close}
        >
          <X size={21} />
        </button>
        <div className="eyebrow">{t('legacy.s117')}</div>
        <h2>{title}</h2>
        {children}
      </motion.div>
    </motion.div>
  );
}

function CreateWizard({ busy, submit }: {
  busy: boolean;
  submit: (data: { name: string; avatar: string; hostPlays?: boolean }, config: RoomConfig) => void;
}) {
  const [step, setStep] = useState(0);
  const { language, t } = useI18n();
  const [config, setConfig] = useState<RoomConfig>(() => ({ ...structuredClone(DEFAULT_CONFIG), language }));
  const update = <K extends keyof RoomConfig>(key: K, value: RoomConfig[K]) => setConfig((previous) => ({ ...previous, [key]: value }));
  return (
    <div className="creation-wizard">
      <ol className="wizard-steps" aria-label={t('legacy.s118')}>
        {['mood', 'programme', 'identity'].map((key, index) => <li key={key} aria-current={step === index ? "step" : undefined}><span>{index + 1}</span>{t(`wizard.${key}`)}</li>)}
      </ol>
      {step === 0 ? <>
        <h2>{t('legacy.s120')}</h2>
        <div className="creation-modes">
          <button className={config.mode === "custom" ? "selected" : ""} aria-pressed={config.mode === "custom"} onClick={() => update("mode", "custom")}><Gamepad2 size={34}/><strong>{t('legacy.s122')}</strong><span>{t('legacy.s123')}</span></button>
          <button className={config.mode === "random" ? "selected" : ""} aria-pressed={config.mode === "random"} onClick={() => update("mode", "random")}><Shuffle size={34}/><strong>{t('legacy.s124')}</strong><span>{t('legacy.s125')}</span></button>
        </div>
        <button className="button primary full" onClick={() => setStep(1)}>{t('legacy.s126')}<ArrowRight size={18}/></button>
      </> : step === 1 ? <>
        <h2>{config.mode === "custom" ? t('legacy.s127') : t('legacy.s128')}</h2>
        <GameSelection config={config} onChange={setConfig}/>
        <details className="wizard-options"><summary>{t('legacy.s129')}</summary>
          <label className="field-label">{t('settings.stageLanguage')}<select value={config.language} onChange={(event) => update('language', event.target.value as 'fr' | 'en')}><option value="fr">{"Français"}</option><option value="en">{"English"}</option></select></label>
          <label className="field-label">{t('captions.length')}<select value={config.captionLength} onChange={(event) => update('captionLength', event.target.value as RoomConfig['captionLength'])}><option value="short">{t('captions.short')}</option><option value="normal">{t('captions.normal')}</option><option value="long">{t('captions.long')}</option></select></label>
          <div className="field-grid"><NumberField label={t('legacy.s132')} value={config.answerSeconds} min={15} max={180} onChange={(value) => update("answerSeconds", value)}/><NumberField label={t('legacy.s133')} value={config.voteSeconds} min={10} max={120} onChange={(value) => update("voteSeconds", value)}/><NumberField label={t('legacy.s134')} value={config.presentationSeconds} min={15} max={180} onChange={(value) => update("presentationSeconds", value)}/></div>
          <Toggle label={t('legacy.s135')} checked={config.noPoints} onChange={(value) => update("noPoints", value)}/>
          <Toggle label={t('legacy.s136')} checked={config.reactionsEnabled} onChange={(value) => update("reactionsEnabled", value)}/>
          <Toggle label={t('legacy.s137')} description={t('legacy.s138')} checked={config.secretRoles} onChange={(value) => update("secretRoles", value)}/>
          <Toggle label={t('legacy.s139')} description={t('legacy.s140')} checked={config.autoAdvance} onChange={(value) => update("autoAdvance", value)}/>
          <Toggle label={t('legacy.s141')} checked={config.adult} onChange={(value) => update("adult", value)}/>
        </details>
        <p className="fineprint">{t('legacy.s142')}</p>
        <div className="wizard-navigation"><button className="button outline" onClick={() => setStep(0)}><ArrowLeft size={17}/>{t('legacy.s143')}</button><button className="button primary" disabled={config.mode === "custom" ? !config.playlist.length : !config.allowedGames.length} onClick={() => setStep(2)}>{t('legacy.s144')}<ArrowRight size={17}/></button></div>
      </> : <>
        <button className="text-button" onClick={() => setStep(1)}><ArrowLeft size={16}/>{t('legacy.s145')}</button>
        <IdentityForm mode="create" busy={busy} submit={(data) => submit(data, config)}/>
      </>}
    </div>
  );
}

function IdentityForm({
  mode,
  busy,
  submit,
}: {
  mode: "create" | "join";
  busy: boolean;
  submit: (data: {
    name: string;
    avatar: string;
    code?: string;
    spectator?: boolean;
    hostPlays?: boolean;
  }) => void;
}) {
  const { t } = useI18n();
  const params = new URLSearchParams(location.search);
  const [name, setName] = useState(() => saved("vrille-name", ""));
  const [avatar, setAvatar] = useState(() =>
    saved("vrille-avatar", AVATARS[0]),
  );
  const [code, setCode] = useState(params.get("room")?.toUpperCase() || "");
  const [spectator, setSpectator] = useState(params.get("screen") === "1");
  const [hostPlays, setHostPlays] = useState(!isDesktop);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        localStorage.setItem("vrille-name", JSON.stringify(name));
        localStorage.setItem("vrille-avatar", JSON.stringify(avatar));
        submit({
          name: mode === "join" && spectator ? "Écran TV" : name.trim(),
          avatar,
          ...(mode === "join"
            ? { code: code.toUpperCase().trim(), spectator }
            : { hostPlays }),
        });
      }}
    >
      {mode === "join" && (
        <label className="field-label">
          {t('legacy.s146')}<input
            className="code-input"
            aria-label={t('legacy.s146')}
            maxLength={6}
            minLength={6}
            required
            placeholder={"ABCDEF"}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
          />
        </label>
      )}
      {(mode === "create" || !spectator) && (
        <>
          <label className="field-label">
            {t('legacy.s148')}<input
              aria-label={t('legacy.s148')}
              placeholder={t('legacy.s149')}
              maxLength={22}
              minLength={2}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <fieldset className="avatar-picker">
            <legend>{t('legacy.s150')}</legend>
            <div>
              {AVATARS.map((a) => (
                <button
                  type="button"
                  key={a}
                  aria-label={`Avatar ${a}`}
                  aria-pressed={avatar === a}
                  className={a === avatar ? "selected" : ""}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}
      {mode === "join" && (
        <Toggle
          checked={spectator}
          onChange={setSpectator}
          label={t('legacy.s151')}
          description={t('legacy.s152')}
        />
      )}
      {mode === "create" && <Toggle checked={hostPlays} onChange={setHostPlays} label={t('legacy.s153')} description={t('legacy.s154')}/>}
      <button className="button primary full" type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle className="spin" size={20} />
        ) : mode === "create" ? (
          <>
            {t('legacy.s155')}<ArrowRight size={20} />
          </>
        ) : (
          <>
            {t('legacy.s156')}<ArrowRight size={20} />
          </>
        )}
      </button>
      <p className="fineprint">
        {t('legacy.s157')}</p>
    </form>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <label className={`toggle-row ${disabled ? "disabled" : ""}`}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" />
    </label>
  );
}
type Request = (event: Event, payload?: unknown) => Promise<Ack>;

function Room({ room, request, notify, onLeave }: { room: RoomSnapshot; request: Request; notify: (v: string) => void; onLeave: () => void; }) {
  const { t } = useI18n();
  const host = room.me.id === room.hostId;
  const me = room.players.find((player) => player.id === room.me.id)!;
  const [view, setView] = useState<"controller" | "stage">(isDesktop || me.spectator ? "stage" : "controller");
  const stage = (me.spectator && !host) || view === "stage";
  return (
    <div data-testid="phase" data-phase={room.phase} className={`room-page ${stage ? "scene-room" : "page-width controller-room"}`}>
      {(!me.spectator || host) && <div className="room-view-switch" aria-label={t('legacy.s158')}>
        <button className={stage ? "" : "selected"} aria-pressed={!stage} onClick={() => setView("controller")}><Gamepad2 size={17}/>{me.spectator ? t('legacy.s159') : t('legacy.s160')}</button>
        <button className={stage ? "selected" : ""} aria-pressed={stage} onClick={() => setView("stage")}><Monitor size={17}/>{t('legacy.s161')}</button>
      </div>}
      {stage ? <SceneStage room={room} host={host} request={request} onController={me.spectator && !host ? undefined : () => setView("controller")} onMenu={onLeave}/>
        : room.phase === "lobby" ? host ? <Lobby room={room} request={request} notify={notify} host={host}/> : <ControllerLobby room={room} request={request}/>
        : <Gameplay room={room} request={request} host={host} spectator={me.spectator} onMenu={onLeave}/>}
    </div>
  );
}

function Participation({ room }: { room: RoomSnapshot }) {
  const { t } = useI18n();
  return <div className="participation-list" aria-live="polite" aria-atomic="true">{(room.progress || []).map((progress) => <div className="participation" key={progress.kind}>
    <div><strong>{progress.completed} / {progress.total}</strong><span>{room.round?.gameId === 'captions' && room.phase === 'writing' ? t('captions.writers') : t(`progress.${progress.kind}`)}</span></div>
    <div className="participation-track" role="progressbar" aria-label={t(`progress.${progress.kind}`)} aria-valuemin={0} aria-valuemax={progress.total || 1} aria-valuenow={progress.completed}><motion.span animate={{ width: `${progress.total ? Math.min(100, progress.completed / progress.total * 100) : 0}%` }}/></div>
  </div>)}</div>;
}

function Reactions({ room, request }: { room: RoomSnapshot; request: Request }) {
  const { t } = useI18n();
  const [cooldown, setCooldown] = useState(false);
  if (!room.config.reactionsEnabled) return null;
  return <div className="controller-reactions" role="group" aria-label={t('legacy.s162')}>{REACTIONS.map((reaction) => <button key={reaction} aria-label={`Réaction ${reaction}`} disabled={cooldown} onClick={() => { setCooldown(true); void request("room:react", { reaction }); window.setTimeout(() => setCooldown(false), 2100); }}>{reaction}</button>)}</div>;
}

function ControllerIdentity({ room }: { room: RoomSnapshot }) {
  const { t } = useI18n();
  const me = room.players.find((player) => player.id === room.me.id)!;
  return <div className="controller-identity"><Avatar player={me}/><div><strong>{me.name}</strong><small>{t('legacy.s163')}<span data-testid="room-code">{room.code}</span></small></div><span>{room.config.noPoints ? t('legacy.s164') : !room.scoresVisible ? t('legacy.s165') : <><strong>{me.score.toLocaleString(document.documentElement.lang)}</strong> {t('legacy.s166')}</>}</span></div>;
}

function ControllerLobby({ room, request }: { room: RoomSnapshot; request: Request }) {
  const { t } = useI18n();
  const me = room.players.find((player) => player.id === room.me.id)!;
  return <div className="controller-shell">
    <ControllerIdentity room={room}/>
    <section className="panel controller-panel"><div className="eyebrow">{t('legacy.s167')}</div><h1>{me.ready ? t('legacy.s168') : t('legacy.s169')}</h1><p>{t('legacy.s170')}</p><Participation room={room}/><button className={`button full large ${me.ready ? "green" : "primary"}`} aria-label={t('legacy.s171')} onClick={() => void request("room:ready", { ready: !me.ready })}>{me.ready ? <><Check size={21}/>{t('legacy.s172')}</> : <>{t('legacy.s171')}<ArrowRight size={21}/></>}</button></section>
    <div className="controller-casting">{room.players.filter((player) => !player.spectator).map((player) => <motion.div key={player.id} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}><Avatar player={player}/><span>{player.name}</span>{player.ready && <Check size={15}/>}</motion.div>)}</div>
    <Reactions room={room} request={request}/>
  </div>;
}

function Lobby({
  room,
  request,
  notify,
  host,
}: {
  room: RoomSnapshot;
  request: Request;
  notify: (v: string) => void;
  host: boolean;
}) {
  const { t } = useI18n();
  const [config, setConfig] = useState(room.config);
  const [advanced, setAdvanced] = useState(false);
  const [starting, setStarting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    void serverFetch("/api/catalog")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);
  const active = room.players.filter((p) => !p.spectator);
  const me = room.players.find((p) => p.id === room.me.id)!;
  useEffect(() => setConfig(room.config), [JSON.stringify(room.config)]);
  const update = <K extends keyof RoomConfig>(key: K, value: RoomConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));
  const add = (gameId: GameId) => {
    if (config.playlist.length < 12)
      update("playlist", [
        ...config.playlist,
        {
          gameId,
          rounds: 1,
          ...(gameId === "pitch" ? { pitchMode: "invented" as const } : {}),
        },
      ]);
  };
  const reorder = (i: number, shift: number) => {
    const playlist = [...config.playlist];
    [playlist[i], playlist[i + shift]] = [playlist[i + shift], playlist[i]];
    update("playlist", playlist);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.inviteUrl);
      notify("Lien d’invitation copié. Faites tourner !");
    } catch {
      notify("Copiez le lien affiché sous le code du salon.");
    }
  };
  const start = async () => {
    setStarting(true);
    const ack = await request("room:configure", config);
    if (ack.ok) await request("room:start");
    setStarting(false);
  };
  return (
    <>
      <div className="room-heading">
        <div>
          <div className="eyebrow">
            <i className="live-dot" /> {t('legacy.s173')}</div>
          <h1>{t('legacy.s174')}</h1>
          <p>{t('legacy.s175')}</p>
        </div>
        <span className="status-pill">
          <Users size={17} />
          {active.length}{t('legacy.s176')}</span>
      </div>
      <Participation room={room}/>
      <div className="lobby-layout">
        <div className="lobby-left">
          <section className="panel invite-panel">
            <div>
              <span className="eyebrow">{t('legacy.s177')}</span>
              <div data-testid="room-code" className="room-code">
                {room.code}
              </div>
              <button className="text-button" onClick={() => void copy()}>
                <Copy size={16} />
                {t('legacy.s178')}</button>
              <a className="invite-url" href={room.inviteUrl} onClick={(event) => { if (desktop) { event.preventDefault(); void desktop.openExternal(room.inviteUrl).catch(() => notify("Copiez le lien d’invitation pour l’ouvrir dans votre navigateur.")); } }}>
                {room.inviteUrl}
              </a>
            </div>
            <div className="qr-wrap">
              <QRCodeSVG value={room.inviteUrl} size={104} marginSize={1} />
              <small>{t('legacy.s179')}</small>
            </div>
          </section>
          <section className="panel players-panel">
            <div className="panel-heading">
              <h2>
                {t('legacy.s180')}<span>{active.length}</span>
              </h2>
              <span className="muted small">
                {active.filter((p) => p.ready).length} {t('legacy.s181')}</span>
            </div>
            <div className="player-list">
              {room.players.map((p) => (
                <div
                  className={`player-row ${!p.connected ? "player-offline" : ""}`}
                  key={p.id}
                >
                  <Avatar player={p} />
                  <div className="player-name">
                    <strong>
                      {p.name}{" "}
                      {p.id === room.me.id && (
                        <span className="muted">{t('legacy.s182')}</span>
                      )}
                    </strong>
                    <small>
                      {p.spectator
                        ? t('legacy.s183')
                        : p.id === room.hostId
                          ? t('legacy.s184')
                          : !p.connected
                            ? t('legacy.s059')
                            : p.ready
                              ? t('legacy.s185')
                              : t('legacy.s186')}
                    </small>
                  </div>
                  {p.id === room.hostId ? (
                    <Crown size={20} className="crown" />
                  ) : p.ready ? (
                    <span className="ready-badge">
                      <Check size={15} />
                    </span>
                  ) : (
                    <span className="waiting-dot" />
                  )}
                </div>
              ))}
            </div>
            {!me.spectator && (
              <button
                aria-label={t('legacy.s171')}
                className={`button full ${me.ready ? "green" : "outline"}`}
                onClick={() => void request("room:ready", { ready: !me.ready })}
              >
                {me.ready ? (
                  <>
                    <Check size={19} />
                    {t('legacy.s172')}</>
                ) : (
                  <>
                    {t('legacy.s171')}<Check size={19} />
                  </>
                )}
              </button>
            )}
            <a
              className="tv-link"
              target="_blank"
              rel="noreferrer"
              href={`${room.inviteUrl}${room.inviteUrl.includes("?") ? "&" : "?"}screen=1`}
              onClick={(event) => { if (desktop) { event.preventDefault(); void desktop.openExternal(`${room.inviteUrl}${room.inviteUrl.includes("?") ? "&" : "?"}screen=1`).catch(() => notify("Copiez le lien d’invitation et ajoutez &screen=1 dans votre navigateur.")); } }}
            >
              <Monitor size={17} />
              {t('legacy.s187')}<ExternalLink size={14} />
            </a>
          </section>
          <div className="lobby-tip">
            <Sparkles size={21} />
            <p>
              {t('legacy.s188')}<br />
              <strong>{t('legacy.s189')}</strong>
            </p>
          </div>
        </div>
        <section className="panel playlist-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{t('legacy.s190')}</span>
              <h2>{t('legacy.s191')}</h2>
            </div>
            <Shuffle size={26} />
          </div>
          <div className="segmented">
            <button
              disabled={!host}
              className={config.mode === "custom" ? "selected" : ""}
              onClick={() => update("mode", "custom")}
            >
              <Gamepad2 size={17} />
              {t('legacy.s122')}</button>
            <button
              disabled={!host}
              className={config.mode === "random" ? "selected" : ""}
              onClick={() => update("mode", "random")}
            >
              <Shuffle size={17} />
              {t('legacy.s124')}</button>
          </div>
          <GameSelection config={config} onChange={setConfig} disabled={!host}/>
          <button
            className="advanced-button"
            aria-expanded={advanced}
            onClick={() => setAdvanced((v) => !v)}
          >
            <Settings size={17} />
            {t('legacy.s192')}<ChevronDown size={18} className={advanced ? "rotated" : ""} />
          </button>
          {advanced && (
            <div className="advanced-settings">
              <label className="field-label">{t('settings.stageLanguage')}<select disabled={!host} value={config.language} onChange={(event) => update('language', event.target.value as 'fr' | 'en')}><option value="fr">{"Français"}</option><option value="en">{"English"}</option></select></label>
              <label className="field-label">{t('captions.length')}<select disabled={!host} value={config.captionLength} onChange={(event) => update('captionLength', event.target.value as RoomConfig['captionLength'])}><option value="short">{t('captions.short')}</option><option value="normal">{t('captions.normal')}</option><option value="long">{t('captions.long')}</option></select></label>
              <div className="field-grid">
                <NumberField
                  label={t('legacy.s193')}
                  value={config.answerSeconds}
                  min={15}
                  max={180}
                  disabled={!host}
                  onChange={(v) => update("answerSeconds", v)}
                />
                <NumberField
                  label={t('legacy.s194')}
                  value={config.voteSeconds}
                  min={10}
                  max={120}
                  disabled={!host}
                  onChange={(v) => update("voteSeconds", v)}
                />
                <NumberField
                  label={t('legacy.s195')}
                  value={config.presentationSeconds}
                  min={15}
                  max={180}
                  disabled={!host}
                  onChange={(v) => update("presentationSeconds", v)}
                />
                <NumberField
                  label={t('legacy.s196')}
                  value={config.transitionSeconds}
                  min={3}
                  max={60}
                  disabled={!host}
                  onChange={(v) => update("transitionSeconds", v)}
                />
                <label className="field-label">
                  {t('legacy.s197')}<select
                    value={config.leaderboard}
                    disabled={!host}
                    onChange={(e) =>
                      update(
                        "leaderboard",
                        e.target.value as RoomConfig["leaderboard"],
                      )
                    }
                  >
                    <option value="round">{t('legacy.s198')}</option>
                    <option value="game">{t('legacy.s199')}</option>
                    <option value="final">{t('legacy.s200')}</option>
                  </select>
                </label>
                <label className="field-label">
                  {t('legacy.s201')}<select
                    value={config.connectionMode}
                    disabled={!host}
                    onChange={(e) =>
                      update(
                        "connectionMode",
                        e.target.value as RoomConfig["connectionMode"],
                      )
                    }
                  >
                    <option value="hybrid">{t('legacy.s202')}</option>
                    <option value="local">{t('legacy.s203')}</option>
                    <option value="online">{t('legacy.s204')}</option>
                  </select>
                </label>
              </div>
              <Toggle
                label={t('legacy.s135')}
                checked={config.noPoints}
                disabled={!host}
                onChange={(value) => update("noPoints", value)}
              />
              <Toggle
                label={t('legacy.s136')}
                checked={config.reactionsEnabled}
                disabled={!host}
                onChange={(value) => update("reactionsEnabled", value)}
              />
              <Toggle
                label={t('legacy.s137')}
                description={t('legacy.s205')}
                checked={config.secretRoles}
                disabled={!host}
                onChange={(value) => update("secretRoles", value)}
              />
              <Toggle
                label={t('legacy.s139')}
                description={t('legacy.s206')}
                checked={config.autoAdvance}
                disabled={!host}
                onChange={(value) => update("autoAdvance", value)}
              />
              <Toggle
                label={t('legacy.s207')}
                checked={config.anonymousVotes}
                disabled={!host}
                onChange={(v) => update("anonymousVotes", v)}
              />
              <Toggle
                label={t('legacy.s208')}
                checked={config.allowVoteChange}
                disabled={!host}
                onChange={(v) => update("allowVoteChange", v)}
              />
              <Toggle
                label={t('legacy.s209')}
                checked={config.allowSelfVoteWho}
                disabled={!host}
                onChange={(v) => update("allowSelfVoteWho", v)}
              />
              <Toggle
                label={t('legacy.s210')}
                checked={config.whoNoPoints}
                disabled={!host}
                onChange={(v) => update("whoNoPoints", v)}
              />
              <Toggle
                label={t('legacy.s141')}
                description={t('legacy.s211')}
                checked={config.adult}
                disabled={!host}
                onChange={(v) => update("adult", v)}
              />
              <fieldset
                className="field-label"
                style={{ border: 0, padding: 0 }}
              >
                <legend>{t('legacy.s212')}</legend>
                <p className="small muted" style={{ fontWeight: 400 }}>
                  {t('legacy.s213')}</p>
                <div className="allowed-games">
                  {categories.map((category) => (
                    <button
                      type="button"
                      key={category}
                      disabled={!host}
                      aria-pressed={config.disabledCategories.includes(
                        category,
                      )}
                      className={
                        config.disabledCategories.includes(category)
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        update(
                          "disabledCategories",
                          config.disabledCategories.includes(category)
                            ? config.disabledCategories.filter(
                                (c) => c !== category,
                              )
                            : [...config.disabledCategories, category],
                        )
                      }
                    >
                      {config.disabledCategories.includes(category) && (
                        <X size={12} />
                      )}{" "}
                      {category}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Toggle
                label={t('legacy.s214')}
                description={t('legacy.s215')}
                checked={config.balanced}
                disabled={!host}
                onChange={(v) => update("balanced", v)}
              />
              <div className="field-grid">
                {GAMES.map((g) => (
                  <NumberField
                    key={g.id}
                    label={`Coefficient ${g.shortName}`}
                    value={config.coefficients[g.id]}
                    min={0}
                    max={3}
                    step={0.25}
                    disabled={!host}
                    onChange={(v) =>
                      update("coefficients", {
                        ...config.coefficients,
                        [g.id]: v,
                      })
                    }
                  />
                ))}
              </div>
              {host && (
                <button
                  className="button outline full"
                  onClick={() =>
                    void request("room:configure", config).then((ack) => {
                      if (ack.ok) notify("Réglages enregistrés.");
                    })
                  }
                >
                  {t('legacy.s216')}<Check size={17} />
                </button>
              )}
            </div>
          )}
          <div className="launch-area">
            {host ? (
              <>
                <button
                  className="button primary full large"
                  disabled={starting}
                  onClick={() => void start()}
                >
                  {starting ? (
                    <LoaderCircle size={21} className="spin" />
                  ) : (
                    <>
                      {t('legacy.s217')}<ArrowRight size={21} />
                    </>
                  )}
                </button>
                <p>
                  {active.length < 3
                    ? t('legacy.s218')
                    : t('legacy.s219')}
                </p>
              </>
            ) : (
              <p className="waiting-host">
                <LoaderCircle className="spin" size={19} />
                {t('legacy.s220')}</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="field-label">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) =>
          onChange(Math.max(min, Math.min(max, Number(e.target.value))))
        }
      />
    </label>
  );
}
function Avatar({ player, size = "" }: { player: PlayerView; size?: string }) {
  const { t } = useI18n();
  return (
    <span className={`avatar ${size}`} style={{ background: player.color }}>
      {player.avatar}
      <i className={player.connected ? "connected-dot" : "disconnected-dot"} />
    </span>
  );
}

function Countdown({ room }: { room: RoomSnapshot }) {
  const { t } = useI18n();
  const [time, setTime] = useState(Date.now());
  const serverOffset = useRef(room.serverTime - Date.now());
  useEffect(() => {
    serverOffset.current = room.serverTime - Date.now();
  }, [room.serverTime]);
  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 200);
    return () => clearInterval(interval);
  }, []);
  const seconds = room.deadline
    ? Math.max(
        0,
        Math.ceil((room.deadline - time - serverOffset.current) / 1000),
      )
    : 0;
  return (
    <div
      className={`timer ${seconds <= 10 && !room.paused ? "urgent" : ""}`}
      aria-label={
        room.paused ? t('legacy.s223') : t('controller.seconds', { seconds })
      }
    >
      <span>
        {room.paused ? <Pause size={21} /> : <span className="timer-dot" />}
      </span>
      <strong>
        {room.paused
          ? t('legacy.s224')
          : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
      </strong>
    </div>
  );
}

function Gameplay({ room, request, host, spectator, onMenu }: { room: RoomSnapshot; request: Request; host: boolean; spectator: boolean; onMenu: () => void; }) {
  const { t } = useI18n();
  const r = room.round;
  const g = gameInfo(r?.gameId || room.playlist[room.gameIndex]?.gameId || "mythos");
  const Icon = icons[g.id];
  const me = room.players.find((player) => player.id === room.me.id)!;
  const player = (id?: string) => room.players.find((entry) => entry.id === id);
  const action = (data: Action) => request("room:action", data);
  if (spectator) return <div className="controller-shell"><section className="panel controller-panel"><div className="eyebrow">{t('legacy.s225')}</div><h1>{g.shortName}</h1><ControllerWaiting title={t('legacy.s226')} text="Donnez les signaux de l’émission ici. Les joueurs participent sur leurs manettes."/><Participation room={room}/></section><HostControls room={room} request={request}/>{room.phase === "podium" && <button className="button outline full" onClick={onMenu}>{t('legacy.s227')}</button>}</div>;
  const showPrompt = r && ["writing", "prepare", "presenting", "reveal", "voting"].includes(room.phase);
  const waiting = !["writing", "prepare", "presenting", "voting"].includes(room.phase);
  const phaseTitle: Record<string, string> = {
    "party-intro": t('legacy.s385'), intro: g.name, rules: t('legacy.s386'),
    writing: g.id === "pitch" ? t('legacy.s387') : t('legacy.s388'), prepare: t('legacy.s389'), presenting: t('legacy.s390'),
    reveal: t('legacy.s391'), voting: g.id === "court" ? t('legacy.s392') : t('legacy.s393'), results: t('legacy.s394'), leaderboard: t('legacy.s395'), transition: t('legacy.s396'), podium: t('legacy.s397'),
  };
  return <div className="controller-shell">
    <ControllerIdentity room={room}/>
    <div className="game-topbar"><div className="game-breadcrumb"><span style={{ background: g.color }}><Icon size={20}/></span><strong>{g.shortName}</strong><small>{t('legacy.s228')}{room.roundNumber}/{room.totalRounds}</small></div><Countdown room={room}/></div>
    {room.paused && <div className="pause-banner"><Pause size={18}/>{t('legacy.s229')}</div>}
    <section className={`panel controller-panel phase-${room.phase} play-${g.id}`} style={styleColor(g.color)}>
      <div className="eyebrow">{t('legacy.s230')}{room.manualAdvanceRequired ? t('legacy.s231') : t('legacy.s232')}</div>
      <h1>{g.id === 'captions' && room.phase === 'writing' ? t('captions.write') : phaseTitle[room.phase]}</h1>
      {showPrompt && g.id !== "captions" && <><p className="controller-prompt">{r.prompt}</p>{r.mediaUrl && <div className="prompt-media">{r.mediaUrl.match(/\.(mp4|webm)(\?|$)/i) ? <video src={serverResource(r.mediaUrl)} controls muted playsInline loop/> : <img src={serverResource(r.mediaUrl)} alt={t('legacy.s233')}/>}</div>}</>}
      {room.me.secretMission && ["writing", "prepare", "presenting"].includes(room.phase) && <div className="private-mission"><Shield size={20}/><div><small>{t('legacy.s234')}</small><p>{room.me.secretMission.instruction}</p>{room.me.secretMission.completed && <strong><Check size={15}/>{t('legacy.s235')}</strong>}</div></div>}
      {r && room.phase === "writing" && (room.me.eligible ? g.id === "captions" ? <CaptionWriting key={`${r.id}-${room.me.captions?.turn}`} room={room} action={action}/> : g.id === "pitch" ? <ProductForm key={r.id} submitted={room.me.submitted} product={room.me.product} action={action} request={request}/> : <WritingForm key={r.id} answer={room.me.answer} submitted={room.me.submitted} action={action}/> : <ControllerWaiting title={t('legacy.s236')} text="Votre place vous attend à la prochaine étape."/>)}
      {r && room.phase === "prepare" && <div className="preparation">
        {g.id === "captions" ? <CaptionPreparation room={room}/> : g.id === "pitch" ? <><p>{t('legacy.s237')}</p>{room.me.product && <ProductCard product={room.me.product}/>}<p>{t('legacy.s238')}</p></> : <><div className="role-secret"><Gavel size={24}/><div><span>{t('legacy.s239')}</span><strong>{t(`court.roles.${room.me.courtRole || 'participant'}`) || t('legacy.s240')}</strong></div></div><p>{t('legacy.s241')}</p><WritingForm key={`${r.id}-notes`} answer={room.me.answer} submitted={room.me.submitted} action={action} notes/></>}
        {room.me.eligible && !room.me.prepared ? <button className="button primary full" onClick={() => void action({ type: "prepared" })}>{t('legacy.s242')}<Check size={19}/></button> : <ControllerWaiting title={t('legacy.s243')} text="Le plateau attend les autres participants."/>}
      </div>}
      {r && g.id === "captions" && room.phase === "presenting" && <CaptionPresentation room={room} request={request} host={host}/>}{r && g.id !== "captions" && room.phase === "presenting" && (g.id === "pitch" ? <div className="presentation-content"><div className="speaker-badge">{player(r.currentSpeakerId) && <Avatar player={player(r.currentSpeakerId)!}/>}<div><small>{t('legacy.s244')}</small><h2>{player(r.currentSpeakerId)?.name || t('legacy.s245')}{r.currentSpeakerId === me.id ? t('legacy.s246') : ""}</h2></div></div>{r.currentProduct && <ProductCard product={r.currentProduct}/>}<p>{r.currentSpeakerId === me.id ? t('legacy.s247') : t('legacy.s248')}</p><p className="manual-note">{t('legacy.s249')}</p><span className="pill">{t('legacy.s250')}{r.presentationIndex + 1} / {room.players.filter((player) => !player.spectator).length}</span></div> : <div className="court-stage"><div className="role-secret"><Gavel size={22}/><div><span>{t('legacy.s239')}</span><strong>{t(`court.roles.${room.me.courtRole || 'participant'}`) || t('legacy.s240')}</strong></div></div><div className="court-step"><h2>{t(`court.steps.${r.courtStep}`)}</h2><p>{t(`court.hints.${r.courtStep}`)}</p></div>{room.me.answer && <blockquote className="private-notes"><small>{t('legacy.s251')}</small>{room.me.answer}</blockquote>}<p className="manual-note">{t('legacy.s252')}</p></div>)}
      {r && room.phase === "voting" && (room.me.eligible ? g.id === "captions" ? <CaptionVoting room={room} action={action}/> : g.id === "pitch" ? <Ratings room={room} action={action}/> : g.id === "court" ? <CourtVote room={room} action={action}/> : <Voting room={room} action={action}/> : <ControllerWaiting title={t('legacy.s253')} text="Vous ne participez pas à ce vote. Profitez du suspense !"/>)}
      {room.phase === "reveal" && <ControllerWaiting title={t('legacy.s254')} text="Découvrez-les sur la scène. Le vote arrive juste après."/>}
      {r?.pitchRating && room.phase === 'results' && <div className="pitch-intermediate-result"><Trophy size={28}/><h2>{player(r.pitchRating.sellerId)?.name}</h2><strong>{r.pitchRating.average.toFixed(1)} / 5</strong><p>{r.pitchRating.ratingsCount} {t('pitch.ratingsCount')}</p></div>}{r && room.phase === "results" && <><div className="personal-result"><strong>{room.config.noPoints ? t('legacy.s255') : !room.scoresVisible ? t('legacy.s256') : `${me.delta >= 0 ? "+" : ""}${me.delta} PTS`}</strong><p>{r.results.filter((result) => result.playerId === me.id).map((result) => result.reason).join(" · ") || t('legacy.s257')}</p></div>{r.answers.find((answer) => answer.authorId === me.id) && <blockquote>{r.answers.find((answer) => answer.authorId === me.id)?.text}</blockquote>}</>}
      {["leaderboard", "podium"].includes(room.phase) && <Leaderboard room={room} final={room.phase === "podium"}/>}
      {waiting && !["reveal", "results", "leaderboard", "podium"].includes(room.phase) && <ControllerWaiting title={room.phase === "rules" ? t('legacy.s258') : t('legacy.s259')} text={room.phase === "rules" ? t(`games.${g.id}.rules`) : t('legacy.s260')}/>}
      <Participation room={room}/>
    </section>
    <Reactions room={room} request={request}/>
    {host && <HostControls room={room} request={request}/>}
    {room.phase === "podium" && <button className="button outline full" onClick={onMenu}>{t('legacy.s227')}<ArrowRight size={18}/></button>}
  </div>;
}

function CaptionWriting({ room, action }: { room: RoomSnapshot; action: (data: Action) => Promise<Ack> }) {
  const { t } = useI18n();
  const data = room.me.captions;
  const [text, setText] = useState(data?.ownText || '');
  const [sending, setSending] = useState(false);
  if (!data) return null;
  if (data.submitted) return <div className="submitted-state"><span><Check size={34}/></span><h2>{t('captions.saved')}</h2>{data.ownText && <blockquote>{data.ownText}</blockquote>}<p>{t('captions.waiting')}</p></div>;
  return <form className="caption-composer" onSubmit={async (event) => { event.preventDefault(); setSending(true); try { await action({ type: 'caption', text: text.trim() }); } finally { setSending(false); } }}>
    <div className="cinema-turn"><span>{t('captions.turn', { current: data.turn + 1, total: data.totalTurns })}</span><span aria-hidden>{"● REC"}</span></div>
    {data.frame && <figure className="cinema-phone-frame"><img src={serverResource(data.frame.url)} alt={t('captions.subtitle')}/><figcaption className={`film-subtitle subtitle-${data.frame.subtitlePosition}`}>{text || t('captions.placeholder')}</figcaption></figure>}
    <p className="small muted">{t('captions.private')}</p>
    {data.previousLines.length ? <details className="caption-history" open><summary>{t('captions.history')}</summary><ol>{data.previousLines.map((line) => <li key={line.id}><span>{line.frameIndex + 1}</span><p>{line.text}</p></li>)}</ol></details> : <p className="caption-first">{t('captions.first')}</p>}
    <label className="field-label">{t('captions.subtitle')}<textarea aria-label={t('captions.subtitle')} required maxLength={350} rows={3} placeholder={t('captions.placeholder')} value={text} onChange={(event) => setText(event.target.value)}/></label>
    <div className="answer-footer"><span>{text.length}/350</span><button className="button primary" disabled={sending || !text.trim()}>{sending ? <LoaderCircle className="spin" size={19}/> : <>{t('captions.submit')}<Check size={18}/></>}</button></div>
  </form>;
}

function CaptionPreparation({ room }: { room: RoomSnapshot }) {
  const { t } = useI18n();
  const story = room.me.captions?.presentation;
  if (!story) return <p>{t('captions.prepareWaiting')}</p>;
  return <section className="caption-preparation"><h2>{story.title}</h2><p>{t('captions.prepare')}</p><ol>{story.lines.map((line) => <li key={line.id}><img src={serverResource(story.scene.frames[line.frameIndex]!.url)} alt=""/><p>{line.text}</p></li>)}</ol></section>;
}

function CaptionPresentation({ room, request, host }: { room: RoomSnapshot; request: Request; host: boolean }) {
  const { t } = useI18n();
  const data = room.captions;
  const story = data?.currentStory;
  if (!data || !story) return null;
  const presenter = room.players.find((player) => player.id === story.presenterId);
  const canControl = host || story.presenterId === room.me.id;
  const frame = story.scene.frames[data.slideIndex];
  const line = story.lines.find((item) => item.frameIndex === data.slideIndex);
  return <div className="caption-presentation"><div className="speaker-badge">{presenter && <Avatar player={presenter}/>}<div><small>{story.presenterId === room.me.id ? t('captions.present') : t('captions.listen')}</small><h2>{presenter?.name}</h2></div></div>
    {frame && <figure className="cinema-phone-frame"><img src={serverResource(frame.url)} alt={story.title}/><figcaption className={`film-subtitle subtitle-${frame.subtitlePosition}`}>{line?.text}</figcaption></figure>}
    <p>{t('captions.manual')}</p><div className="cinema-turn"><span>{data.presentationIndex + 1} / {data.storyCount}</span><span>{data.slideIndex + 1} / {story.scene.frames.length}</span></div>
    {canControl && <div className="caption-slide-controls"><button className="button outline" disabled={data.slideIndex === 0} aria-label={t('captions.previous')} onClick={() => void request('room:caption-control', { direction: 'previous' })}><ArrowLeft size={19}/>{t('captions.previous')}</button><button className="button primary" disabled={data.slideIndex >= story.scene.frames.length - 1} aria-label={t('captions.next')} onClick={() => void request('room:caption-control', { direction: 'next' })}>{t('captions.next')}<ArrowRight size={19}/></button></div>}
    {host && <Toggle label={t('captions.automatic')} checked={data.autoSlides} onChange={(autoSlides) => void request('room:caption-control', { autoSlides })}/>}
  </div>;
}

function CaptionVoting({ room, action }: { room: RoomSnapshot; action: (data: Action) => Promise<Ack> }) {
  const { t } = useI18n();
  const stories = room.captions?.stories || [];
  const chosen = room.me.captions?.votes || {};
  const eligible = room.me.captions?.eligibleTargets;
  const [sending, setSending] = useState(false);
  const vote = async (award: 'film' | 'actor' | 'line', targetId: string) => { setSending(true); try { await action({ type: 'cinema-vote', award, targetId }); } finally { setSending(false); } };
  const actorName = (id: string) => room.players.find((player) => player.id === id)?.name || t('common.anonymous');
  return <div className="cinema-awards"><p>{t('captions.voteHelp')}</p>{(['film', 'actor', 'line'] as const).map((award) => <section className="cinema-award" key={award}><h2><Trophy size={21}/>{t(`captions.award${award[0].toUpperCase()}${award.slice(1)}`)}</h2><div className="vote-options">{(award === 'line' ? stories.flatMap((story) => story.lines.map((line) => ({ id: line.id, text: line.text, sub: story.title }))) : stories.map((story) => ({ id: award === 'actor' ? story.presenterId : story.id, text: award === 'actor' ? actorName(story.presenterId) : story.title, sub: award === 'actor' ? story.title : actorName(story.presenterId) }))).filter((option) => !eligible || eligible[award].includes(option.id)).map((option) => <button className={`vote-option ${chosen[award] === option.id ? 'selected' : ''}`} disabled={sending || (!!chosen[award] && !room.config.allowVoteChange)} key={option.id} onClick={() => void vote(award, option.id)}><span><strong>{option.text}</strong><small>{option.sub}</small></span>{chosen[award] === option.id ? <Check size={20}/> : <Plus size={18}/>}</button>)}</div>{chosen[award] && <p className="vote-confirmation"><Check size={16}/>{t('captions.voted')}</p>}</section>)}</div>;
}

function ControllerWaiting({ title, text }: { title: string; text: string }) {
  const { t } = useI18n();
  return <div className="controller-waiting"><motion.span animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}><Radio size={35}/></motion.span><h2>{title}</h2><p>{text}</p></div>;
}

function HostControls({ room, request }: { room: RoomSnapshot; request: Request }) {
  const { t } = useI18n();
  return <section className="panel controller-host-controls"><div className="eyebrow"><Crown size={15}/>{t('legacy.s262')}</div>
    {room.phase === "podium" ? <><button className="button primary full" onClick={() => void request("room:replay")}>{t('legacy.s263')}<Shuffle size={18}/></button><button className="button outline full" onClick={() => { void request("room:replay").then((ack) => { if (ack.ok) return request("room:configure", structuredClone(DEFAULT_CONFIG)); }); }}>{t('legacy.s264')}<Plus size={18}/></button></> : <button className="button primary" aria-label={t('legacy.s111')} onClick={() => void request("room:advance")}>{room.phase === "presenting" ? t('legacy.s265') : t('legacy.s111')}<ArrowRight size={18}/></button>}
    {room.phase !== "podium" && <button className="button outline" onClick={() => void request("room:pause", { paused: !room.paused })}>{room.paused ? <><Play size={17}/>{t('legacy.s266')}</> : <><Pause size={17}/>{t('legacy.s267')}</>}</button>}
    {room.round?.gameId === "who" && room.phase === "voting" && <button className="text-button" onClick={() => void request("room:advance", { skip: true })}>{t('legacy.s268')}<Shuffle size={16}/></button>}
    {room.phase === "presenting" && <p className="small muted">{t('legacy.s269')}</p>}
    {["writing", "prepare", "voting", "presenting"].includes(room.phase) && <details><summary>{t('legacy.s270')}</summary><p className="small muted">{t('legacy.s271')}</p><div className="skip-player-list">{room.players.filter((player) => !player.spectator).map((player) => <button className="text-button" key={player.id} onClick={() => void request("room:skip-player", { playerId: player.id })}>{t('legacy.s272')}{player.name}{!player.connected && " (déconnecté)"}</button>)}</div></details>}
  </section>;
}

function WritingForm({
  answer,
  submitted,
  action,
  notes = false,
}: {
  answer?: string;
  submitted: boolean;
  action: (data: Action) => Promise<Ack>;
  notes?: boolean;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(answer || "");
  const [busy, setBusy] = useState(false);
  if (submitted)
    return (
      <div className="submitted-state">
        <span>
          <Check size={33} />
        </span>
        <h2>
          {notes ? t('legacy.s273') : t('legacy.s274')}
        </h2>
        <p>
          {notes
            ? t('legacy.s275')
            : t('legacy.s276')}
        </p>
        {answer && <blockquote>{answer}</blockquote>}
      </div>
    );
  return (
    <form
      className="answer-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await action({ type: "answer", text: text.trim() });
        setBusy(false);
      }}
    >
      <label className="field-label">
        {notes ? t('legacy.s277') : t('legacy.s278')}
        <textarea
          aria-label={notes ? t('legacy.s279') : t('legacy.s280')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          minLength={1}
          maxLength={350}
          rows={4}
          placeholder={
            notes
              ? t('legacy.s281')
              : t('legacy.s282')
          }
        />
      </label>
      <div className="answer-footer">
        <span>
          {text.length}/350 ·{" "}
          {notes
            ? t('legacy.s283')
            : t('legacy.s284')}
        </span>
        <button className="button primary" disabled={busy || !text.trim()}>
          {busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <>
              {notes ? t('legacy.s285') : t('legacy.s286')}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ProductForm({ submitted, product, action, request }: { submitted: boolean; product?: { name: string; description: string }; action: (data: Action) => Promise<Ack>; request: Request; }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [suggestionToken, setSuggestionToken] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [replace, setReplace] = useState(false);
  const generate = async () => {
    setReplace(false); setGenerating(true);
    try { const ack = await request('room:product-suggestion'); const suggestion = ack.room?.me.productSuggestion; if (ack.ok && suggestion) { setName(suggestion.name); setDescription(suggestion.description); setSuggestionToken(suggestion.token); } } finally { setGenerating(false); }
  };
  if (submitted) return <div className="submitted-state"><span><Check size={33}/></span><h2>{t('pitch.submit')}</h2>{product && <ProductCard product={product}/>}</div>;
  return <form className="answer-form inventor-workshop" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await action({ type: 'product', name: name.trim(), description: description.trim(), suggestionToken }); } finally { setBusy(false); } }}>
    <div className="inventor-title"><Sparkles size={28}/><h2>{t('pitch.title')}</h2></div>
    <label className="field-label">{t('pitch.name')}<input aria-label={t('pitch.name')} required maxLength={70} value={name} onChange={(event) => setName(event.target.value)}/></label>
    <label className="field-label">{t('pitch.description')}<textarea aria-label={t('pitch.description')} required maxLength={220} rows={3} value={description} onChange={(event) => setDescription(event.target.value)}/></label>
    <button className={'house-decoy ' + (generating ? 'working' : '')} type="button" disabled={generating || busy} onClick={() => { if (name.trim() || description.trim()) setReplace(true); else void generate(); }}><span className="decoy-machine"><Zap size={30}/><Sparkles size={18}/></span><span><strong>{suggestionToken ? t('pitch.again') : t('pitch.decoy')}</strong><small>HOUSE DECOY</small></span>{generating ? <LoaderCircle className="spin" size={22}/> : <ArrowRight size={22}/>}</button>
    {replace && <div className="decoy-confirm" role="alert"><p>{t('pitch.replace')}</p><button type="button" className="button primary" onClick={() => void generate()}>{t('pitch.confirm')}</button><button type="button" className="button outline" onClick={() => setReplace(false)}>{t('pitch.keep')}</button></div>}
    {suggestionToken && <p className="fineprint">{t('pitch.generated')}</p>}
    {(name || description) && <motion.section className="invention-preview" key={suggestionToken || "manual"} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} aria-label={t('pitch.preview')}><span>{t('pitch.preview')}</span><ProductCard product={{ name, description }}/></motion.section>}
    <button className="button primary full" disabled={busy || generating || !name.trim() || !description.trim()}>{busy ? <LoaderCircle className="spin" size={18}/> : <>{t('pitch.submit')}<ArrowRight size={18}/></>}</button>
  </form>;
}
function ProductCard({
  product,
}: {
  product: { name: string; description: string };
}) {
  const { t } = useI18n();
  return (
    <div className="product-card">
      <span className="product-stamp">
        {t('legacy.s288')}<br />
        {t('legacy.s289')}</span>
      <Megaphone size={38} />
      <h2>{product.name}</h2>
      <p>{product.description}</p>
    </div>
  );
}
function SpectatorMessage() {
  const { t } = useI18n();
  return (
    <div className="spectator-message">
      <Monitor size={25} />
      <p>
        {t('legacy.s290')}<br />
        <strong>{t('legacy.s291')}</strong>
      </p>
    </div>
  );
}

function Voting({
  room,
  action,
}: {
  room: RoomSnapshot;
  action: (data: Action) => Promise<Ack>;
}) {
  const { t } = useI18n();
  const r = room.round!;
  const who = r.gameId === "who";
  const choices = who
    ? room.players
        .filter(
          (p) =>
            !p.spectator &&
            (room.config.allowSelfVoteWho || p.id !== room.me.id),
        )
        .map((p) => ({ id: p.id, text: p.name, player: p }))
    : r.answers
        .filter((a) => a.id !== room.me.answerId && a.authorId !== room.me.id)
        .map((a) => ({ id: a.id, text: a.text, player: undefined }));
  return (
    <div className="voting-content">
      <p className="vote-instruction">
        {room.me.voted
          ? room.config.allowVoteChange
            ? t('legacy.s292')
            : t('legacy.s293')
          : who
            ? t('legacy.s294')
            : t('legacy.s295')}
      </p>
      <div className={`vote-options ${who ? "player-votes" : ""}`}>
        {choices.map((choice, i) => (
          <button
            className={`vote-option ${room.me.vote === choice.id ? "selected" : ""}`}
            key={choice.id}
            disabled={room.me.voted && !room.config.allowVoteChange}
            onClick={() => void action({ type: "vote", targetId: choice.id })}
          >
            {choice.player ? (
              <Avatar player={choice.player} />
            ) : (
              <span className="answer-number">
                {String(i + 1).padStart(2, "0")}
              </span>
            )}
            <strong>{choice.text}</strong>
            <span className="vote-check">
              {room.me.vote === choice.id ? (
                <Check size={18} />
              ) : (
                <Plus size={18} />
              )}
            </span>
          </button>
        ))}
      </div>
      {room.me.voted && (
        <p className="vote-confirmation">
          <Check size={17} />
          {t('legacy.s296')}</p>
      )}
    </div>
  );
}
function PublicVoting({ room }: { room: RoomSnapshot }) {
  const { t } = useI18n();
  const r = room.round!;
  return (
    <div className="public-answers">
      {r.answers.map((a, i) => (
        <div className="vote-option" key={a.id}>
          <span className="answer-number">{i + 1}</span>
          <strong>{a.text}</strong>
        </div>
      ))}
    </div>
  );
}

function Ratings({
  room,
  action,
}: {
  room: RoomSnapshot;
  action: (data: Action) => Promise<Ack>;
}) {
  const { t } = useI18n();
  const products = (room.round?.currentProduct ? [room.round.currentProduct] : []).filter((p) => p.sellerId !== room.me.id);
  return (
    <div className="ratings">
      <p>
        {t('legacy.s297')}</p>
      {products.map((p) => (
        <RatingCard
          key={p.sellerId}
          product={p}
          player={room.players.find((x) => x.id === p.sellerId)}
          values={room.me.ratings?.[p.sellerId!]}
          allowChange={room.config.allowVoteChange}
          action={action}
        />
      ))}
    </div>
  );
}
function RatingCard({
  product,
  player,
  values,
  allowChange,
  action,
}: {
  product: { name: string; description: string; sellerId?: string };
  player?: PlayerView;
  values?: [number, number, number];
  allowChange: boolean;
  action: (data: Action) => Promise<Ack>;
}) {
  const { t } = useI18n();
  const [ratings, setRatings] = useState<[number, number, number]>(
    values || [3, 3, 3],
  );
  const [busy, setBusy] = useState(false);
  return (
    <div className="rating-card">
      <div className="speaker-badge">
        {player && <Avatar player={player} />}
        <div>
          <small>{player?.name || t('legacy.s245')}</small>
          <h3>{product.name}</h3>
        </div>
        {values && <Check size={21} />}
      </div>
      <div className="criteria">
        {["Humour", "Conviction", "Créativité"].map((label, i) => (
          <div key={label}>
            <span>{label}</span>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  disabled={!!values && !allowChange}
                  key={n}
                  aria-label={t('controller.ratingLabel', { criterion: label, value: n, name: player?.name || '' })}
                  aria-pressed={ratings[i] === n}
                  className={n <= ratings[i] ? "active" : ""}
                  onClick={() =>
                    setRatings(
                      (prev) =>
                        prev.map((v, k) => (k === i ? n : v)) as [
                          number,
                          number,
                          number,
                        ],
                    )
                  }
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        className="button outline full"
        disabled={busy || (!!values && !allowChange)}
        onClick={async () => {
          setBusy(true);
          await action({
            type: "rate",
            targetId: product.sellerId!,
            humor: ratings[0],
            conviction: ratings[1],
            creativity: ratings[2],
          });
          setBusy(false);
        }}
      >
        {values ? t('legacy.s299') : t('legacy.s300')}
        <Check size={17} />
      </button>
    </div>
  );
}




function CourtCast({ room }: { room: RoomSnapshot }) {
  const { t } = useI18n();
  const roles = room.round?.roles;
  if (!roles) return null;
  return (
    <div className="court-cast">
      {(["accused", "prosecutor", "defense", "judge"] as const).map((role) => {
        const p = room.players.find((x) => x.id === roles[role]);
        return p ? (
          <div key={role}>
            <Avatar player={p} />
            <small>{t(`court.roles.${role}`)}</small>
            <strong>{p.name}</strong>
          </div>
        ) : null;
      })}
    </div>
  );
}
function CourtVote({
  room,
  action,
}: {
  room: RoomSnapshot;
  action: (data: Action) => Promise<Ack>;
}) {
  const { t } = useI18n();
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [best, setBest] = useState(room.me.vote || "");
  const jury = room.round?.roles?.jurors.includes(room.me.id);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="court-vote"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        if (jury && verdict !== null)
          await action({
            type: "verdict",
            guilty: verdict,
            ...(best ? { bestPlayerId: best } : {}),
          });
        else if (best) await action({ type: "vote", targetId: best });
        setBusy(false);
      }}
    >
      {jury ? (
        <>
          <h2>{t('legacy.s301')}</h2>
          <p>
            {t('legacy.s302')}</p>
          <div className="verdict-options">
            <button
              type="button"
              aria-pressed={verdict === true}
              className={verdict === true ? "selected guilty" : ""}
              onClick={() => setVerdict(true)}
            >
              {t('legacy.s304')}<Gavel size={21} />
            </button>
            <button
              type="button"
              aria-pressed={verdict === false}
              className={verdict === false ? "selected innocent" : ""}
              onClick={() => setVerdict(false)}
            >
              {t('legacy.s306')}<Check size={21} />
            </button>
          </div>
        </>
      ) : (
        <>
          <h2>{t('legacy.s307')}</h2>
          <p>
            {t('legacy.s308')}</p>
        </>
      )}
      <label className="field-label">
        {t('legacy.s309')}<select
          aria-label={t('legacy.s310')}
          value={best}
          onChange={(e) => setBest(e.target.value)}
        >
          <option value="">{t('legacy.s311')}</option>
          {room.players
            .filter((p) => !p.spectator && p.id !== room.me.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.avatar} {p.name}
              </option>
            ))}
        </select>
      </label>
      <button
        className="button primary full"
        disabled={
          busy ||
          (jury ? verdict === null : !best) ||
          (room.me.voted && !room.config.allowVoteChange)
        }
      >
        {room.me.voted
          ? t('legacy.s312')
          : jury
            ? t('legacy.s313')
            : t('legacy.s314')}
        <Check size={18} />
      </button>
      {room.me.voted && (
        <p className="vote-confirmation">
          <Check size={17} />
          {t('legacy.s315')}</p>
      )}
    </form>
  );
}

function Results({ room }: { room: RoomSnapshot }) {
  const { t } = useI18n();
  const r = room.round!;
  const players = room.players;
  const p = (id: string) => players.find((x) => x.id === id);
  return (
    <div className="results-content">
      {r.verdict && (
        <div className={`verdict-stamp ${r.verdict}`}>
          <Gavel size={33} />
          {r.verdict === "guilty" ? t('legacy.s316') : t('legacy.s317')}
        </div>
      )}
      {r.title && (
        <div className="result-title">
          <Trophy size={28} />
          <h2>{r.title}</h2>
        </div>
      )}
      {r.answers.length > 0 && (
        <div className="revealed-answers">
          {r.answers.map((a) => (
            <motion.div className="revealed-answer" layout key={a.id}>
              <div>
                <p>« {a.text} »</p>
                <span>
                  {a.authorId && p(a.authorId)?.avatar}{" "}
                  {a.authorId ? p(a.authorId)?.name : t('legacy.s318')}
                </span>
              </div>
              <strong>
                {a.votes ?? 0}
                <small>{t('legacy.s319')}{a.votes === 1 ? "" : t('legacy.s320')}</small>
              </strong>
            </motion.div>
          ))}
        </div>
      )}
      {r.gameId === "pitch" &&
        r.products?.map((product) => (
          <div className="product-reveal" key={product.sellerId}>
            <Megaphone size={25} />
            <div>
              <h3>{product.name}</h3>
              <p>
                {t('legacy.s321')}<strong>{p(product.sellerId || "")?.name}</strong>
                {product.creatorId && (
                  <>
                    {" "}
                    {t('legacy.s322')}<strong>{p(product.creatorId)?.name}</strong>
                  </>
                )}
              </p>
            </div>
          </div>
        ))}
      {r.gameId === "who" && r.voteCounts && (
        <div className="who-results">
          {Object.entries(r.voteCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([id, count]) => {
              const found = p(id);
              return found ? (
                <div key={id}>
                  <Avatar player={found} />
                  <strong>{found.name}</strong>
                  <div className="vote-bar">
                    <i
                      style={{
                        width: `${(count / Math.max(1, r.eligibleCount)) * 100}%`,
                      }}
                    />
                  </div>
                  <span>
                    {count} {t('legacy.s319')}{count > 1 ? t('legacy.s320') : ""}
                  </span>
                </div>
              ) : null;
            })}
        </div>
      )}
      <div className="round-points">
        {r.results
          .filter((result) => result.points > 0)
          .map((result, index) => {
            const found = p(result.playerId);
            return found ? (
              <div key={`${result.playerId}-${index}`}>
                <Avatar player={found} />
                <div>
                  <strong>{found.name}</strong>
                  <small>
                    {result.reason}
                    {result.rating !== undefined
                      ? ` · ${result.rating.toFixed(1)}/5`
                      : ""}
                  </small>
                </div>
                <b>
                  +{result.points}
                  <span>{t('legacy.s166')}</span>
                </b>
              </div>
            ) : null;
          })}
      </div>
      {r.results.length === 0 && (
        <p className="lead">
          {t('legacy.s323')}</p>
      )}
      {r.votesByPlayer && !room.config.anonymousVotes && (
        <details className="vote-detail">
          <summary>{t('legacy.s324')}</summary>
          {Object.entries(r.votesByPlayer).map(([voter, target]) => (
            <p key={voter}>
              {p(voter)?.name} →{" "}
              {p(target)?.name ||
                r.answers.find((a) => a.id === target)?.text ||
                target}
            </p>
          ))}
        </details>
      )}
      <p className="results-joke">
        {t('legacy.s325')}</p>
    </div>
  );
}

function Leaderboard({
  room,
  compact = false,
  final = false,
}: {
  room: RoomSnapshot;
  compact?: boolean;
  final?: boolean;
}) {
  const { t } = useI18n();
  const rows = room.players
    .filter((p) => !p.spectator)
    .sort((a, b) => a.rank - b.rank || b.score - a.score);
  return (
    <section className={`panel leaderboard ${compact ? "compact" : ""}`}>
      <div className="panel-heading">
        <h2>
          <Trophy size={20} />
          {final ? t('legacy.s326') : t('legacy.s327')}
        </h2>
        <span className="small muted">{rows.length} {t('legacy.s328')}</span>
      </div>
      {!room.scoresVisible && !final ? (
        <div className="scores-hidden">
          <Eye size={31} />
          <h3>{t('legacy.s329')}</h3>
          <p>
            {t('legacy.s330')}{" "}
            {room.config.leaderboard === "final"
              ? t('legacy.s331')
              : t('legacy.s332')}
            .
          </p>
          <div className="hidden-players">
            {rows.map((p) => (
              <Avatar player={p} key={p.id} />
            ))}
          </div>
        </div>
      ) : (
        <div className="leaderboard-rows">
          {rows.map((p, i) => (
            <motion.div
              layout
              className={`leaderboard-row ${p.id === room.me.id ? "is-me" : ""}`}
              key={p.id}
            >
              <span className="rank">
                {p.rank || i + 1}
                {i === 0 && <Crown size={12} />}
              </span>
              <Avatar player={p} />
              <div className="leaderboard-name">
                <strong>
                  {p.name}
                  {p.id === room.me.id && <small> {t('legacy.s333')}</small>}
                </strong>
                {!compact && (
                  <small>
                    {p.roundWins} {t('legacy.s334')}{p.roundWins > 1 ? t('legacy.s320') : ""} {t('legacy.s335')}{p.roundWins > 1 ? t('legacy.s320') : ""} · {p.gameWins} {t('legacy.s336')}{p.gameWins > 1 ? "x" : ""} {t('legacy.s338')}{p.gameWins > 1 ? t('legacy.s320') : ""}
                    {final && p.bestGame ? ` · ${t(`court.awards.${p.bestGame}`)}` : ""}
                    {i > 0
                      ? ` · à ${Math.max(0, rows[i - 1].score - p.score)} pts du précédent`
                      : ""}
                  </small>
                )}
              </div>
              <div className="leaderboard-score">
                <strong>{p.score.toLocaleString("fr-FR")}</strong>
                {p.delta > 0 && <small>+{p.delta}</small>}
              </div>
              {!compact && (
                <span
                  className={`rank-change ${p.previousRank > p.rank ? "up" : ""}`}
                >
                  {p.previousRank > p.rank
                    ? `↑ ${p.previousRank - p.rank}`
                    : p.previousRank < p.rank
                      ? `↓ ${p.rank - p.previousRank}`
                      : "—"}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
      {final && (
        <details className="score-history">
          <summary>{t('legacy.s339')}</summary>
          {rows.map((p) => (
            <div key={p.id}>
              <h3>
                {p.avatar} {p.name}
              </h3>
              {p.history.length ? (
                p.history.map((h, i) => (
                  <p key={i}>
                    <span>
                      {gameInfo(h.gameId).shortName} · {h.reason}
                    </span>
                    <strong>+{h.points}</strong>
                  </p>
                ))
              ) : (
                <p>{t('legacy.s340')}</p>
              )}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

function Transition({ room }: { room: RoomSnapshot }) {
  const { t } = useI18n();
  const current = gameInfo(
    room.playlist[room.gameIndex]?.gameId || room.round?.gameId || "mythos",
  );
  const next = room.playlist[room.gameIndex + 1];
  const winners = room.players.filter((p) =>
    room.gameSummary?.winnerIds.includes(p.id),
  );
  const winningPoints = winners.length
    ? room.gameSummary?.points[winners[0].id] || 0
    : 0;
  return (
    <div className="transition-content">
      <div className="transition-star">✳</div>
      <span className="pill">{current.name} {t('legacy.s341')}</span>
      <h1>
        {t('legacy.s342')}<br />
        {t('legacy.s343')}</h1>
      <p className="lead">
        {t('legacy.s344')}</p>
      {room.scoresVisible && (
        <div className="transition-winner">
          <Trophy size={29} />
          <strong>
            {winners.map((p) => p.name).join(" & ") || t('legacy.s345')}
          </strong>
          <span>
            {winners.length > 1 ? t('legacy.s346') : t('legacy.s347')}{" "}
            · +{winningPoints} {t('legacy.s348')}</span>
        </div>
      )}
      <div className="next-game">
        <small>{t('legacy.s349')}</small>
        <h2>{next ? gameInfo(next.gameId).name : t('legacy.s350')}</h2>
        <ArrowRight size={26} />
      </div>
    </div>
  );
}



function Podium({
  room,
  request,
  host,
}: {
  room: RoomSnapshot;
  request: Request;
  host: boolean;
}) {
  const { t } = useI18n();
  const rows = room.players
    .filter((p) => !p.spectator)
    .sort((a, b) => a.rank - b.rank || b.score - a.score);
  return (
    <div className="podium-page">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 13.7) % 100}%`,
              background: GAMES[i % 5].color,
              animationDelay: `${(i % 7) * 0.2}s`,
              rotate: `${i * 31}deg`,
            }}
          />
        ))}
      </div>
      <div className="eyebrow">{t('legacy.s351')}</div>
      <h1>
        {t('legacy.s352')}<span className="purple-text">{t('legacy.s353')}</span>
      </h1>
      <p>{t('legacy.s354')}</p>
      <div className="podium-steps">
        {[1, 0, 2].map((index) => {
          const p = rows[index];
          return p ? (
            <div className={`podium-player podium-${index + 1}`} key={p.id}>
              <div className="podium-avatar">
                {index === 0 && <Crown className="winner-crown" size={39} />}
                <Avatar player={p} />
              </div>
              <h2>{p.name}</h2>
              <strong>
                {p.score.toLocaleString("fr-FR")} <small>{t('legacy.s166')}</small>
              </strong>
              <div className="podium-block">
                <span>{p.rank}</span>
                <small>
                  {index === 0
                    ? t('legacy.s355')
                    : index === 1
                      ? t('legacy.s356')
                      : t('legacy.s357')}
                </small>
              </div>
            </div>
          ) : null;
        })}
      </div>
      <Leaderboard room={room} final />
      {host ? (
        <button
          className="button primary large"
          onClick={() => void request("room:replay")}
        >
          {t('legacy.s358')}<Shuffle size={20} />
        </button>
      ) : (
        <p className="waiting-host">
          {t('legacy.s359')}</p>
      )}
    </div>
  );
}

interface AdminItem {
  id: string;
  gameId: GameId;
  prompt: string;
  category: string;
  adult?: boolean;
  mediaUrl?: string;
  product?: { name: string; description: string };
}
function Admin() {
  const { t } = useI18n();
  const empty = (): Partial<AdminItem> => ({
    gameId: "mythos",
    category: "absurde",
    adult: false,
    prompt: "",
  });
  const [token, setToken] = useState("");
  const [items, setItems] = useState<AdminItem[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminTab, setAdminTab] = useState<'content' | 'decoys' | 'cinema'>('content');
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<AdminItem | null>(null);
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Partial<AdminItem>>(empty);
  const [uploading, setUploading] = useState(false);
  const call = async (path: string, method = "GET", body?: unknown) => {
    const response = await serverFetch(`/api/admin/content${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Accès refusé ou action impossible.");
    return data;
  };
  const load = async () => {
    try {
      const data = await call("");
      setItems(data.items || []);
      setAuthenticated(true);
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const reset = () => {
    setSelected(null);
    setDraft(empty());
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setMessage("Choisissez une image de moins de 1 Mo.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("Lecture du fichier impossible."));
        reader.readAsDataURL(file);
      });
      const response = await serverFetch("/api/admin/media", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Téléversement impossible.");
      setDraft((d) => ({ ...d, mediaUrl: data.mediaUrl }));
      setMessage(
        "Image ajoutée. Enregistrez le contenu pour la rendre jouable.",
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <section className="page-width inner-page admin-page">
      <div className="eyebrow">
        <Shield size={15} /> {t('legacy.s360')}</div>
      <h1 className="page-title">{t('legacy.s361')}</h1>
      <p className="lead">
        {t('legacy.s362')}</p>
      {message && (
        <div role="status" className="admin-message">
          {message}
        </div>
      )}
      {!authenticated ? (
        <form
          className="panel admin-login"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <label className="field-label">
            {t('legacy.s363')}<input
              type="password"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="button primary">
            {t('legacy.s364')}<ArrowRight size={18} />
          </button>
          <p className="fineprint">
            {t('legacy.s365')}</p>
        </form>
      ) : (<><nav className="admin-tabs" aria-label={t('legacy.s028')}>{(['content','decoys','cinema'] as const).map((tab) => <button type="button" className={adminTab === tab ? 'selected' : ''} key={tab} aria-pressed={adminTab === tab} onClick={() => setAdminTab(tab)}>{t('admin.' + tab)}</button>)}</nav>{adminTab === 'decoys' ? <ProductAdmin token={token}/> : adminTab === 'cinema' ? <CinemaAdmin token={token}/> : <div className="admin-layout">
          <section className="panel">
            <div className="panel-heading">
              <h2>{t('legacy.s366')}{items.filter((item) => item.gameId !== "captions").length})</h2>
              <button
                className="icon-button"
                aria-label={t('legacy.s367')}
                onClick={() => void load()}
              >
                <Shuffle size={18} />
              </button>
            </div>
            <select
              aria-label={t('legacy.s368')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">{t('legacy.s369')}</option>
              {GAMES.filter((g) => g.id !== "captions").map((g) => (
                <option key={g.id} value={g.id}>
                  {g.shortName}
                </option>
              ))}
            </select>
            <div className="admin-items">
              {items
                .filter((item) => item.gameId !== "captions" && (filter === "all" || item.gameId === filter))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelected(item);
                      setDraft(item);
                    }}
                    className={selected?.id === item.id ? "selected" : ""}
                  >
                    <small>
                      {gameInfo(item.gameId).shortName} · {item.category}
                      {item.adult ? t('legacy.s370') : ""}
                    </small>
                    <strong>{item.prompt}</strong>
                  </button>
                ))}
            </div>
          </section>
          <form
            className="panel admin-editor"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const { id: _id, ...body } = draft;
                await call(
                  selected ? `/${selected.id}` : "",
                  selected ? "PUT" : "POST",
                  body,
                );
                await load();
                reset();
                setMessage("Contenu enregistré.");
              } catch (err) {
                setMessage((err as Error).message);
              }
            }}
          >
            <div className="panel-heading">
              <h2>{selected ? t('legacy.s371') : t('legacy.s372')}</h2>
              <button
                type="button"
                className="icon-button"
                aria-label={t('legacy.s372')}
                onClick={reset}
              >
                <Plus size={19} />
              </button>
            </div>
            <label className="field-label">
              {t('legacy.s373')}<select
                value={draft.gameId}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    gameId: e.target.value as GameId,
                    product: undefined,
                    mediaUrl: undefined,
                  })
                }
              >
                {GAMES.filter((g) => g.id !== "captions").map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              {t('legacy.s374')}<textarea
                required
                rows={4}
                maxLength={500}
                minLength={3}
                value={draft.prompt || ""}
                onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
              />
            </label>
            <label className="field-label">
              {t('legacy.s375')}<input
                required
                maxLength={40}
                value={draft.category || ""}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              />
            </label>
            {draft.gameId === "pitch" && (
              <>
                <label className="field-label">
                  {t('legacy.s376')}<input
                    required
                    maxLength={70}
                    value={draft.product?.name || ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        product: {
                          name: e.target.value,
                          description: draft.product?.description || "",
                        },
                      })
                    }
                  />
                </label>
                <label className="field-label">
                  {t('legacy.s377')}<textarea
                    required
                    maxLength={220}
                    value={draft.product?.description || ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        product: {
                          name: draft.product?.name || "",
                          description: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              </>
            )}
            {draft.gameId === "captions" && (
              <>
                <label className="field-label">
                  {t('legacy.s378')}<input
                    required
                    type="text"
                    placeholder={t('legacy.s379')}
                    pattern="/media/.+"
                    value={draft.mediaUrl || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, mediaUrl: e.target.value })
                    }
                  />
                </label>
                <label className="field-label">
                  {uploading
                    ? t('legacy.s380')
                    : t('legacy.s381')}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={uploading}
                    onChange={(e) => void upload(e.target.files?.[0])}
                  />
                </label>
                {draft.mediaUrl && (
                  <div className="prompt-media">
                    <img
                      src={serverResource(draft.mediaUrl)}
                      alt={t('legacy.s382')}
                    />
                  </div>
                )}
              </>
            )}
            <Toggle
              label={t('legacy.s141')}
              checked={!!draft.adult}
              onChange={(adult) => setDraft({ ...draft, adult })}
            />
            <button disabled={uploading} className="button primary full">
              {t('legacy.s383')}<Check size={18} />
            </button>
            {selected && (
              <button
                type="button"
                className="button outline full danger"
                onClick={async () => {
                  try {
                    await call(`/${selected.id}`, "DELETE");
                    await load();
                    reset();
                    setMessage("Contenu supprimé.");
                  } catch (err) {
                    setMessage((err as Error).message);
                  }
                }}
              >
                {t('legacy.s384')}<Trash2 size={17} />
              </button>
            )}
          </form>
        </div>}</>
      )}
    </section>
  );
}

export default function LocalizedApp() {
  return <I18nProvider><App /></I18nProvider>; }
