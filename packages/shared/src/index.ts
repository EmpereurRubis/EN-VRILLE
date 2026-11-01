export const GAME_IDS = [
  "mythos",
  "pitch",
  "court",
  "who",
  "captions",
] as const;
export type GameId = (typeof GAME_IDS)[number];
export type Phase =
  | "lobby"
  | "intro"
  | "writing"
  | "prepare"
  | "presenting"
  | "voting"
  | "results"
  | "transition"
  | "podium";
export interface GameInfo {
  id: GameId;
  name: string;
  shortName: string;
  description: string;
  color: string;
  icon: string;
  minPlayers: number;
  duration: string;
}
export const GAMES: GameInfo[] = [
  {
    id: "mythos",
    name: "Le Plateau des Mythos",
    shortName: "Les Mythos",
    description:
      "Une question absurde. Vos pires explications. Que le meilleur mytho gagne.",
    color: "#b3a0ff",
    icon: "🛸",
    minPlayers: 3,
    duration: "3–6 min",
  },
  {
    id: "pitch",
    name: "Vends-moi cette Merde !",
    shortName: "Vends-moi ça !",
    description:
      "Un produit invendable, un argumentaire impardonnable. À vous de convaincre.",
    color: "#ffab70",
    icon: "🛒",
    minPlayers: 3,
    duration: "5–10 min",
  },
  {
    id: "court",
    name: "Tribunal du N’importe Quoi",
    shortName: "Le Tribunal",
    description:
      "Des crimes ridicules. Une défense douteuse. La justice part en vrille.",
    color: "#f3cd69",
    icon: "⚖️",
    minPlayers: 5,
    duration: "6–10 min",
  },
  {
    id: "who",
    name: "Qui parmi nous ?",
    shortName: "Qui parmi nous ?",
    description: "Vous connaissez vos amis. Enfin… c’est ce que vous pensiez.",
    color: "#9ce5bb",
    icon: "👀",
    minPlayers: 3,
    duration: "2–4 min",
  },
  {
    id: "captions",
    name: "Sous-titres Interdits",
    shortName: "Sous-titres Interdits",
    description:
      "Une image vaut mille mots. Les vôtres vont probablement tout gâcher.",
    color: "#ff97ba",
    icon: "💬",
    minPlayers: 3,
    duration: "3–6 min",
  },
];
export const AVATARS = [
  "👽",
  "👻",
  "🤖",
  "🐸",
  "🦊",
  "🐙",
  "🍄",
  "🦆",
  "🦄",
  "🐼",
  "🦖",
  "🌵",
];
export const COLORS = [
  "#b3a0ff",
  "#ffab70",
  "#9ce5bb",
  "#ff97ba",
  "#f3cd69",
  "#86d5ee",
  "#ff8181",
  "#c2de83",
  "#d4b4ff",
  "#f6be99",
  "#81cdb9",
  "#e7a7d4",
];
export interface PlaylistItem {
  gameId: GameId;
  rounds: number;
  pitchMode?: "random" | "invented";
}
export interface RoomConfig {
  mode: "custom" | "random";
  playlist: PlaylistItem[];
  randomCount: number;
  randomRounds: number;
  allowedGames: GameId[];
  allowRepeats: boolean;
  approximateMinutes: number;
  answerSeconds: number;
  voteSeconds: number;
  presentationSeconds: number;
  transitionSeconds: number;
  anonymousVotes: boolean;
  allowVoteChange: boolean;
  allowSelfVoteWho: boolean;
  whoNoPoints: boolean;
  leaderboard: "round" | "game" | "final";
  adult: boolean;
  disabledCategories: string[];
  balanced: boolean;
  coefficients: Record<GameId, number>;
  connectionMode: "local" | "online" | "hybrid";
}
export const DEFAULT_CONFIG: RoomConfig = {
  mode: "custom",
  playlist: [
    { gameId: "mythos", rounds: 2 },
    { gameId: "who", rounds: 3 },
    { gameId: "captions", rounds: 2 },
  ],
  randomCount: 3,
  randomRounds: 1,
  allowedGames: ["mythos", "pitch", "who", "captions"],
  allowRepeats: false,
  approximateMinutes: 20,
  answerSeconds: 60,
  voteSeconds: 30,
  presentationSeconds: 45,
  transitionSeconds: 10,
  anonymousVotes: true,
  allowVoteChange: true,
  allowSelfVoteWho: false,
  whoNoPoints: false,
  leaderboard: "round",
  adult: false,
  disabledCategories: [],
  balanced: true,
  coefficients: { mythos: 1, pitch: 1, court: 1, who: 1, captions: 1 },
  connectionMode: "hybrid",
};
export interface PlayerView {
  id: string;
  name: string;
  avatar: string;
  color: string;
  connected: boolean;
  ready: boolean;
  spectator: boolean;
  score: number;
  delta: number;
  rank: number;
  previousRank: number;
  roundWins: number;
  gameWins: number;
  bestGame?: GameId;
  history: { gameId: GameId; points: number; reason: string }[];
}
export interface Product {
  name: string;
  description: string;
  creatorId?: string;
  sellerId?: string;
}
export interface AnswerView {
  id: string;
  text: string;
  authorId?: string;
  votes?: number;
}
export interface RoundResult {
  playerId: string;
  points: number;
  reason: string;
  votes?: number;
  rating?: number;
}
export interface CourtRoles {
  accused: string;
  prosecutor: string;
  defense: string;
  judge: string;
  jurors: string[];
  witnesses: string[];
}
export interface RoundView {
  id: string;
  gameId: GameId;
  prompt: string;
  category: string;
  mediaUrl?: string;
  answers: AnswerView[];
  products?: Product[];
  currentProduct?: Product;
  currentSpeakerId?: string;
  presentationIndex: number;
  courtStep?: string;
  roles?: CourtRoles;
  submittedCount: number;
  eligibleCount: number;
  votedCount: number;
  results: RoundResult[];
  verdict?: "guilty" | "innocent";
  voteCounts?: Record<string, number>;
  votesByPlayer?: Record<string, string>;
  title?: string;
}
export interface PrivateView {
  id: string;
  submitted: boolean;
  voted: boolean;
  answer?: string;
  answerId?: string;
  product?: Product;
  vote?: string;
  ratings?: Record<string, [number, number, number]>;
  courtRole?: string;
}
export interface RoomSnapshot {
  code: string;
  hostId: string;
  phase: Phase;
  config: RoomConfig;
  players: PlayerView[];
  playlist: PlaylistItem[];
  gameIndex: number;
  roundNumber: number;
  totalRounds: number;
  round?: RoundView;
  me: PrivateView;
  deadline: number | null;
  paused: boolean;
  serverTime: number;
  inviteUrl: string;
  message: string;
  scoresVisible: boolean;
  gameSummary?: { winnerIds: string[]; points: Record<string, number> };
}
export interface Session {
  code: string;
  playerId: string;
  token: string;
}
export interface Ack {
  ok: boolean;
  error?: string;
  room?: RoomSnapshot;
  session?: Session;
}
export type Action =
  | { type: "answer"; text: string }
  | { type: "product"; name: string; description: string }
  | { type: "vote"; targetId: string }
  | {
      type: "rate";
      targetId: string;
      humor: number;
      conviction: number;
      creativity: number;
    }
  | { type: "verdict"; guilty: boolean; bestPlayerId?: string };
export interface ClientEvents {
  "room:create": (
    data: { name: string; avatar: string },
    ack: (result: Ack) => void,
  ) => void;
  "room:join": (
    data: { code: string; name: string; avatar: string; spectator?: boolean },
    ack: (result: Ack) => void,
  ) => void;
  "room:resume": (data: Session, ack: (result: Ack) => void) => void;
  "room:ready": (data: { ready: boolean }, ack: (result: Ack) => void) => void;
  "room:configure": (data: RoomConfig, ack: (result: Ack) => void) => void;
  "room:start": (
    data: Record<string, never>,
    ack: (result: Ack) => void,
  ) => void;
  "room:action": (data: Action, ack: (result: Ack) => void) => void;
  "room:advance": (
    data: { skip?: boolean },
    ack: (result: Ack) => void,
  ) => void;
  "room:pause": (data: { paused: boolean }, ack: (result: Ack) => void) => void;
  "room:replay": (
    data: Record<string, never>,
    ack: (result: Ack) => void,
  ) => void;
  "room:leave": (
    data: Record<string, never>,
    ack: (result: Ack) => void,
  ) => void;
}
export interface ServerEvents {
  "room:state": (room: RoomSnapshot) => void;
  "server:error": (message: string) => void;
}
