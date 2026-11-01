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

const socket: Socket<ServerEvents, ClientEvents> = io({
  autoConnect: true,
  reconnection: true,
});
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
const gameInfo = (id: GameId) => GAMES.find((g) => g.id === id)!;
const styleColor = (color: string) => ({ "--accent": color }) as CSSProperties;

function BrandMark() {
  return (
    <>
      EN VR<span className="logo-i">I</span>LLE
      <span className="logo-spark" aria-hidden="true">✳</span>
    </>
  );
}

function Mascot({ small = false }: { small?: boolean }) {
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
  const { preference: theme, setPreference: setTheme, isDark } = useTheme();
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [dialog, setDialog] = useState<"create" | "join" | "settings" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [volume, setVolume] = useState(() => saved("vrille-volume", 35));
  const [reduced, setReduced] = useState(() =>
    saved(
      "vrille-reduced",
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  );
  const [toast, setToast] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const lastPhase = useRef("");
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
            sessionStorage.setItem(
              "vrille-session",
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
    const connect = () => {
      setConnected(true);
      try {
        const s = JSON.parse(
          sessionStorage.getItem("vrille-session") || "null",
        ) as Session | null;
        if (s && resumedSocket.current !== socket.id) {
          resumedSocket.current = socket.id;
          void request("room:resume", s).then((ack) => {
            if (!ack.ok) sessionStorage.removeItem("vrille-session");
          });
        }
      } catch {
        sessionStorage.removeItem("vrille-session");
      }
    };
    const disconnect = () => setConnected(false);
    socket.on("connect", connect);
    socket.on("disconnect", disconnect);
    socket.on("room:state", setRoom);
    socket.on("server:error", setError);
    if (socket.connected) connect();
    return () => {
      socket.off("connect", connect);
      socket.off("disconnect", disconnect);
      socket.off("room:state", setRoom);
      socket.off("server:error", setError);
    };
  }, [request]);
  useEffect(() => {
    localStorage.setItem("vrille-volume", JSON.stringify(volume));
  }, [volume]);
  useEffect(() => {
    localStorage.setItem("vrille-reduced", JSON.stringify(reduced));
  }, [reduced]);
  useEffect(() => {
    if (!room) return;
    if (
      lastPhase.current &&
      lastPhase.current !== room.phase &&
      volume > 0 &&
      audio.current
    ) {
      const ctx = audio.current;
      const gain = ctx.createGain();
      const tone = ctx.createOscillator();
      gain.gain.setValueAtTime(volume / 600, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      tone.type = "sine";
      tone.frequency.setValueAtTime(
        room.phase === "results" ? 660 : 440,
        ctx.currentTime,
      );
      tone.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16);
      tone.connect(gain);
      gain.connect(ctx.destination);
      tone.start();
      tone.stop(ctx.currentTime + 0.23);
    }
    lastPhase.current = room.phase;
  }, [room?.phase, volume]);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("room")) setDialog("join");
  }, []);
  const unlockAudio = () => {
    if (!audio.current) {
      try {
        audio.current = new AudioContext();
      } catch {
        /* audio is optional */
      }
    }
    void audio.current?.resume();
  };
  const leave = async () => {
    const ack = await request("room:leave");
    if (ack.ok) {
      sessionStorage.removeItem("vrille-session");
      setRoom(null);
      setScreen("home");
      setError("");
    }
  };
  const admin = location.pathname.startsWith("/admin");
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <div
        className={`app ${room ? "in-room" : ""} ${reduced ? "reduce-motion" : ""}`}
        onPointerDown={unlockAudio}
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
            aria-label="EN VRILLE, accueil"
          >
            <BrandMark />
          </button>
          {!room && !admin && (
            <nav className="desktop-nav" aria-label="Navigation principale">
              <button
                className={screen === "games" ? "nav-active" : ""}
                onClick={() => setScreen("games")}
              >
                Les mini-jeux <span>05</span>
              </button>
              <button
                className={screen === "rules" ? "nav-active" : ""}
                onClick={() => setScreen("rules")}
              >
                Comment jouer
              </button>
            </nav>
          )}
          <div className="header-actions">
            {room && (
              <span className="room-chip">
                SALON <strong>{room.code}</strong>
              </span>
            )}
            <span
              className={`connection ${connected ? "online" : ""}`}
              title={connected ? "Connecté au serveur" : "Reconnexion en cours"}
            >
              <i />
              <span className="connection-label">{connected ? "En direct" : "Reconnexion"}</span>
            </span>
            <button
              className="icon-button theme-toggle"
              aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
              title={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              className="icon-button"
              aria-label="Réglages du son et des animations"
              onClick={() => setDialog("settings")}
            >
              <Settings size={20} />
            </button>
            {room && (
              <button
                className="icon-button"
                onClick={() => void leave()}
                aria-label="Quitter le salon"
              >
                <LogOut size={19} />
              </button>
            )}
          </div>
        </header>
        {!connected && (
          <div className="connection-banner" role="status">
            <LoaderCircle size={16} className="spin" /> Connexion au serveur…
            Votre partie est conservée.
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button aria-label="Fermer l’erreur" onClick={() => setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
        <main>
          {admin ? (
            <Admin />
          ) : room ? (
            <Room room={room} request={request} notify={notify} />
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
                  <Home
                    create={() => setDialog("create")}
                    join={() => setDialog("join")}
                    games={() => setScreen("games")}
                    rules={() => setScreen("rules")}
                  />
                ) : screen === "games" ? (
                  <GameCatalogue create={() => setDialog("create")} />
                ) : (
                  <Rules create={() => setDialog("create")} />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
        {!room && (
          <footer className="site-footer">
            <span className="footer-logo"><BrandMark /></span>
            <p>Des bons potes. Des mauvaises idées.</p>
            <span>Fait pour jouer ensemble.</span>
            <a href="/admin" aria-label="Administration des contenus">
              <Shield size={16} />
            </a>
          </footer>
        )}
        <AnimatePresence>
          {dialog && (
            <Modal
              title={
                dialog === "settings"
                  ? "À votre sauce."
                  : dialog === "create"
                    ? "On lance les hostilités ?"
                    : "Le gang vous attend."
              }
              close={() => setDialog(null)}
            >
              {dialog === "settings" ? (
                <div className="settings-content">
                  <label className="field-label">
                    Thème de l’interface
                    <select
                      className="theme-select"
                      aria-label="Thème de l’interface"
                      value={theme}
                      onChange={(event) => setTheme(event.target.value as ThemePreference)}
                    >
                      <option value="system">Automatique (selon l’appareil)</option>
                      <option value="light">Clair</option>
                      <option value="dark">Sombre</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Volume des effets <strong>{volume}%</strong>
                    <input
                      aria-label="Volume des effets"
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                  </label>
                  <Toggle
                    label="Réduire les animations"
                    description="Un peu moins de mouvement, toujours autant de mauvaise foi."
                    checked={reduced}
                    onChange={setReduced}
                  />
                  <button
                    className="button primary full"
                    onClick={() => setDialog(null)}
                  >
                    C’est tout bon <Check size={18} />
                  </button>
                </div>
              ) : (
                <IdentityForm
                  mode={dialog}
                  busy={busy}
                  submit={async (data) => {
                    setBusy(true);
                    const ack = await request(
                      dialog === "create" ? "room:create" : "room:join",
                      data,
                    );
                    setBusy(false);
                    if (ack.ok) setDialog(null);
                  }}
                />
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
    </MotionConfig>
  );
}

function Home({
  create,
  join,
  games,
  rules,
}: {
  create: () => void;
  join: () => void;
  games: () => void;
  rules: () => void;
}) {
  return (
    <>
      <section className="hero page-width">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-star">✳</span> LA SOIRÉE VA PARTIR EN VRILLE
          </div>
          <h1>
            De bons amis.
            <br />
            De très <span className="title-underline">mauvaises</span>
            <br />
            <span className="tilt-word">idées.</span>
            <span className="title-asterisk">✳</span>
          </h1>
          <p className="hero-description">
            Le jeu de soirée qui révèle le pire de votre imagination. Bluffez,
            improvisez, votez… et assumez les dégâts.
          </p>
          <div className="hero-actions">
            <button className="button primary large" onClick={create}>
              Créer une partie <ArrowUp className="diagonal-arrow" size={22} />
            </button>
            <button className="button outline large" onClick={join}>
              Rejoindre un salon <ArrowRight size={21} />
            </button>
          </div>
          <div className="hero-facts">
            <span>
              <Users size={17} />3 à 12 joueurs
            </span>
            <span>
              <Gamepad2 size={18} />
              Sur tous vos écrans
            </span>
            <span>
              <Check size={17} />
              Sans compte
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-topline">
            <span>
              <i /> MAUVAISE FOI EN DIRECT
            </span>
            <span>
              REC <span className="rec-dot">●</span>
            </span>
          </div>
          <div className="orbital orbital-one" />
          <div className="orbital orbital-two" />
          <div className="art-doodle doodle-a">✳</div>
          <div className="art-doodle doodle-b">✴</div>
          <div className="floating-card card-lie">
            <span className="mini-avatar">👽</span>
            <div>
              « C’est pas moi.
              <br />
              <strong>C’est mon personnage. »</strong>
            </div>
          </div>
          <motion.div
            className="hero-mascot"
            animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <Mascot />
          </motion.div>
          <div className="floating-card card-vote">
            <div className="vote-symbol">
              <Trophy size={23} />
            </div>
            <div>
              <span>LE JURY EST FORMEL.</span>
              <strong>Vous êtes un danger.</strong>
            </div>
            <span className="vote-sticker">+150</span>
          </div>
          <div className="sticker-orange">
            100%
            <br />
            <strong>mauvaise foi</strong>
            <span>↗</span>
          </div>
          <div className="art-caption">
            <span>VOTRE TALENT N’EST PAS REQUIS.</span>
            <ArrowDown size={17} />
          </div>
        </div>
      </section>
      <div className="ticker" aria-hidden="true">
        <div>
          DES AMIS <span>✳</span> DES MYTHOS <span>✳</span> DES DÉBATS NULS{" "}
          <span>✳</span> ZÉRO DIGNITÉ <span>✳</span> UN MAX DE DOSSIERS{" "}
          <span>✳</span> DES AMIS <span>✳</span> DES MYTHOS <span>✳</span>{" "}
          DES DÉBATS NULS <span>✳</span>
        </div>
      </div>
      <section className="games-section page-width">
        <div className="section-heading">
          <div>
            <div className="eyebrow">LE PROGRAMME DES RÉJOUISSANCES</div>
            <h2>5 jeux. Aucune retenue.</h2>
          </div>
          <button className="text-button" onClick={games}>
            Explorer les jeux <ArrowUp className="diagonal-arrow" size={20} />
          </button>
        </div>
        <div className="game-grid">
          {GAMES.map((g, i) => (
            <GameCard key={g.id} id={g.id} index={i} onClick={games} />
          ))}
        </div>
      </section>
      <section className="how-banner page-width">
        <div className="how-heading">
          <span className="how-star">✳</span>
          <h2>
            Le plan est simple.
            <br />
            Le reste, beaucoup moins.
          </h2>
          <button className="text-button" onClick={rules}>
            Comment ça marche <ArrowRight size={20} />
          </button>
        </div>
        <div className="how-steps">
          {[
            [
              "01",
              "Créez votre salon",
              "Un code à partager. Un QR à scanner. Et c’est tout.",
            ],
            [
              "02",
              "Rassemblez le gang",
              "Chacun son téléphone ou son ordi. La télé, c’est bonus.",
            ],
            [
              "03",
              "Lâchez les mauvaises idées",
              "Choisissez vos jeux. Le talent est facultatif.",
            ],
          ].map(([n, title, text]) => (
            <div key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function GameCard({
  id,
  index,
  onClick,
}: {
  id: GameId;
  index: number;
  onClick: () => void;
}) {
  const g = gameInfo(id);
  const Icon = icons[id];
  return (
    <button
      className={`game-card game-${id}`}
      style={styleColor(g.color)}
      onClick={onClick}
    >
      <div className="game-card-top">
        <span className="game-number">0{index + 1}</span>
        <ArrowUp className="diagonal-arrow" size={20} />
      </div>
      <div className="game-illustration">
        <Icon size={49} strokeWidth={1.7} />
        <span className="game-doodle">
          {id === "mythos"
            ? "?!"
            : id === "pitch"
              ? "€€"
              : id === "court"
                ? "OBJECTION !"
                : id === "who"
                  ? "?"
                  : "…"}
        </span>
      </div>
      <div className="game-card-copy">
        <h3>{g.shortName}</h3>
        <p>{g.description}</p>
        <span className="game-meta">
          {g.minPlayers}–12 JOUEURS <span>·</span> {g.duration}
        </span>
      </div>
    </button>
  );
}

function GameCatalogue({ create }: { create: () => void }) {
  const [expanded, setExpanded] = useState<GameId>("mythos");
  return (
    <section className="page-width inner-page">
      <div className="eyebrow">VOTRE PROGRAMME POUR CE SOIR</div>
      <h1 className="page-title">
        Cinq façons de
        <br />
        <span className="purple-text">perdre toute crédibilité.</span>
      </h1>
      <p className="lead">
        Un seul salon, autant de mauvaises idées que vous voulez. Composez votre
        soirée ou laissez le hasard s’en charger.
      </p>
      <div className="catalogue-list">
        {GAMES.map((g, i) => {
          const Icon = icons[g.id];
          return (
            <article
              key={g.id}
              className="catalogue-item"
              style={styleColor(g.color)}
            >
              <button
                className="catalogue-title"
                onClick={() => setExpanded(g.id)}
                aria-expanded={expanded === g.id}
              >
                <span className="catalogue-icon">
                  <Icon size={30} />
                </span>
                <span>
                  <small>
                    JEU 0{i + 1} · {g.minPlayers} À 12 JOUEURS · {g.duration}
                  </small>
                  <h2>{g.name}</h2>
                </span>
                <ChevronDown className={expanded === g.id ? "rotated" : ""} />
              </button>
              {expanded === g.id && (
                <div className="catalogue-detail">
                  <p>{g.description}</p>
                  <p>{gameRules[g.id]}</p>
                  <div className="pill">
                    {g.id === "pitch"
                      ? "Produits du jeu ou inventés par vos amis · notes sur 3 critères"
                      : g.id === "court"
                        ? "Rôles tournants · jury secret · égalité = acquittement"
                        : g.id === "who"
                          ? "100 points si vous trouvez le favori · 50 points pour la cible"
                          : "100 points par vote · 150 points de bonus au gagnant"}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <button className="button primary large" onClick={create}>
        Composer ma soirée <ArrowRight size={20} />
      </button>
    </section>
  );
}
const gameRules: Record<GameId, string> = {
  mythos:
    "Répondez à une question improbable, puis votez pour la meilleure explication. Les réponses sont anonymes jusqu’à la révélation et impossible de voter pour soi.",
  pitch:
    "Préparez une vente à l’oral. Si vous inventez les objets, le jeu les échange : personne ne vend sa propre invention. Notez l’humour, la conviction et la créativité de chaque vendeur de 1 à 5.",
  court:
    "Un accusé, un procureur, un avocat et un juge : tout le monde a un rôle. Le juge guide le procès, les jurés votent en secret et chacun peut récompenser la meilleure intervention.",
  who: "Une question sur votre groupe. Désignez la personne qui colle le mieux à la description. Les votes sont secrets et la personne la plus citée gagne un titre dont elle se serait bien passée.",
  captions:
    "Une image originale, vos pires sous-titres. Écrivez une légende, découvrez celles des autres et votez pour votre préférée. Les auteurs ne seront révélés qu’après les votes.",
};

function Rules({ create }: { create: () => void }) {
  return (
    <section className="page-width inner-page rules-page">
      <div className="eyebrow">ÇA SE COMPREND AVANT LA PREMIÈRE CHIPS</div>
      <h1 className="page-title">On joue comment ?</h1>
      <div className="rules-layout">
        <div>
          {[
            [
              "1",
              "Un hôte, un salon.",
              "Cliquez sur « Créer une partie », choisissez un pseudo et partagez le code. Aucun compte à créer.",
            ],
            [
              "2",
              "Chacun sa manette.",
              "Un navigateur sur votre téléphone ou votre ordinateur suffit. Pour une soirée canapé, ouvrez l’écran TV depuis le lobby. En ligne, retrouvez vos amis sur votre appel vocal habituel.",
            ],
            [
              "3",
              "Votre soirée, vos règles.",
              "L’hôte compose une playlist avec les cinq jeux ou choisit le mode aléatoire. Les durées, le vote, les catégories et le classement sont réglables.",
            ],
            [
              "4",
              "Écrivez. Barrez. Assumez.",
              "Suivez les consignes de chaque jeu. Les votes, le chrono, les résultats et les points sont synchronisés automatiquement. Les absents ne bloquent pas le jeu.",
            ],
            [
              "5",
              "Le podium n’oublie rien.",
              "Le classement cumule les points de toute la soirée. En cas d’égalité, les vainqueurs partagent leur victoire. Une reconnexion retrouve votre place.",
            ],
          ].map(([n, title, text]) => (
            <article className="rule" key={n}>
              <span>{n}</span>
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        <aside className="rules-aside">
          <Mascot small />
          <h3>La seule vraie règle ?</h3>
          <p>
            On rit ensemble. Adaptez les catégories et le mode adulte à votre
            groupe. La mauvaise foi est autorisée, la méchanceté beaucoup moins.
          </p>
          <button className="button primary full" onClick={create}>
            C’est parti <ArrowRight size={18} />
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
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
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
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 30, rotate: -1 }}
        animate={{ y: 0, rotate: 0 }}
      >
        <button
          className="icon-button modal-close"
          aria-label="Fermer"
          onClick={close}
        >
          <X size={21} />
        </button>
        <div className="eyebrow">EN VRILLE ✳</div>
        <h2>{title}</h2>
        {children}
      </motion.div>
    </motion.div>
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
  }) => void;
}) {
  const params = new URLSearchParams(location.search);
  const [name, setName] = useState(() => saved("vrille-name", ""));
  const [avatar, setAvatar] = useState(() =>
    saved("vrille-avatar", AVATARS[0]),
  );
  const [code, setCode] = useState(params.get("room")?.toUpperCase() || "");
  const [spectator, setSpectator] = useState(params.get("screen") === "1");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        localStorage.setItem("vrille-name", JSON.stringify(name));
        localStorage.setItem("vrille-avatar", JSON.stringify(avatar));
        submit({
          name: spectator ? "Écran TV" : name.trim(),
          avatar,
          ...(mode === "join"
            ? { code: code.toUpperCase().trim(), spectator }
            : {}),
        });
      }}
    >
      {mode === "join" && (
        <label className="field-label">
          Code du salon
          <input
            className="code-input"
            aria-label="Code du salon"
            maxLength={6}
            minLength={6}
            required
            placeholder="ABCDEF"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
          />
        </label>
      )}
      {!spectator && (
        <>
          <label className="field-label">
            Ton pseudo
            <input
              aria-label="Ton pseudo"
              placeholder="La légende du canapé"
              maxLength={22}
              minLength={2}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <fieldset className="avatar-picker">
            <legend>Choisissez votre tête de vainqueur</legend>
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
          label="Mode écran TV"
          description="Affichage collectif sans participer ni voter."
        />
      )}
      <button className="button primary full" type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle className="spin" size={20} />
        ) : mode === "create" ? (
          <>
            Créer un salon <ArrowRight size={20} />
          </>
        ) : (
          <>
            Rejoindre le salon <ArrowRight size={20} />
          </>
        )}
      </button>
      <p className="fineprint">
        Pas de compte, pas de téléchargement. Juste vous.
      </p>
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

function Room({
  room,
  request,
  notify,
}: {
  room: RoomSnapshot;
  request: Request;
  notify: (v: string) => void;
}) {
  const host = room.me.id === room.hostId;
  const me = room.players.find((p) => p.id === room.me.id);
  return (
    <div
      data-testid="phase"
      data-phase={room.phase}
      className={`room-page page-width ${me?.spectator ? "tv-mode" : ""}`}
    >
      {room.phase === "lobby" ? (
        <Lobby room={room} request={request} notify={notify} host={host} />
      ) : (
        <Gameplay
          room={room}
          request={request}
          host={host}
          spectator={!!me?.spectator}
        />
      )}
    </div>
  );
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
  const [config, setConfig] = useState(room.config);
  const [advanced, setAdvanced] = useState(false);
  const [starting, setStarting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    void fetch("/api/catalog")
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
            <i className="live-dot" /> LE CALME AVANT LA VRILLE
          </div>
          <h1>Tout le monde est là ?</h1>
          <p>Rameutez le gang. Préparez les mauvaises idées.</p>
        </div>
        <span className="status-pill">
          <Users size={17} />
          {active.length}/12 joueurs
        </span>
      </div>
      <div className="lobby-layout">
        <div className="lobby-left">
          <section className="panel invite-panel">
            <div>
              <span className="eyebrow">LE CODE POUR ENTRER</span>
              <div data-testid="room-code" className="room-code">
                {room.code}
              </div>
              <button className="text-button" onClick={() => void copy()}>
                <Copy size={16} />
                Copier l’invitation
              </button>
              <a className="invite-url" href={room.inviteUrl}>
                {room.inviteUrl}
              </a>
            </div>
            <div className="qr-wrap">
              <QRCodeSVG value={room.inviteUrl} size={104} marginSize={1} />
              <small>SCANNEZ. DÉBARQUEZ.</small>
            </div>
          </section>
          <section className="panel players-panel">
            <div className="panel-heading">
              <h2>
                Le casting <span>{active.length}</span>
              </h2>
              <span className="muted small">
                {active.filter((p) => p.ready).length} prêts
              </span>
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
                        <span className="muted">(vous)</span>
                      )}
                    </strong>
                    <small>
                      {p.spectator
                        ? "Écran spectateur"
                        : p.id === room.hostId
                          ? "Chef d’orchestre du chaos"
                          : !p.connected
                            ? "Reconnexion…"
                            : p.ready
                              ? "Prêt à en découdre"
                              : "Échauffe sa mauvaise foi"}
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
                aria-label="Je suis prêt"
                className={`button full ${me.ready ? "green" : "outline"}`}
                onClick={() => void request("room:ready", { ready: !me.ready })}
              >
                {me.ready ? (
                  <>
                    <Check size={19} />
                    Je suis prêt !
                  </>
                ) : (
                  <>
                    Je suis prêt <Check size={19} />
                  </>
                )}
              </button>
            )}
            <a
              className="tv-link"
              target="_blank"
              rel="noreferrer"
              href={`${room.inviteUrl}${room.inviteUrl.includes("?") ? "&" : "?"}screen=1`}
            >
              <Monitor size={17} />
              Ouvrir un écran TV
              <ExternalLink size={14} />
            </a>
          </section>
          <div className="lobby-tip">
            <Sparkles size={21} />
            <p>
              Le talent est facultatif.
              <br />
              <strong>Le téléphone chargé, c’est mieux.</strong>
            </p>
          </div>
        </div>
        <section className="panel playlist-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LE MENU DE CE SOIR</span>
              <h2>Votre dose de chaos.</h2>
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
              Sur mesure
            </button>
            <button
              disabled={!host}
              className={config.mode === "random" ? "selected" : ""}
              onClick={() => update("mode", "random")}
            >
              <Shuffle size={17} />
              Surprise !
            </button>
          </div>
          {config.mode === "custom" ? (
            <>
              <div className="playlist-items">
                {config.playlist.map((item, i) => {
                  const g = gameInfo(item.gameId);
                  const Icon = icons[item.gameId];
                  return (
                    <div className="playlist-item" key={`${i}-${item.gameId}`}>
                      <span
                        className="playlist-icon"
                        style={{ background: g.color }}
                      >
                        <Icon size={22} />
                      </span>
                      <div className="playlist-info">
                        <strong>{g.shortName}</strong>
                        <small>{g.minPlayers} joueurs minimum</small>
                        {item.gameId === "pitch" && (
                          <select
                            aria-label={`Mode des produits ${i + 1}`}
                            disabled={!host}
                            value={item.pitchMode || "random"}
                            onChange={(e) =>
                              update(
                                "playlist",
                                config.playlist.map((p, n) =>
                                  n === i
                                    ? {
                                        ...p,
                                        pitchMode: e.target.value as
                                          | "random"
                                          | "invented",
                                      }
                                    : p,
                                ),
                              )
                            }
                          >
                            <option value="invented">
                              Inventés par les joueurs
                            </option>
                            <option value="random">Produits du jeu</option>
                          </select>
                        )}
                      </div>
                      <label className="round-count">
                        <span>Manches</span>
                        <input
                          type="number"
                          aria-label={`Manches ${g.shortName} ${i + 1}`}
                          min="1"
                          max="10"
                          disabled={!host}
                          value={item.rounds}
                          onChange={(e) =>
                            update(
                              "playlist",
                              config.playlist.map((p, n) =>
                                n === i
                                  ? {
                                      ...p,
                                      rounds: Math.max(
                                        1,
                                        Math.min(10, Number(e.target.value)),
                                      ),
                                    }
                                  : p,
                              ),
                            )
                          }
                        />
                      </label>
                      {host && (
                        <div className="playlist-controls">
                          <button
                            className="mini-button"
                            aria-label={`Monter ${g.shortName} ${i + 1}`}
                            disabled={i === 0}
                            onClick={() => reorder(i, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            className="mini-button"
                            aria-label={`Descendre ${g.shortName} ${i + 1}`}
                            disabled={i === config.playlist.length - 1}
                            onClick={() => reorder(i, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            className="mini-button remove"
                            aria-label={`Supprimer ${g.shortName} ${i + 1}`}
                            onClick={() =>
                              update(
                                "playlist",
                                config.playlist.filter((_, n) => n !== i),
                              )
                            }
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {config.playlist.length === 0 && (
                <p className="empty-message">
                  Le programme est un peu vide. Ajoutez votre premier jeu !
                </p>
              )}
              {host && (
                <div className="add-game-row">
                  <span>AJOUTER AU PROGRAMME</span>
                  <div>
                    {GAMES.map((g) => (
                      <button
                        className="add-game"
                        disabled={config.playlist.length >= 12}
                        key={g.id}
                        onClick={() => add(g.id)}
                        style={{ background: g.color }}
                      >
                        <Plus size={14} />
                        {g.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="random-settings">
              <p>Le hasard fait bien les choses. Ou vraiment n’importe quoi.</p>
              <div className="field-grid">
                <NumberField
                  label="Nombre de jeux"
                  value={config.randomCount}
                  min={1}
                  max={12}
                  disabled={!host}
                  onChange={(v) => update("randomCount", v)}
                />
                <NumberField
                  label="Manches par jeu (0 = aléatoire)"
                  value={config.randomRounds}
                  min={0}
                  max={5}
                  disabled={!host}
                  onChange={(v) => update("randomRounds", v)}
                />
                <NumberField
                  label="Durée visée (minutes)"
                  value={config.approximateMinutes}
                  min={5}
                  max={180}
                  disabled={!host}
                  onChange={(v) => update("approximateMinutes", v)}
                />
              </div>
              <span className="field-label">Les jeux dans le chapeau</span>
              <div className="allowed-games">
                {GAMES.map((g) => (
                  <button
                    key={g.id}
                    disabled={!host}
                    aria-pressed={config.allowedGames.includes(g.id)}
                    className={
                      config.allowedGames.includes(g.id) ? "selected" : ""
                    }
                    onClick={() =>
                      update(
                        "allowedGames",
                        config.allowedGames.includes(g.id)
                          ? config.allowedGames.filter((id) => id !== g.id)
                          : [...config.allowedGames, g.id],
                      )
                    }
                  >
                    {config.allowedGames.includes(g.id) && <Check size={14} />}{" "}
                    {g.shortName}
                  </button>
                ))}
              </div>
              <Toggle
                label="Autoriser plusieurs fois le même jeu"
                checked={config.allowRepeats}
                disabled={!host}
                onChange={(v) => update("allowRepeats", v)}
              />
            </div>
          )}
          <button
            className="advanced-button"
            aria-expanded={advanced}
            onClick={() => setAdvanced((v) => !v)}
          >
            <Settings size={17} />
            Réglages de la soirée
            <ChevronDown size={18} className={advanced ? "rotated" : ""} />
          </button>
          {advanced && (
            <div className="advanced-settings">
              <div className="field-grid">
                <NumberField
                  label="Réponses (secondes)"
                  value={config.answerSeconds}
                  min={15}
                  max={180}
                  disabled={!host}
                  onChange={(v) => update("answerSeconds", v)}
                />
                <NumberField
                  label="Votes (secondes)"
                  value={config.voteSeconds}
                  min={10}
                  max={120}
                  disabled={!host}
                  onChange={(v) => update("voteSeconds", v)}
                />
                <NumberField
                  label="Présentation (secondes)"
                  value={config.presentationSeconds}
                  min={15}
                  max={180}
                  disabled={!host}
                  onChange={(v) => update("presentationSeconds", v)}
                />
                <NumberField
                  label="Transition (secondes)"
                  value={config.transitionSeconds}
                  min={3}
                  max={60}
                  disabled={!host}
                  onChange={(v) => update("transitionSeconds", v)}
                />
                <label className="field-label">
                  Classement
                  <select
                    value={config.leaderboard}
                    disabled={!host}
                    onChange={(e) =>
                      update(
                        "leaderboard",
                        e.target.value as RoomConfig["leaderboard"],
                      )
                    }
                  >
                    <option value="round">Après chaque manche</option>
                    <option value="game">Après chaque jeu</option>
                    <option value="final">Surprise au podium</option>
                  </select>
                </label>
                <label className="field-label">
                  Connexion
                  <select
                    value={config.connectionMode}
                    disabled={!host}
                    onChange={(e) =>
                      update(
                        "connectionMode",
                        e.target.value as RoomConfig["connectionMode"],
                      )
                    }
                  >
                    <option value="hybrid">Hybride</option>
                    <option value="local">Dans le même canapé</option>
                    <option value="online">À distance</option>
                  </select>
                </label>
              </div>
              <Toggle
                label="Votes anonymes"
                checked={config.anonymousVotes}
                disabled={!host}
                onChange={(v) => update("anonymousVotes", v)}
              />
              <Toggle
                label="Modifier son vote avant la clôture"
                checked={config.allowVoteChange}
                disabled={!host}
                onChange={(v) => update("allowVoteChange", v)}
              />
              <Toggle
                label="Qui parmi nous : voter pour soi"
                checked={config.allowSelfVoteWho}
                disabled={!host}
                onChange={(v) => update("allowSelfVoteWho", v)}
              />
              <Toggle
                label="Qui parmi nous : jouer sans points"
                checked={config.whoNoPoints}
                disabled={!host}
                onChange={(v) => update("whoNoPoints", v)}
              />
              <Toggle
                label="Humour adulte"
                description="Inclure les contenus destinés à un public adulte."
                checked={config.adult}
                disabled={!host}
                onChange={(v) => update("adult", v)}
              />
              <fieldset
                className="field-label"
                style={{ border: 0, padding: 0 }}
              >
                <legend>Catégories à exclure</legend>
                <p className="small muted" style={{ fontWeight: 400 }}>
                  Les catégories sélectionnées ne seront pas proposées.
                </p>
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
                label="Scores équilibrés"
                description="Normalisation des jeux pour équilibrer la soirée."
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
                  Enregistrer les réglages <Check size={17} />
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
                      Lancer la soirée <ArrowRight size={21} />
                    </>
                  )}
                </button>
                <p>
                  {active.length < 3
                    ? "Il faut au moins 3 cerveaux pour faire autant de dégâts."
                    : "Les participants doivent être prêts. Le tribunal demande 5 joueurs."}
                </p>
              </>
            ) : (
              <p className="waiting-host">
                <LoaderCircle className="spin" size={19} />
                L’hôte prépare votre soirée. Installez-vous.
              </p>
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
  return (
    <span className={`avatar ${size}`} style={{ background: player.color }}>
      {player.avatar}
      <i className={player.connected ? "connected-dot" : "disconnected-dot"} />
    </span>
  );
}

function Countdown({ room }: { room: RoomSnapshot }) {
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
        room.paused ? "Partie en pause" : `${seconds} secondes restantes`
      }
    >
      <span>
        {room.paused ? <Pause size={21} /> : <span className="timer-dot" />}
      </span>
      <strong>
        {room.paused
          ? "PAUSE"
          : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
      </strong>
    </div>
  );
}

function Gameplay({
  room,
  request,
  host,
  spectator,
}: {
  room: RoomSnapshot;
  request: Request;
  host: boolean;
  spectator: boolean;
}) {
  const r = room.round;
  const g = r
    ? gameInfo(r.gameId)
    : gameInfo(room.playlist[room.gameIndex]?.gameId || "mythos");
  const Icon = icons[g.id];
  const me = room.players.find((p) => p.id === room.me.id)!;
  const player = (id?: string) => room.players.find((p) => p.id === id);
  const phaseNames: Record<string, string> = {
    intro: "ÉCHAUFFEZ LES NEURONES",
    writing:
      g.id === "pitch" ? "INVENTEZ L’INVENDABLE" : "À VOS MAUVAISES IDÉES",
    prepare: "LE CALME AVANT LE DRAME",
    presenting:
      g.id === "court" ? "LA SÉANCE EST OUVERTE" : "C’EST L’HEURE DU PITCH",
    voting: "LE JURY, C’EST VOUS",
    results: "L’HEURE DE VÉRITÉ",
    transition: "ON REMET ÇA ?",
    podium: "LA GLOIRE. OU PRESQUE.",
  };
  const action = (data: Action) => request("room:action", data);
  if (room.phase === "podium")
    return <Podium room={room} request={request} host={host} />;
  return (
    <>
      <div className="game-topbar">
        <div className="game-breadcrumb">
          <span style={{ background: g.color }}>
            <Icon size={20} />
          </span>
          <strong>{g.shortName}</strong>
          <span className="muted">/</span>
          <small>
            Manche {room.roundNumber} / {room.totalRounds}
          </small>
        </div>
        <Countdown room={room} />
      </div>
      {room.paused && (
        <div className="pause-banner">
          <Pause size={19} />
          Pause technique. Même les génies ont besoin d’un verre d’eau.
        </div>
      )}
      <div className="gameplay-layout">
        <section
          className={`play-panel panel phase-${room.phase} play-${g.id}`}
          style={styleColor(g.color)}
        >
          <div className="eyebrow">
            <span className="tiny-star">✳</span>
            {phaseNames[room.phase]}
          </div>
          {room.phase === "intro" && (
            <div className="intro-content">
              <span className="intro-icon">
                <Icon size={70} />
              </span>
              <h1>{g.name}</h1>
              <p className="lead">{gameRules[g.id]}</p>
              <div className="pill">
                {g.id === "court"
                  ? "Les rôles tournent. La mauvaise foi reste."
                  : "Le serveur s’occupe des points. Occupez-vous des dégâts."}
              </div>
            </div>
          )}
          {r && !["intro", "transition"].includes(room.phase) && (
            <>
              <h1 className="game-prompt">{r.prompt}</h1>
              <span className="category-tag">{r.category}</span>
              {r.mediaUrl && (
                <div className="prompt-media">
                  {r.mediaUrl.match(/\.(mp4|webm)(\?|$)/i) ? (
                    <video
                      src={r.mediaUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={r.mediaUrl}
                      alt="Média à légender pour cette manche"
                    />
                  )}
                </div>
              )}
            </>
          )}
          {r &&
            room.phase === "writing" &&
            (spectator ? (
              <SpectatorMessage />
            ) : g.id === "pitch" ? (
              <ProductForm
                key={r.id}
                submitted={room.me.submitted}
                product={room.me.product}
                action={action}
              />
            ) : (
              <WritingForm
                key={r.id}
                answer={room.me.answer}
                submitted={room.me.submitted}
                action={action}
              />
            ))}
          {r && room.phase === "prepare" && (
            <div className="preparation">
              {g.id === "pitch" ? (
                <>
                  <h2>
                    {spectator
                      ? "Les commerciaux préparent leurs arguments."
                      : "Voici votre mission (presque) impossible."}
                  </h2>
                  {!spectator && room.me.product && (
                    <ProductCard product={room.me.product} />
                  )}
                  <p>
                    Préparez votre présentation à l’oral. Les autres noteront
                    votre humour, votre conviction et votre créativité.
                  </p>
                </>
              ) : (
                <>
                  <CourtCast room={room} />
                  {!spectator && (
                    <div className="role-secret">
                      <Gavel size={22} />
                      <div>
                        <span>VOTRE RÔLE</span>
                        <strong>
                          {roleLabels[room.me.courtRole || ""] || "Participant"}
                        </strong>
                      </div>
                    </div>
                  )}
                  <p>
                    Préparez votre intervention. Le procès commence dans
                    quelques instants. Les notes sont privées.
                  </p>
                  {!spectator && (
                    <WritingForm
                      key={`${r.id}-notes`}
                      answer={room.me.answer}
                      submitted={room.me.submitted}
                      action={action}
                      notes
                    />
                  )}
                </>
              )}
            </div>
          )}
          {r &&
            room.phase === "presenting" &&
            (g.id === "pitch" ? (
              <div className="presentation-content">
                <div className="speaker-badge">
                  {player(r.currentSpeakerId) && (
                    <Avatar player={player(r.currentSpeakerId)!} />
                  )}
                  <div>
                    <small>AU MICRO MAINTENANT</small>
                    <h2>
                      {player(r.currentSpeakerId)?.name || "Le vendeur"}
                      {r.currentSpeakerId === me.id ? ", à vous !" : ""}
                    </h2>
                  </div>
                </div>
                {r.currentProduct && <ProductCard product={r.currentProduct} />}
                <p className="lead">
                  {r.currentSpeakerId === me.id
                    ? "Votre public est suspendu à vos lèvres. Enfin, on espère."
                    : "Écoutez la présentation. Gardez vos notes pour le vote final."}
                </p>
                <span className="pill">
                  Passage {r.presentationIndex + 1} /{" "}
                  {room.players.filter((p) => !p.spectator).length}
                </span>
              </div>
            ) : (
              <div className="court-stage">
                <CourtCast room={room} />
                <div className="court-step">
                  <Gavel size={33} />
                  <div>
                    <small>LA PAROLE EST À…</small>
                    <h2>{courtSteps[r.courtStep || ""] || r.courtStep}</h2>
                    <p>
                      {courtHints[r.courtStep || ""] ||
                        "Le juge mène les échanges. Le jury prend des notes."}
                    </p>
                  </div>
                </div>
                {room.me.courtRole && (
                  <p className="pill">
                    Vous êtes :{" "}
                    {roleLabels[room.me.courtRole] || room.me.courtRole}
                  </p>
                )}
              </div>
            ))}
          {r &&
            room.phase === "voting" &&
            (spectator ? (
              <>
                <SpectatorMessage />
                <PublicVoting room={room} />
              </>
            ) : g.id === "pitch" ? (
              <Ratings room={room} action={action} />
            ) : g.id === "court" ? (
              <CourtVote room={room} action={action} />
            ) : (
              <Voting room={room} action={action} />
            ))}
          {r && room.phase === "results" && <Results room={room} />}
          {room.phase === "transition" && <Transition room={room} />}
          {["writing", "prepare", "voting"].includes(room.phase) && r && (
            <div className="submission-progress">
              <span>
                {room.phase === "voting" ? (
                  <>
                    <Check size={16} />
                    {r.votedCount} / {r.eligibleCount} votes reçus
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    {r.submittedCount} / {r.eligibleCount} propositions reçues
                  </>
                )}
              </span>
              <span>ÇA TRAVAILLE DUR. EN THÉORIE.</span>
            </div>
          )}
        </section>
        <aside className="game-sidebar">
          <Leaderboard room={room} compact />
          <div className="panel host-controls">
            {host ? (
              <>
                <div className="eyebrow">
                  <Crown size={14} /> AUX COMMANDES
                </div>
                <button
                  className="button primary full"
                  onClick={() => void request("room:advance")}
                  aria-label="Étape suivante"
                >
                  Étape suivante <ArrowRight size={17} />
                </button>
                <button
                  className="button outline full"
                  onClick={() =>
                    void request("room:pause", { paused: !room.paused })
                  }
                >
                  {room.paused ? (
                    <>
                      <Play size={16} />
                      Reprendre
                    </>
                  ) : (
                    <>
                      <Pause size={16} />
                      Mettre en pause
                    </>
                  )}
                </button>
                {g.id === "who" && room.phase === "voting" && (
                  <button
                    className="text-button"
                    onClick={() => void request("room:advance", { skip: true })}
                  >
                    <Shuffle size={16} />
                    Passer cette question
                  </button>
                )}
                <small>Le jeu avance aussi automatiquement.</small>
              </>
            ) : (
              <>
                <Radio size={24} />
                <p>
                  {spectator
                    ? "Vous profitez du spectacle. Les joueurs répondent sur leur écran."
                    : "Tout est synchronisé. Votre seule mission : jouer le jeu."}
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
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
  const [text, setText] = useState(answer || "");
  const [busy, setBusy] = useState(false);
  if (submitted)
    return (
      <div className="submitted-state">
        <span>
          <Check size={33} />
        </span>
        <h2>
          {notes ? "Votre plaidoyer est à l’abri." : "C’est dans la boîte."}
        </h2>
        <p>
          {notes
            ? "Gardez vos arguments sous le coude."
            : "Votre réputation est entre les mains des autres."}
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
        {notes ? "Vos notes privées (facultatif)" : "Votre moment de génie"}
        <textarea
          aria-label={notes ? "Notes privées" : "Ta réponse"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          minLength={1}
          maxLength={350}
          rows={4}
          placeholder={
            notes
              ? "Objection ! Mon client a simplement…"
              : "C’est ici que tout dérape…"
          }
        />
      </label>
      <div className="answer-footer">
        <span>
          {text.length}/350 ·{" "}
          {notes
            ? "VISIBLE PAR VOUS UNIQUEMENT"
            : "LES AUTEURS RESTENT ANONYMES"}
        </span>
        <button className="button primary" disabled={busy || !text.trim()}>
          {busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <>
              {notes ? "Garder mes notes" : "Envoyer ma réponse"}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ProductForm({
  submitted,
  product,
  action,
}: {
  submitted: boolean;
  product?: { name: string; description: string };
  action: (data: Action) => Promise<Ack>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  if (submitted)
    return (
      <div className="submitted-state">
        <span>
          <Check size={33} />
        </span>
        <h2>Brevet déposé. Enfin presque.</h2>
        <p>
          Un autre joueur devra vendre votre invention. Soyez indulgent. Ou pas.
        </p>
        {product && <ProductCard product={product} />}
      </div>
    );
  return (
    <form
      className="answer-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await action({
          type: "product",
          name: name.trim(),
          description: description.trim(),
        });
        setBusy(false);
      }}
    >
      <label className="field-label">
        Nom de votre invention
        <input
          aria-label="Nom du produit"
          required
          maxLength={70}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Le grille-pain qui vous juge"
        />
      </label>
      <label className="field-label">
        Décrivez ce chef-d’œuvre
        <textarea
          aria-label="Description du produit"
          required
          maxLength={220}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Il vous félicite pour vos toasts mais critique vos choix de vie."
        />
      </label>
      <button
        className="button primary full"
        disabled={busy || !name.trim() || !description.trim()}
      >
        Envoyer mon invention <ArrowRight size={18} />
      </button>
    </form>
  );
}
function ProductCard({
  product,
}: {
  product: { name: string; description: string };
}) {
  return (
    <div className="product-card">
      <span className="product-stamp">
        NOUVEAU !<br />
        ABSOLUMENT INUTILE.
      </span>
      <Megaphone size={38} />
      <h2>{product.name}</h2>
      <p>{product.description}</p>
    </div>
  );
}
function SpectatorMessage() {
  return (
    <div className="spectator-message">
      <Monitor size={25} />
      <p>
        À vous de jouer sur vos téléphones !<br />
        <strong>Ici, on profite du spectacle.</strong>
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
            ? "Vote enregistré. Vous pouvez encore changer d’avis."
            : "Vote enregistré. Le sort en est jeté."
          : who
            ? "Désignez la personne. On sait que vous avez déjà une idée."
            : "Choisissez votre réponse préférée. La vôtre est hors compétition."}
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
          Votre vote reste secret jusqu’à la révélation.
        </p>
      )}
    </div>
  );
}
function PublicVoting({ room }: { room: RoomSnapshot }) {
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
  const products = (room.round?.products || []).filter(
    (p) => p.sellerId !== room.me.id,
  );
  return (
    <div className="ratings">
      <p>
        Trois critères, de 1 à 5. Notez chaque vendeur. Votre propre prestation
        reste hors concours.
      </p>
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
  const [ratings, setRatings] = useState<[number, number, number]>(
    values || [3, 3, 3],
  );
  const [busy, setBusy] = useState(false);
  return (
    <div className="rating-card">
      <div className="speaker-badge">
        {player && <Avatar player={player} />}
        <div>
          <small>{player?.name || "Le vendeur"}</small>
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
                  aria-label={`${label} ${n} sur 5 pour ${player?.name}`}
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
        {values ? "Mettre à jour ma note" : "Valider mes notes"}
        <Check size={17} />
      </button>
    </div>
  );
}

const roleLabels: Record<string, string> = {
  accused: "L’accusé",
  prosecutor: "Le procureur",
  defense: "La défense",
  judge: "Le juge",
  juror: "Membre du jury",
  witness: "Témoin",
  jurors: "Membre du jury",
  witnesses: "Témoin",
};
const courtSteps: Record<string, string> = {
  accusation: "L’accusation",
  defense: "La défense",
  questions: "Les témoins et le jury",
  final: "Derniers arguments",
};
const courtHints: Record<string, string> = {
  accusation: "Procureur, exposez les faits. Aussi ridicules soient-ils.",
  defense: "Avocat, sauvez ce qui reste de la réputation de votre client.",
  questions:
    "Le juge distribue la parole. Les témoins racontent leur vérité très personnelle.",
  final:
    "Accusation, défense, accusé : une dernière chance de convaincre le jury.",
};
function CourtCast({ room }: { room: RoomSnapshot }) {
  const roles = room.round?.roles;
  if (!roles) return null;
  return (
    <div className="court-cast">
      {(["accused", "prosecutor", "defense", "judge"] as const).map((role) => {
        const p = room.players.find((x) => x.id === roles[role]);
        return p ? (
          <div key={role}>
            <Avatar player={p} />
            <small>{roleLabels[role]}</small>
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
          <h2>Votre verdict, membre du jury.</h2>
          <p>
            Égalité = acquittement. Le doute profite à l’accusé, la mauvaise foi
            aussi.
          </p>
          <div className="verdict-options">
            <button
              type="button"
              aria-pressed={verdict === true}
              className={verdict === true ? "selected guilty" : ""}
              onClick={() => setVerdict(true)}
            >
              Coupable <Gavel size={21} />
            </button>
            <button
              type="button"
              aria-pressed={verdict === false}
              className={verdict === false ? "selected innocent" : ""}
              onClick={() => setVerdict(false)}
            >
              Non coupable <Check size={21} />
            </button>
          </div>
        </>
      ) : (
        <>
          <h2>Le jury délibère.</h2>
          <p>
            Vous avez encore le pouvoir de récompenser la meilleure
            intervention.
          </p>
        </>
      )}
      <label className="field-label">
        La meilleure intervention
        <select
          aria-label="Meilleure intervention"
          value={best}
          onChange={(e) => setBest(e.target.value)}
        >
          <option value="">Choisir un participant…</option>
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
          ? "Actualiser mon vote"
          : jury
            ? "Rendre mon verdict"
            : "Voter pour cette intervention"}
        <Check size={18} />
      </button>
      {room.me.voted && (
        <p className="vote-confirmation">
          <Check size={17} />
          Votre vote a été enregistré.
        </p>
      )}
    </form>
  );
}

function Results({ room }: { room: RoomSnapshot }) {
  const r = room.round!;
  const players = room.players;
  const p = (id: string) => players.find((x) => x.id === id);
  return (
    <div className="results-content">
      {r.verdict && (
        <div className={`verdict-stamp ${r.verdict}`}>
          <Gavel size={33} />
          {r.verdict === "guilty" ? "COUPABLE !" : "NON COUPABLE !"}
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
                  {a.authorId ? p(a.authorId)?.name : "Réponse du jeu"}
                </span>
              </div>
              <strong>
                {a.votes ?? 0}
                <small>vote{a.votes === 1 ? "" : "s"}</small>
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
                Vendu par <strong>{p(product.sellerId || "")?.name}</strong>
                {product.creatorId && (
                  <>
                    {" "}
                    · Imaginé par <strong>{p(product.creatorId)?.name}</strong>
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
                    {count} vote{count > 1 ? "s" : ""}
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
                  <span>PTS</span>
                </b>
              </div>
            ) : null;
          })}
      </div>
      {r.results.length === 0 && (
        <p className="lead">
          Pas de points cette fois. Beaucoup de souvenirs gênants, en revanche.
        </p>
      )}
      {r.votesByPlayer && !room.config.anonymousVotes && (
        <details className="vote-detail">
          <summary>Qui a voté pour qui ?</summary>
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
        Le classement vient de changer. Certaines amitiés aussi.
      </p>
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
  const rows = room.players
    .filter((p) => !p.spectator)
    .sort((a, b) => a.rank - b.rank || b.score - a.score);
  return (
    <section className={`panel leaderboard ${compact ? "compact" : ""}`}>
      <div className="panel-heading">
        <h2>
          <Trophy size={20} />
          {final ? "Le palmarès des dégâts" : "Le classement"}
        </h2>
        <span className="small muted">{rows.length} joueurs</span>
      </div>
      {!room.scoresVisible && !final ? (
        <div className="scores-hidden">
          <Eye size={31} />
          <h3>Le suspense est total.</h3>
          <p>
            Les points s’accumulent en secret. Révélation{" "}
            {room.config.leaderboard === "final"
              ? "au podium"
              : "à la fin du jeu"}
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
                  {p.id === room.me.id && <small> VOUS</small>}
                </strong>
                {!compact && (
                  <small>
                    {p.roundWins} manche{p.roundWins > 1 ? "s" : ""} gagnée
                    {p.roundWins > 1 ? "s" : ""} · {p.gameWins} jeu
                    {p.gameWins > 1 ? "x" : ""} gagné{p.gameWins > 1 ? "s" : ""}
                    {final && p.bestGame ? ` · ${awards[p.bestGame]}` : ""}
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
          <summary>Détail des points par joueur</summary>
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
                <p>Aucun point attribué.</p>
              )}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}

function Transition({ room }: { room: RoomSnapshot }) {
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
      <span className="pill">{current.name} : C’EST TERMINÉ !</span>
      <h1>
        Une dignité en moins.
        <br />
        Un jeu de plus.
      </h1>
      <p className="lead">
        Bravo au gagnant. Les autres ont participé, c’est déjà ça.
      </p>
      {room.scoresVisible && (
        <div className="transition-winner">
          <Trophy size={29} />
          <strong>
            {winners.map((p) => p.name).join(" & ") || "Le public a gagné"}
          </strong>
          <span>
            {winners.length > 1 ? "Victoire partagée" : "Vainqueur du mini-jeu"}{" "}
            · +{winningPoints} points sur ce jeu
          </span>
        </div>
      )}
      <div className="next-game">
        <small>LA SUITE DES HOSTILITÉS</small>
        <h2>{next ? gameInfo(next.gameId).name : "Le podium final !"}</h2>
        <ArrowRight size={26} />
      </div>
    </div>
  );
}

const awards: Record<GameId, string> = {
  mythos: "Mytho de compétition",
  pitch: "Vendeur de l’impossible",
  court: "Ténor de la mauvaise foi",
  who: "Instinct collectif certifié",
  captions: "Légende des légendes",
};

function Podium({
  room,
  request,
  host,
}: {
  room: RoomSnapshot;
  request: Request;
  host: boolean;
}) {
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
      <div className="eyebrow">LE VERDICT DE LA SOIRÉE</div>
      <h1>
        La gloire est <span className="purple-text">un peu gênante.</span>
      </h1>
      <p>Les scores sont définitifs. Les contestations seront ignorées.</p>
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
                {p.score.toLocaleString("fr-FR")} <small>PTS</small>
              </strong>
              <div className="podium-block">
                <span>{p.rank}</span>
                <small>
                  {index === 0
                    ? "CERTIFIÉ DANGEREUX"
                    : index === 1
                      ? "PRESQUE FRÉQUENTABLE"
                      : "PAS LOIN DU GÉNIE"}
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
          On remet ça ? <Shuffle size={20} />
        </button>
      ) : (
        <p className="waiting-host">
          L’hôte peut relancer une soirée avec le même gang.
        </p>
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
  const empty = (): Partial<AdminItem> => ({
    gameId: "mythos",
    category: "absurde",
    adult: false,
    prompt: "",
  });
  const [token, setToken] = useState("");
  const [items, setItems] = useState<AdminItem[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<AdminItem | null>(null);
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<Partial<AdminItem>>(empty);
  const [uploading, setUploading] = useState(false);
  const call = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(`/api/admin/content${path}`, {
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
      const response = await fetch("/api/admin/media", {
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
        <Shield size={15} /> DANS LES COULISSES
      </div>
      <h1 className="page-title">La fabrique à mauvaises idées.</h1>
      <p className="lead">
        Administration protégée de la bibliothèque de contenus et de médias.
      </p>
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
            Clé d’administration
            <input
              type="password"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="button primary">
            Ouvrir les coulisses <ArrowRight size={18} />
          </button>
          <p className="fineprint">
            La clé ADMIN_TOKEN est configurée côté serveur.
          </p>
        </form>
      ) : (
        <div className="admin-layout">
          <section className="panel">
            <div className="panel-heading">
              <h2>Bibliothèque ({items.length})</h2>
              <button
                className="icon-button"
                aria-label="Actualiser les contenus"
                onClick={() => void load()}
              >
                <Shuffle size={18} />
              </button>
            </div>
            <select
              aria-label="Filtrer par jeu"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Tous les jeux</option>
              {GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.shortName}
                </option>
              ))}
            </select>
            <div className="admin-items">
              {items
                .filter((item) => filter === "all" || item.gameId === filter)
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
                      {item.adult ? " · ADULTE" : ""}
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
              <h2>{selected ? "Modifier le contenu" : "Nouveau contenu"}</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Nouveau contenu"
                onClick={reset}
              >
                <Plus size={19} />
              </button>
            </div>
            <label className="field-label">
              Mini-jeu
              <select
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
                {GAMES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Question ou consigne
              <textarea
                required
                rows={4}
                maxLength={500}
                minLength={3}
                value={draft.prompt || ""}
                onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
              />
            </label>
            <label className="field-label">
              Catégorie
              <input
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
                  Nom du produit
                  <input
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
                  Description du produit
                  <textarea
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
                  Chemin du média
                  <input
                    required
                    type="text"
                    placeholder="/media/mon-image.png"
                    pattern="/media/.+"
                    value={draft.mediaUrl || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, mediaUrl: e.target.value })
                    }
                  />
                </label>
                <label className="field-label">
                  {uploading
                    ? "Téléversement en cours…"
                    : "Ajouter une image originale (PNG, JPEG, WebP, GIF · 1 Mo maximum)"}
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
                      src={draft.mediaUrl}
                      alt="Aperçu du média administré"
                    />
                  </div>
                )}
              </>
            )}
            <Toggle
              label="Humour adulte"
              checked={!!draft.adult}
              onChange={(adult) => setDraft({ ...draft, adult })}
            />
            <button disabled={uploading} className="button primary full">
              Enregistrer le contenu <Check size={18} />
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
                Supprimer ce contenu <Trash2 size={17} />
              </button>
            )}
          </form>
        </div>
      )}
    </section>
  );
}

export default App;
