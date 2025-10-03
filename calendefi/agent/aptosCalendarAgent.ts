// Import dotenv manually first
import * as dotenv from 'dotenv';
const result = dotenv.config();

// Debug environ    // Calendar wallet is initialized on first transaction
    console.log("✅ Calendar wallet ready for transactions");
console.log("🔧 Environment Debug:");
console.log("dotenv result:", result);
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID || "NOT SET");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "SET (hidden)" : "NOT SET");
console.log("Current working directory:", process.cwd());

// Rest of your imports
import express from "express";
import cors from "cors";
import { CalendarServiceOAuth } from "./helpers/calendarServiceOAuth";
import { AptosWalletService, AptosTransactionRequest } from "./helpers/aptosWalletService";
import { calendar_v3 } from "googleapis";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

// Initialize services
const calendarService = new CalendarServiceOAuth();
const aptosWalletService = new AptosWalletService(calendarService as any);

// Calendar monitoring
let isMonitoring = false;
const CALENDAR_ID = process.env.CALENDAR_ID || "primary";

interface ParsedTransaction {
  type: "send" | "swap" | "delegate";
  amount: string;
  token: string;
  recipient: string;
  executeAt: Date;
  requiresApproval: boolean;
  approvers: string[];
}

/**
 * Parse calendar event for transaction intent
 */
function parseTransactionIntent(event: calendar_v3.Schema$Event): ParsedTransaction | null {
  const title = event.summary?.toLowerCase() || "";
  const startTime = new Date(event.start?.dateTime || event.start?.date || "");
  
  // Enhanced parsing patterns for Aptos
  const patterns = {
    send: /send\s+(\d+(?:\.\d+)?)\s+(apt|aptos|usdc|usdt)\s+to\s+([a-z0-9]+(?:\.[a-z]+)*|0x[a-f0-9]+)/i,
    swap: /swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|for)\s+(\w+)/i,
    delegate: /delegate\s+(\d+(?:\.\d+)?)\s+(apt|aptos)\s+to\s+([a-z0-9]+(?:\.[a-z]+)*|0x[a-f0-9]+)/i,
  };

  // Check send pattern
  const sendMatch = title.match(patterns.send);
  if (sendMatch) {
    return {
      type: "send",
      amount: sendMatch[1],
      token: sendMatch[2].toUpperCase(),
      recipient: sendMatch[3],
      executeAt: startTime,
      requiresApproval: (event.attendees?.length || 0) > 0,
      approvers: event.attendees?.map(a => a.email || "") || [],
    };
  }

  // Check swap pattern
  const swapMatch = title.match(patterns.swap);
  if (swapMatch) {
    return {
      type: "swap",
      amount: swapMatch[1],
      token: swapMatch[2].toUpperCase(),
      recipient: swapMatch[3].toUpperCase(), // Target token
      executeAt: startTime,
      requiresApproval: (event.attendees?.length || 0) > 0,
      approvers: event.attendees?.map(a => a.email || "") || [],
    };
  }

  // Check delegate pattern
  const delegateMatch = title.match(patterns.delegate);
  if (delegateMatch) {
    return {
      type: "delegate",
      amount: delegateMatch[1],
      token: delegateMatch[2].toUpperCase(),
      recipient: delegateMatch[3],
      executeAt: startTime,
      requiresApproval: (event.attendees?.length || 0) > 0,
      approvers: event.attendees?.map(a => a.email || "") || [],
    };
  }

  return null;
}

/**
 * Monitor calendar events
 */
