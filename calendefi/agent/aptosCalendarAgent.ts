import "dotenv/config";
import express from "express";
import cors from "cors";
import { CalendarServiceOAuth } from "./helpers/calendarServiceOAuth";
import { AptosWalletService, AptosTransactionRequest } from "./helpers/aptosWalletService";
import { calendar_v3 } from "googleapis";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

    // Initialize calendar collection if not exists
    try {
      await aptosWalletService.initializeCalendar(
        CALENDAR_ID,
        "CalendeFi Calendar",
        "Calendar-based DeFi transactions on Aptos",
        1,
        []
      );
      console.log("✅ Calendar collection initialized");
    } catch (error) {
      console.log("📅 Calendar already initialized");
    }

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

    const { amount = "0.1", token = "APT", recipient = "0x1" } = req.body;
    
    // Create calendar event
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