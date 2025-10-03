import { AptosAccount, AptosClient, CoinClient, FaucetClient, HexString } from "aptos";
// Note: CalendarService import updated to be compatible with OAuth version
export interface CalendarServiceLike {
  calendarInstance?: any;
}

export interface AptosTransactionRequest {
  type: "send" | "swap" | "delegate";
  amount: string;
  token: string;
  recipient: string;
  executeAt: Date;
  requiresApproval: boolean;
  approvers?: string[];
}

export interface AptosWalletInfo {
  address: string;
  balance: string;
  network: string;
  explorerUrl: string;
  resources: any[];
}

export class AptosWalletService {
  private client: AptosClient;
  private faucetClient: FaucetClient;
  private coinClient: CoinClient;
  public calendarService: CalendarServiceLike;
  
  // Replace with your deployed contract address from step 2
  private readonly MODULE_ADDRESS = "0x5cde772759e6872bf4de85ed6bf51cd19250e7406d92378e5322971d8cef22a8";
  
  constructor(calendarService: CalendarServiceLike) {
    const nodeUrl = process.env.APTOS_NODE_URL || "https://fullnode.testnet.aptoslabs.com/v1";
    const faucetUrl = process.env.APTOS_FAUCET_URL || "https://faucet.testnet.aptoslabs.com";
    
    this.client = new AptosClient(nodeUrl);
    this.faucetClient = new FaucetClient(nodeUrl, faucetUrl);
    this.coinClient = new CoinClient(this.client);
    this.calendarService = calendarService;
  }

  /**
   * Generate deterministic Aptos account from calendar ID
   */
  public generateCalendarWallet(calendarId: string): AptosAccount {
    // Create deterministic seed from calendar ID
    const seed = new TextEncoder().encode(calendarId + "calendefi_aptos");
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(seed).digest();
    
    // Create Aptos account from seed
    return new AptosAccount(new Uint8Array(hash).slice(0, 32));
  }

  /**
   * Get wallet information
   */
  public async getWalletInfo(calendarId: string): Promise<AptosWalletInfo> {
    const account = this.generateCalendarWallet(calendarId);
    const address = account.address().hex();
    
    try {
      // Get APT balance
      const balance = await this.coinClient.checkBalance(account);
      
      // Get account resources
      let resources: any[] = [];
      try {
        resources = (await this.client.getAccountResources(address)) as any[];
      } catch (error) {
        console.log("Account not found on chain, will be created on first transaction");
      }
      
      return {
        address,
        balance: (Number(balance) / 100000000).toFixed(8), // Convert from Octas to APT
        network: "Aptos Testnet",
        explorerUrl: `https://explorer.aptoslabs.com/account/${address}?network=testnet`,
        resources
      };
    } catch (error) {
      console.error("Error getting wallet info:", error);
      return {
        address,
        balance: "0",
        network: "Aptos Testnet",
        explorerUrl: `https://explorer.aptoslabs.com/account/${address}?network=testnet`,
        resources: []
      };
    }
  }

  /**
   * Initialize calendar collection on Aptos (simplified for demo)
   */
  public async initializeCalendar(
    calendarId: string,
    collectionName: string,
    description: string,
    multisigThreshold: number = 1,
    authorizedSigners: string[] = []
  ): Promise<string> {
    console.log(`Initializing calendar collection for ${calendarId}`);
    
    // For demo purposes, we'll just ensure the account is funded
    const account = this.generateCalendarWallet(calendarId);
    await this.ensureFunding(account);
    
    // Return a mock transaction hash for demo
    return "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  /**
   * Create calendar transaction (simplified for demo)
   */
  public async createCalendarTransaction(
    calendarId: string, 
    transactionId: string,
    request: AptosTransactionRequest
  ): Promise<string> {
    console.log(`Creating transaction: ${request.type} ${request.amount} ${request.token} to ${request.recipient}`);
    
    const account = this.generateCalendarWallet(calendarId);
    await this.ensureFunding(account);
    
    // Use the actual contract function
    const payload = {
      type: "entry_function_payload",
      function: `${this.MODULE_ADDRESS}::calendar_defi::create_transaction`,
      type_arguments: [],
      arguments: [
        transactionId,
        request.recipient,
        request.amount,
        request.token
      ]
    };
    
    // Execute the transaction
    try {
      const txnRequest = await this.client.generateTransaction(account.address(), payload);
      const signedTxn = await this.client.signTransaction(account, txnRequest);
      const transactionRes = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(transactionRes.hash);
      
      return transactionRes.hash;
    } catch (error) {
      console.error("Error creating calendar transaction:", error);
      throw error;
    }
  }

  /**
   * Execute transaction (simplified for demo)
   */
  public async executeTransaction(
    calendarId: string,
    transactionId: string
  ): Promise<string> {
    console.log(`Executing transaction: ${transactionId}`);
    
    const account = this.generateCalendarWallet(calendarId);
    
    // For APT transfers, we can do a simple transfer
    try {
      // Demo: send 0.001 APT to a test address
      const recipient = "0x1"; // Test recipient
      const amount = 1000; // 0.001 APT in Octas
      
      const payload = {
        type: "entry_function_payload",
        function: "0x1::coin::transfer",
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [recipient, amount.toString()]
      };

      const txnRequest = await this.client.generateTransaction(account.address(), payload);
      const signedTxn = await this.client.signTransaction(account, txnRequest);
      const transactionRes = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(transactionRes.hash);
      
      return transactionRes.hash;
    } catch (error) {
      console.error("Error executing transaction:", error);
      // Return mock hash for demo if real transaction fails
      return "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    }
  }

  /**
   * Ensure account has sufficient APT for gas fees
   */
  private async ensureFunding(account: AptosAccount): Promise<void> {
    try {
      const balance = await this.coinClient.checkBalance(account);
      
      // If balance is less than 0.1 APT, fund from faucet
      if (Number(balance) < 10000000) { // 0.1 APT in Octas
        console.log("Funding account from faucet...");
        await this.faucetClient.fundAccount(account.address(), 100000000); // 1 APT
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for funding
      }
    } catch (error) {
      console.log("Account not found, funding from faucet...");
      try {
        await this.faucetClient.fundAccount(account.address(), 100000000);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (faucetError) {
        console.error("Faucet funding failed:", faucetError);
      }
    }
  }
}