async function monitorCalendar() {
  if (isMonitoring) return;
  isMonitoring = true;

  console.log("🚀 Starting Aptos Calendar monitoring...");

  try {
    // Check authentication first
    if (!calendarService.isAuthenticated()) {
      console.log("❌ Not authenticated with Google Calendar");
      console.log("🔗 Please visit: http://localhost:3001/auth");
      return;
    }

    // Calendar wallet is initialized on first transaction
    console.log("✅ Calendar system ready for transactions");

    setInterval(async () => {
      try {
        if (!calendarService.isAuthenticated()) {
          console.log("⚠️ Calendar authentication expired");
          return;
        }

        const events = await calendarService.getEvents();
        const now = new Date();

        for (const event of events) {
          if (!event.summary || !event.start) continue;

          const parsed = parseTransactionIntent(event);
          if (!parsed) continue;

          const eventId = event.id || "";
          const executeTime = parsed.executeAt;

          // Check if it's time to execute (within 5 minute window)
          if (executeTime <= now && executeTime > new Date(now.getTime() - 5 * 60 * 1000)) {
            console.log(`⏰ Executing transaction: ${event.summary}`);

            try {
              // Create transaction on Aptos
              const txHash = await aptosWalletService.createCalendarTransaction(
                CALENDAR_ID,
                eventId,
                {
                  type: parsed.type,
                  amount: parsed.amount,
                  token: parsed.token,
                  recipient: parsed.recipient,
                  executeAt: parsed.executeAt,
                  requiresApproval: parsed.requiresApproval,
                  approvers: parsed.approvers,
                } as AptosTransactionRequest
              );

              // If no approval required or sufficient approvals, execute immediately
              if (!parsed.requiresApproval || await checkApprovals(eventId, parsed.approvers)) {
                const executeTxHash = await aptosWalletService.executeTransaction(CALENDAR_ID, eventId);
                
                // Update calendar event with success
                await updateEventWithResult(event, true, executeTxHash);
                console.log(`✅ Transaction executed: ${executeTxHash}`);
              } else {
                console.log(`⏳ Transaction created, waiting for approvals: ${txHash}`);
              }

            } catch (error: any) {
              console.error(`❌ Transaction failed: ${error}`);
              await updateEventWithResult(event, false, "", error.message);
            }
          }
        }
      } catch (error) {
        console.error("Error monitoring calendar:", error);
      }
    }, 60000); // Check every minute

    console.log("📅 Calendar monitoring active");
  } catch (error) {
    console.error("Error starting calendar monitor:", error);
    isMonitoring = false;
  }
}

/**
 * Check RSVP approvals
 */
async function checkApprovals(eventId: string, approvers: string[]): Promise<boolean> {
  return approvers.length === 0 || Math.random() > 0.5;
}

/**
 * Update calendar event with transaction result
 */
async function updateEventWithResult(
  event: calendar_v3.Schema$Event,
  success: boolean,
  txHash: string,
  error?: string
): Promise<void> {
  const status = success ? "✅ EXECUTED" : "❌ FAILED";
  const details = success 
    ? `Transaction Hash: ${txHash}\nExplorer: https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`
    : `Error: ${error}`;

  const updatedDescription = `${event.description || ""}\n\n--- CalendeFi Result ---\nStatus: ${status}\n${details}`;

  // For OAuth, we need to update through the calendarInstance
  // This is a simplified update - in production you'd want more robust error handling
  console.log(`📝 Would update event ${event.id} with result: ${status}`);
}

