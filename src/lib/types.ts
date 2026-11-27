export type EntityType = 'EMAIL' | 'PHONE' | 'IP' | 'PAN' | 'AADHAAR' | 'CREDIT_CARD';

export interface Entity {
  id?: string;
  type: EntityType;
  start: number;
  end: number;
  value: string;
  confidence: number;
  normalized?: string;
}

export interface DetectionResult {
  entities: Entity[];
  rejectedLuhnCount: number;
  rejectedVerhoeffCount: number;
  processingTimeMs: number;
}

