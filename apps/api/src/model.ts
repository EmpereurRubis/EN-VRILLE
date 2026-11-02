import type {
  CourtRoles,
  GameId,
  Phase,
  PlaylistItem,
  Product,
  RoomConfig,
  RoundResult,
  ReactionView,
  CinemaScene,
  CaptionAwards,
  CinemaPlayback,
} from "@en-vrille/shared";

export interface Player {
  id: string;
  tokenHash: string;
  name: string;
  avatar: string;
  color: string;
  connected: boolean;
  disconnectedAt?: number;
  ready: boolean;
  spectator: boolean;
  waiting?: boolean;
  score: number;
  delta: number;
  previousRank: number;
  roundWins: number;
  gameWins: number;
  history: { gameId: GameId; points: number; gamePoints?: number; reason: string }[];
}
export interface InternalAnswer {
  id: string;
  text: string;
  authorId: string;
}
export interface Round {
  id: string;
  gameId: GameId;
  prompt: string;
  category: string;
  mediaUrl?: string;
  participantIds: string[];
  answers: InternalAnswer[];
  products: Product[];
  votes: Record<string, string>;
  ratings: Record<string, Record<string, [number, number, number]>>;
  verdicts: Record<string, boolean>;
  bestVotes: Record<string, string>;
  submitted: string[];
  prepared: string[];
  missions: Record<string, { word: string; completed: boolean }>;
  presentationIndex: number;
  revealIndex: number;
  resultIndex: number;
  pitchStage?: "wheel" | "selected" | "speaking";
  pitchFinalResults?: boolean;
  sellerOrder?: string[];
  courtStep?: string;
  roles?: CourtRoles;
  results: RoundResult[];
  verdict?: "guilty" | "innocent";
  title?: string;
  scored: boolean;
  voteCounts: Record<string, number>;
  suggestions?: Record<string, { token: string; name: string; description: string }>;
  pitchRatedSellerIds?: string[];
  captions?: {
    turn: number;
    turns: number;
    stories: {
      id: string;
      starterId: string;
      presenterId: string;
      scene: CinemaScene;
      lines: { id: string; text: string; frameIndex: number; authorId: string }[];
    }[];
    slideIndex: number;
    autoSlides: boolean;
    slideStartedAt: number;
    awardVotes: Record<string, Partial<Record<"film" | "actor" | "line", string>>>;
    awards?: CaptionAwards;
    playback: CinemaPlayback;
  };
}
export interface Room {
  code: string;
  hostId: string;
  display: { id: string; tokenHash: string; connected: boolean };
  pairingCode?: string;
  transitionId: string;
  collectionClosed: boolean;
  podiumStep: number;
  pausedForController?: boolean;
  config: RoomConfig;
  players: Player[];
  phase: Phase;
  phaseStartedAt: number;
  phaseExcludedIds: string[];
  reactions: ReactionView[];
  lastReactionAt: Record<string, number>;
  playlist: PlaylistItem[];
  gameIndex: number;
  roundNumber: number;
  round?: Round;
  deadline: number | null;
  paused: boolean;
  pausedAt?: number;
  remaining: number | null;
  message: string;
  createdAt: number;
  updatedAt: number;
  usedContentIds: string[];
  gameStartScores: Record<string, number>;
  normalizationFactors: Partial<Record<GameId, number>>;
  usedDecoyIds?: string[];
  usedCinemaIds?: string[];
}
