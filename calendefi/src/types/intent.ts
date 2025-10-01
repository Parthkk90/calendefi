export type IntentType = 'payment' | 'swap' | 'governance' | 'unknown';

export interface ParsedIntent {
  type: IntentType;
  amount?: number;
  token?: string;
  recipient?: string;
  fromToken?: string;
  toToken?: string;
  raw: string;
  confidence: number;
}

export interface PaymentIntent extends ParsedIntent {
  type: 'payment';
  amount: number;
  token: string;
  recipient: string;
}

export interface SwapIntent extends ParsedIntent {
  type: 'swap';
  amount: number;
  fromToken: string;
  toToken: string;
}