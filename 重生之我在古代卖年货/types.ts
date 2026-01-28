
export enum GameState {
  START,
  PROLOGUE,
  QUIZ,
  PLAYING,
  EVENT,
  GAMEOVER,
  SOCIAL,
  DIALOGUE,
  ACHIEVEMENTS 
}

export enum Weather {
  SUNNY = '晴空万里',
  SNOWY = '大雪分飞',
  WINDY = '寒风刺骨',
  SMOGGY = '雾霾锁城'
}

export enum Talent {
  CUT_KING = '砍价高手', 
  FACE_OFF = '面厚心黑', 
  LUCKY_DOG = '岁岁平安', 
  GREEDY_CAT = '利欲熏心'
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  baseAffinity: number;
}

export interface PlayerStats {
  silver: number;
  reputation: number;
  cunning: number;
  inventory: Record<string, number>;
  talent: Talent | null;
  day: number;
  npcRelationships: Record<string, number>;
  background?: string;
  hungerLevel: number; // 0: 饱腹, 1: 饥饿, 2: 虚脱(提前结算)
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  conditionDesc: string;
  check: (stats: PlayerStats) => boolean;
  reward: { silver?: number, reputation?: number, cunning?: number };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
}

export interface Item {
  id: string;
  name: string;
  basePrice: number;
  description: string;
}

export interface QuizOption {
  text: string;
  impact?: {
    silver?: number;
    reputation?: number;
    cunning?: number;
  };
  talent?: Talent;
  resultDesc: string;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export interface DialogueOption {
  text: string;
  silverDelta?: number;
  affinityDelta?: number;
  reputationDelta?: number;
  resultText: string;
}

export interface Dialogue {
  npcText: string;
  options: DialogueOption[];
}
