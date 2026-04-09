
export interface Character {
  id: string;
  name: string;
  description: string;
  importance: number;
  group: string;
}

export interface Relationship {
  source: string;
  target: string;
  relationship: string;
  details: string;
  strength: number;
}

export interface GraphData {
  nodes: Character[];
  links: Relationship[];
}

export interface SavedGraph {
  id: string;
  title: string;
  timestamp: number;
  data: GraphData;
  stats: ProcessingStats;
}

export enum AppState {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  CONFIRMATION = 'CONFIRMATION',
  ANALYZING = 'ANALYZING',
  VISUALIZING = 'VISUALIZING',
  HISTORY = 'HISTORY',
  ERROR = 'ERROR'
}

export interface ProcessingStats {
  tokenCount: number;
  estimatedCost: number;
  processingTimeMs: number;
}

export type Theme = 'light' | 'dark';
