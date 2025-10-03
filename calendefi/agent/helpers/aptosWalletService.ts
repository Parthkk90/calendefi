import { AptosAccount, AptosClient, CoinClient, FaucetClient, HexString } from "aptos";

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
  
  private readonly MODULE_ADDRESS = "0x8dd4f89ac22a7e17a8556adb4df57e1691199afcb419de4c039507b68736cdb4";
  
  constructor(calendarService: CalendarServiceLike) {
    const nodeUrl = process.env.APTOS_NODE_URL || "https://fullnode.testnet.aptoslabs.com/v1";
    const faucetUrl = process.env.APTOS_FAUCET_URL || "https://faucet.testnet.aptoslabs.com";
    
    this.client = new AptosClient(nodeUrl);
    this.faucetClient = new FaucetClient(nodeUrl, faucetUrl);
    this.coinClient = new CoinClient(this.client);
    this.calendarService = calendarService;
  }

  public generateCalendarWallet(calendarId: string): AptosAccount {
    const seed = new TextEncoder().encode(calendarId + "calendefi_aptos");
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(seed).digest();
    
    return new AptosAccount(new Uint8Array(hash).slice(0, 32));
  }

  public async getWalletInfo(calendarId: string): Promise<AptosWalletInfo> {
    const account = this.generateCalendarWallet(calendarId);
    const address = account.address().hex();
    
    try {
      const balance = await this.coinClient.checkBalance(account);
      
      let resources: any[] = [];
      try {
        resources = (await this.client.getAccountResources(address)) as any[];
      } catch (error) {
        console.log("Account not found on chain, will be created on first transaction");
      }
      
      return {
        address,
        balance: (Number(balance) / 100000000).toFixed(8),
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
   * REAL BLOCKCHAIN TRANSACTION: Create and execute APT transfer
   */
  public async createCalendarTransaction(
    calendarId: string, 
    transactionId: string,
    request: AptosTransactionRequest
  ): Promise<string> {
    console.log(`🚀 EXECUTING REAL TRANSACTION: ${request.type} ${request.amount} ${request.token} to ${request.recipient}`);
    
    const account = this.generateCalendarWallet(calendarId);
    await this.ensureFunding(account);
    
    // Execute real APT transfer
    if (request.token.toUpperCase() === "APT") {
      return await this.executeRealAPTTransfer(account, request);
    }
    
    // For other tokens, return error for now
    throw new Error(`Token ${request.token} not supported yet. Only APT transfers are implemented.`);
  }

  /**
   * REAL APT TRANSFER FUNCTION
   */
  private async executeRealAPTTransfer(
    account: AptosAccount,
    request: AptosTransactionRequest
  ): Promise<string> {
    try {
      // Convert amount to Octas (1 APT = 100,000,000 Octas)
      const amountInOctas = Math.floor(parseFloat(request.amount) * 100000000);
      
      console.log(`💰 Transferring ${amountInOctas} Octas (${request.amount} APT) to ${request.recipient}`);
      
      // Create the transaction payload
      const payload = {
        type: "entry_function_payload",
        function: "0x1::coin::transfer",
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [request.recipient, amountInOctas.toString()]
      };

      console.log("📋 Transaction payload:", JSON.stringify(payload, null, 2));

      // Generate transaction
      const txnRequest = await this.client.generateTransaction(account.address(), payload);
      console.log("⚡ Generated transaction request");

      // Sign transaction
      const signedTxn = await this.client.signTransaction(account, txnRequest);
      console.log("✍️ Signed transaction");

      // Submit to blockchain
      const transactionRes = await this.client.submitTransaction(signedTxn);
      console.log("📤 Submitted transaction:", transactionRes.hash);

      // Wait for confirmation
      console.log("⏳ Waiting for transaction confirmation...");
      await this.client.waitForTransaction(transactionRes.hash);
      
      console.log("✅ TRANSACTION CONFIRMED!");
      console.log(`🔗 Explorer: https://explorer.aptoslabs.com/txn/${transactionRes.hash}?network=testnet`);
      
      return transactionRes.hash;
    } catch (error) {
      console.error("❌ Real APT transfer failed:", error);
      throw new Error(`APT transfer failed: ${(error as any).message}`);
    }
  }

  /**
   * REAL TRANSACTION EXECUTION for calendar events
   */
  public async executeTransaction(
    calendarId: string,
    transactionId: string,
    amount: string = "0.001",
    recipient: string = "0x1"
  ): Promise<string> {
    console.log(`🎯 EXECUTING REAL CALENDAR TRANSACTION: ${transactionId}`);
    
    const account = this.generateCalendarWallet(calendarId);
    await this.ensureFunding(account);
    
    // Create real transaction request
    const request: AptosTransactionRequest = {
      type: "send",
      amount: amount,
      token: "APT",
      recipient: recipient,
      executeAt: new Date(),
      requiresApproval: false
    };
    
    return await this.executeRealAPTTransfer(account, request);
  }

  /**
   * Batch execute multiple transactions
   */
  public async executeBatchTransactions(
    calendarId: string,
    transactions: Array<{id: string, amount: string, recipient: string}>
  ): Promise<string[]> {
    console.log(`🔄 Executing ${transactions.length} real transactions...`);
    
    const results = [];
    for (const tx of transactions) {
      try {
        const hash = await this.executeTransaction(calendarId, tx.id, tx.amount, tx.recipient);
        results.push(hash);
        console.log(`✅ Transaction ${tx.id} completed: ${hash}`);
        
        // Wait 2 seconds between transactions
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Transaction ${tx.id} failed:`, error);
        results.push(`failed: ${(error as any).message}`);
      }
    }
    
    return results;
  }

  /**
   * Get real transaction status from blockchain
   */
  public async getTransactionStatus(txHash: string): Promise<any> {
    try {
      const txData = await this.client.getTransactionByHash(txHash);
      console.log("📊 Transaction status:", txData);
      return txData;
    } catch (error) {
      console.error("Error getting transaction status:", error);
      return null;
    }
  }

  private async ensureFunding(account: AptosAccount): Promise<void> {
    try {
      const balance = await this.coinClient.checkBalance(account);
      
      if (Number(balance) < 10000000) { // 0.1 APT in Octas
        console.log("💧 Funding account from faucet...");
        await this.faucetClient.fundAccount(account.address(), 100000000); // 1 APT
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        console.log("✅ Account funded!");
      } else {
        console.log("💰 Account has sufficient balance:", (Number(balance) / 100000000).toFixed(8), "APT");
      }
    } catch (error) {
      console.log("🆕 Account not found, funding from faucet...");
      try {
        await this.faucetClient.fundAccount(account.address(), 100000000);
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log("✅ New account funded!");
      } catch (faucetError) {
        console.error("❌ Faucet funding failed:", faucetError);
      }
    }
  }

  /**
   * Get balance for any Aptos address
   */
  public async getAddressBalance(address: string): Promise<string> {
    try {
      const resources = await this.client.getAccountResources(address);
      const aptCoinResource = resources.find(
        (resource) => resource.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );
      
      if (!aptCoinResource) {
        return "0";
      }
      
      const balance = (aptCoinResource.data as any).coin.value;
      return balance;
    } catch (error) {
      console.error("Error getting address balance:", error);
      return "0";
    }
  }
}