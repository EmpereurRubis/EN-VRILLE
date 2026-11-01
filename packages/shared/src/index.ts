/** Increment only when the client/server event contract becomes incompatible. */
export const PROTOCOL_VERSION = 2;
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
  | "party-intro"
  | "intro"
  | "rules"
  | "writing"
  | "prepare"
  | "presenting"
  | "reveal"
  | "voting"
  | "results"
  | "leaderboard"
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
  noPoints: boolean;
  reactionsEnabled: boolean;
  secretRoles: boolean;
  autoAdvance: boolean;
  language: "fr" | "en";
  captionLength: "short" | "normal" | "long";
  captionAutoSlides: boolean;
  captionSlideSeconds: number;
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
  noPoints: false,
  reactionsEnabled: true,
  secretRoles: false,
  autoAdvance: true,
  language: "fr",
  captionLength: "long",
  captionAutoSlides: false,
  captionSlideSeconds: 7,
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
  generated?: boolean;
}
export interface DecoyProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
  tagline?: string;
  nameEn?: string;
  descriptionEn?: string;
  taglineEn?: string;
}
export interface CinemaFrame {
  url: string;
  timecodeMs: number;
  subtitlePosition: "bottom" | "top";
}
export interface CinemaRights {
  title: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  territories: string[];
  credits: string;
  verifiedAt: string;
  commercialUse: true;
}
export interface CinemaScene {
  id: string;
  title: string;
  category: string;
  sourceVideoUrl: string;
  clipUrl: string;
  frames: CinemaFrame[];
  width: number;
  height: number;
  rights: CinemaRights;
}
export interface CaptionLineView {
  id: string;
  text: string;
  frameIndex: number;
  authorId?: string;
}
export interface CaptionStoryView {
  id: string;
  title: string;
  scene: CinemaScene;
  presenterId: string;
  starterId?: string;
  lines: CaptionLineView[];
}
export interface CaptionAwards {
  filmIds: string[];
  actorIds: string[];
  lineIds: string[];
  counts: { film: Record<string, number>; actor: Record<string, number>; line: Record<string, number> };
}
export interface CaptionsView {
  writingTurn: number;
  writingTurns: number;
  storyCount: number;
  presentationIndex: number;
  slideIndex: number;
  autoSlides: boolean;
  slideSeconds: number;
  slideStartedAt: number;
  currentStory?: CaptionStoryView;
  stories?: CaptionStoryView[];
  awards?: CaptionAwards;
}
export interface PrivateCaptionsView {
  storyId?: string;
  turn: number;
  totalTurns: number;
  frame?: CinemaFrame;
  previousLines: CaptionLineView[];
  submitted: boolean;
  ownText?: string;
  presentation?: CaptionStoryView;
  votes: Partial<Record<"film" | "actor" | "line", string>>;
  eligibleTargets: { film: string[]; actor: string[]; line: string[] };
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
  pitchFinalResults?: boolean;
  pitchRating?: { sellerId: string; average: number; ratingsCount: number };
}
export interface PrivateView {
  id: string;
  eligible: boolean;
  submitted: boolean;
  prepared: boolean;
  voted: boolean;
  answer?: string;
  answerId?: string;
  product?: Product;
  vote?: string;
  ratings?: Record<string, [number, number, number]>;
  courtRole?: string;
  secretMission?: { word: string; instruction: string; completed: boolean };
  captions?: PrivateCaptionsView;
  productSuggestion?: { token: string; name: string; description: string };
}
export interface ParticipationProgress {
  kind: "ready" | "answers" | "products" | "prepared" | "votes" | "ratings" | "verdicts" | "bonus-votes";
  label: string;
  completed: number;
  total: number;
}
export const REACTIONS = ["😂", "😱", "👏", "💀", "🤡", "❤️"] as const;
export interface ReactionView {
  id: string;
  playerId: string;
  reaction: string;
  createdAt: number;
}
export interface RoomSnapshot {
  code: string;
  hostId: string;
  phase: Phase;
  phaseStartedAt: number;
  progress: ParticipationProgress[];
  manualAdvanceRequired: boolean;
  awaitingHost: boolean;
  reactions: ReactionView[];
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
  pausedAt?: number;
  serverTime: number;
  inviteUrl: string;
  message: string;
  scoresVisible: boolean;
  gameSummary?: { winnerIds: string[]; points: Record<string, number> };
  captions?: CaptionsView;
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
  | { type: "prepared" }
  | { type: "answer"; text: string }
  | { type: "product"; name: string; description: string; suggestionToken?: string }
  | { type: "caption"; text: string }
  | { type: "cinema-vote"; award: "film" | "actor" | "line"; targetId: string }
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
    data: { name: string; avatar: string; hostPlays?: boolean },
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
  "room:react": (data: { reaction: string }, ack: (result: Ack) => void) => void;
  "room:skip-player": (data: { playerId: string }, ack: (result: Ack) => void) => void;
  "room:product-suggestion": (data: Record<string, never>, ack: (result: Ack) => void) => void;
  "room:caption-control": (data: { direction?: "next" | "previous"; autoSlides?: boolean }, ack: (result: Ack) => void) => void;
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