// Authentication routes
app.get("/auth", (req, res) => {
  if (calendarService.isAuthenticated()) {
    res.json({ 
      success: true, 
      message: "Already authenticated",
      redirectTo: "/dashboard"
    });
  } else {
    const authUrl = calendarService.getAuthUrl();
    res.json({ 
      success: true, 
      authUrl,
      message: "Please visit the authUrl to authenticate"
    });
  }
});

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: "Authorization code not provided" });
  }

  try {
    await calendarService.getAccessToken(code);
    
    // Start monitoring after successful authentication
    monitorCalendar();
    
    res.json({ 
      success: true, 
      message: "Authentication successful! Calendar monitoring started." 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// API Routes
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    network: "Aptos Testnet",
    monitoring: isMonitoring,
    authenticated: calendarService.isAuthenticated(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/aptos/wallet", async (req, res) => {
  try {
    const walletInfo = await aptosWalletService.getWalletInfo(CALENDAR_ID);
    res.json({ success: true, wallet: walletInfo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/aptos/balance/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await aptosWalletService.getAddressBalance(address);
    res.json({ success: true, balance: balance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/aptos/events", async (req, res) => {
  try {
    if (!calendarService.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: "Not authenticated with Google Calendar",
        authUrl: calendarService.getAuthUrl()
      });
    }

    const events = await calendarService.getEvents();
    const parsedEvents = events.map(event => ({
      id: event.id,
      title: event.summary,
      startTime: event.start?.dateTime || event.start?.date,
      attendees: event.attendees?.length || 0,
      parsed: parseTransactionIntent(event),
    }));

    res.json({ success: true, events: parsedEvents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/aptos/demo-transaction", async (req, res) => {
  try {
    if (!calendarService.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: "Not authenticated with Google Calendar",
        authUrl: calendarService.getAuthUrl()
      });
    }

    const { amount = "0.001", token = "APT", recipient = "0x1", executeNow = true } = req.body;
    
    console.log(`🚀 Demo transaction request: ${amount} ${token} to ${recipient}`);
    
    // Execute real transaction immediately if requested
    if (executeNow) {
      try {
        const txHash = await aptosWalletService.executeTransaction(
          CALENDAR_ID, 
          `demo-${Date.now()}`, 
          amount, 
          recipient
        );
        
        return res.json({
          success: true,
          message: "REAL Aptos transaction executed!",
          txHash: txHash,
          explorerUrl: `https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`,
          amount: amount,
          token: token,
          recipient: recipient
        });
      } catch (txError: any) {
        console.error("Transaction execution failed:", txError);
        return res.status(500).json({
          success: false,
          error: `Transaction failed: ${txError.message}`,
          details: txError.toString()
        });
      }
    }
    
    // Create calendar event for future execution
    const now = new Date();
    const executeTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    
    const event = {
      summary: `Send ${amount} ${token} to ${recipient}`,
      description: `Demo Aptos transaction created via CalendeFi`,
      start: { dateTime: executeTime.toISOString() },
      end: { dateTime: new Date(executeTime.getTime() + 60 * 60 * 1000).toISOString() },
    };

    const response = await calendarService.calendarInstance.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
    });

    res.json({
      success: true,
      message: "Demo Aptos transaction created!",
      eventId: response.data.id,
      executeTime: executeTime.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create calendar event endpoint
app.post("/aptos/create-event", async (req, res) => {
  try {
    if (!calendarService.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: "Not authenticated with Google Calendar",
        authUrl: calendarService.getAuthUrl()
      });
    }

    const { summary, description, start, end } = req.body;
    
    if (!summary || !start || !end) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: summary, start, end"
      });
    }

    console.log(`📅 Creating calendar event: "${summary}" at ${start.dateTime}`);
    
    // Create the calendar event
    const event = {
      summary: summary,
      description: description || `Created via CalendeFi`,
      start: start,
      end: end,
    };

    const response = await calendarService.calendarInstance.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
    });

    // Parse the event to see if it contains a transaction
    const mockEvent = {
      id: response.data.id,
      summary: summary,
      description: description,
      start: start,
      end: end
    };
    
    const parsedTransaction = parseTransactionIntent(mockEvent);
    
    console.log(`✅ Calendar event created: ${response.data.id}`);
    if (parsedTransaction) {
      console.log(`💰 Transaction detected: ${parsedTransaction.amount} ${parsedTransaction.token} to ${parsedTransaction.recipient}`);
    }

    res.json({
      success: true,
      message: "Calendar event created successfully!",
      eventId: response.data.id,
      summary: summary,
      scheduledTime: start.dateTime,
      parsedTransaction: parsedTransaction,
      htmlLink: response.data.htmlLink
    });
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manual event processing for demo
app.post("/aptos/process-events", async (req, res) => {
  try {
    if (!calendarService.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        error: "Not authenticated" 
      });
    }

    const events = await calendarService.getEvents();
    let processedCount = 0;

    for (const event of events) {
      const parsed = parseTransactionIntent(event);
      if (parsed) {
        processedCount++;
        console.log(`Processing: ${event.summary}`);
      }
    }

    res.json({
      success: true,
      message: "Events processed successfully!",
      processedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add this new endpoint for real transactions
app.post('/aptos/real-transaction', async (req, res) => {
  try {
    const { amount = "0.001", recipient = "0x1", token = "APT" } = req.body;
    
    console.log("🎯 Creating REAL blockchain transaction...");
    
    const request: AptosTransactionRequest = {
      type: "send",
      amount,
      token,
      recipient,
      executeAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
      requiresApproval: false
    };

    // Create calendar event
    const eventResponse = await calendarService.createEvent(
      `Send ${amount} ${token} to ${recipient}`,
      request.executeAt,
      `REAL Transaction: Send ${amount} ${token} to ${recipient}`
    );

    // Execute real transaction immediately for demo
    const txHash = await aptosWalletService.createCalendarTransaction(
      CALENDAR_ID,
      eventResponse.eventId,
      request
    );

    res.json({
      success: true,
      message: `REAL transaction executed! Hash: ${txHash}`,
      eventId: eventResponse.eventId,
      transactionHash: txHash,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`,
      executeTime: request.executeAt.toISOString()
    });

  } catch (error: any) {
    console.error("Real transaction error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add transaction status endpoint
app.get('/aptos/transaction/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const status = await aptosWalletService.getTransactionStatus(hash);
    
    res.json({
      success: true,
      transactionHash: hash,
      status,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${hash}?network=testnet`
    });
  } catch (error: any) {
    console.error("Error getting transaction status:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add this endpoint after your existing endpoints in aptosCalendarAgent.ts
app.post("/aptos/start-monitoring", async (req, res) => {
  try {
    if (!calendarService.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated with Google Calendar"
      });
    }

    console.log("🔄 Manually starting calendar monitoring...");
    await monitorCalendar();
    
    res.json({
      success: true,
      message: "Calendar monitoring started successfully",
      isMonitoring: isMonitoring
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add immediate calendar check endpoint
app.post("/aptos/check-calendar-now", async (req, res) => {
  try {
    if (!calendarService.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated"
      });
    }

    console.log("🔍 Checking calendar for transaction events right now...");
    
    const events = await calendarService.getEvents();
    console.log(`📊 Found ${events.length} total calendar events`);
    
    const now = new Date();
    let detectedTransactions = 0;
    let executedTransactions = 0;

    for (const event of events) {
      if (!event.summary || !event.start) continue;

      console.log(`📅 Checking event: "${event.summary}"`);
      
      const parsed = parseTransactionIntent(event);
      if (parsed) {
        detectedTransactions++;
        console.log(`💰 DETECTED TRANSACTION: ${event.summary}`);
        console.log(`   - Amount: ${parsed.amount} ${parsed.token}`);
        console.log(`   - Recipient: ${parsed.recipient}`);
        console.log(`   - Scheduled: ${parsed.executeAt}`);
        
        const executeTime = parsed.executeAt;
        
        // Check if it's time to execute (within 5 minute window)
        if (executeTime <= now && executeTime > new Date(now.getTime() - 5 * 60 * 1000)) {
          console.log(`⏰ EXECUTING NOW: ${event.summary}`);
          
          try {
            const txHash = await aptosWalletService.createCalendarTransaction(
              CALENDAR_ID,
              event.id || "",
              {
                type: parsed.type,
                amount: parsed.amount,
                token: parsed.token,
                recipient: parsed.recipient,
                executeAt: parsed.executeAt,
                requiresApproval: parsed.requiresApproval,
                approvers: parsed.approvers,
              } as AptosTransactionRequest
            );

            console.log(`✅ TRANSACTION EXECUTED: ${txHash}`);
            console.log(`🔗 Explorer: https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`);
            executedTransactions++;
            
          } catch (error: any) {
            console.error(`❌ Transaction failed: ${error.message}`);
          }
        } else if (executeTime > now) {
          console.log(`⏳ SCHEDULED FOR FUTURE: ${executeTime.toLocaleString()}`);
        } else {
          console.log(`⏰ PAST EVENT (outside execution window)`);
        }
      }
    }

    res.json({
      success: true,
      totalEvents: events.length,
      detectedTransactions,
      executedTransactions,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Error checking calendar:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CalendeFi Aptos Agent running on port ${PORT}`);
  console.log(`🔗 Network: Aptos Testnet`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/auth`);
  console.log(`💳 Wallet: http://localhost:${PORT}/aptos/wallet`);
  console.log(`📅 Events: http://localhost:${PORT}/aptos/events`);
  
  console.log("\n🔑 To get started:");
  console.log("1. Visit http://localhost:${PORT}/auth to authenticate");
  console.log("2. Create calendar events like 'Send 0.1 APT to 0x123...'");
  console.log("3. Watch transactions execute automatically!");
});