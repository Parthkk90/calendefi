export interface WalletConnection {
  address: string;
  connected: boolean;
  provider: string; // e.g., "Petra" or "Martian"
}

export interface TransactionData {
  amount: number;
  token: string; // e.g., "USDC"
  to: string; // recipient address
  timestamp: Date; // when the transaction is scheduled
}

export interface WalletError {
  code: number;
  message: string;
}

export interface WalletInfo {
  address: string;
  network: string;
  connected: boolean;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

export interface AptosTransaction {
  type: string;
  function: string;
  arguments: any[];
  type_arguments: string[];
}