# 📅 CalendeFi - Calendar-Based Cryptocurrency Payments

> Transform your Google Calendar into a powerful cryptocurrency payment scheduler for the Aptos blockchain!

![CalendeFi Banner](https://img.shields.io/badge/CalendeFi-Aptos%20Blockchain-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-0.3-orange?style=for-the-badge)

## 🌟 What is CalendeFi?

CalendeFi is an innovative Web2-to-Web3 bridge that converts Google Calendar events into real Aptos blockchain transactions. Simply create a calendar event like "Send 0.1 APT to alice.apt" and watch it execute automatically at the scheduled time!

### ✨ Key Features

- 📅 **Calendar Integration** - Native Google Calendar OAuth integration
- 🚀 **Real Blockchain Transactions** - Execute actual APT transfers on Aptos testnet
- 🤖 **Automated Execution** - Transactions happen automatically at scheduled times
- 💳 **Smart Wallet Management** - Deterministic wallet generation from calendar IDs
- 🌐 **Web Interface** - Beautiful dashboard for wallet and transaction management
- 🔗 **Smart Contract Integration** - Deployed contract for calendar-triggered payments
- 📊 **Real-time Monitoring** - Live transaction status and explorer integration

## 🎯 Quick Example
Create Google Calendar event: "Send 0.1 APT to 0x1234..."
Set time: Tomorrow 2:00 PM
Save event
CalendeFi automatically executes the transaction at 2:00 PM
Calendar event updates with transaction hash and explorer link

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud account with Calendar API enabled
- Aptos CLI (optional, for smart contract deployment)

### 1. Clone & Install

```bash
git clone https://github.com/Parthkk90/calendefi.git
cd calendefi/calendefi/agent
npm install

2. Environment Setup
cp .env.example .env.aptos
Edit .env.aptos with your credentials:
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_PROJECT_ID=calendefi-demo
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
CALENDAR_ID=primary

# Aptos Network Configuration
APTOS_NETWORK=testnet
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com

# Server Configuration
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001

# Demo Configuration
DEMO_MODE=true
DEFAULT_CHAIN_ID=testnet

. Start the Agent
4. Authenticate & Test
Visit http://localhost:3001/auth to authenticate with Google
Visit http://localhost:3001/schedule.html to create test transactions
Create calendar events and watch them execute automatically!
📱 Web Interface
Available Endpoints
🏠 Health Check - http://localhost:3001/health
🔐 Authentication - http://localhost:3001/auth
💳 Wallet Info - http://localhost:3001/aptos/wallet
📅 Transaction Scheduler - http://localhost:3001/schedule.html
💰 Wallet Manager - http://localhost:3001/wallet.html
📊 Live Monitor - http://localhost:3001/monitor.html
Features
Wallet Connection - Connect Petra or Martian wallets
Address Book - Save frequent recipient addresses
Transaction Scheduling - Create calendar events with real addresses
Real-time Monitoring - Track transaction status live
🔧 How It Works
1. Calendar Event Detection
The agent monitors your Google Calendar every 30 seconds for events matching transaction patterns:

2. Transaction Parsing
3. Automatic Execution
🏗️ Architecture
💰 Smart Contract Features
Our deployed Aptos smart contract (basic_contract.move) provides:

Deployed Contract: 0x8dd4f89ac22a7e17a8556adb4df57e1691199afcb419de4c039507b68736cdb4

📊 Supported Operations
Transaction Types
Pattern	Description	Example
Send X APT to ADDRESS	Direct APT transfer	Send 0.1 APT to 0x1234...
Transfer X APT to ADDRESS	Alternative transfer format	Transfer 5 APT to alice.apt
Pay X APT to ADDRESS	Payment format	Pay 0.001 APT to recipient
Supported Networks
✅ Aptos Testnet (Current)
🔄 Aptos Mainnet (Planned)
Wallet Support
🔐 Deterministic Wallets - Generated from calendar ID
💧 Auto-funding - Testnet faucet integration
🔗 External Wallets - Petra & Martian wallet connections
🔄 Transaction Flow
🛡️ Security Features
🔐 No Private Key Storage - Keys generated deterministically
🧪 Testnet Default - Safe testing environment
✅ Transaction Validation - Balance checks before execution
📝 Audit Trail - All transactions logged and verifiable
🔍 Pattern Validation - Only valid transaction formats processed
📈 Real Examples
Successful Transaction
Live Transaction Example
Your transactions are real and verifiable on the Aptos blockchain explorer!

📅 Creating Calendar Events for Automatic Execution
Method 1: Direct Google Calendar (Easiest)
Open: https://calendar.google.com
Create Event: Title = "Send 0.1 APT to 0x1234..."
Set Time: When you want the transaction to execute
Save: CalendeFi automatically detects and executes it!
Method 2: Web Interface
Scheduler: http://localhost:3001/schedule.html
Live Monitor: http://localhost:3001/monitor.html
Method 3: API Integration
🔔 Transaction Confirmation Methods
1. Real-Time Console Monitoring
2. Live Web Monitor Dashboard
Visit http://localhost:3001/monitor.html for real-time updates

3. Calendar Event Updates
Events automatically update with transaction results and explorer links

4. Blockchain Explorer Verification
Every transaction provides an explorer link for verification

🔧 Development
Prerequisites
Node.js 18+
TypeScript
Google Cloud API credentials
Aptos CLI (for contract development)
Environment Variables
Development Commands
🚧 Roadmap
✅ Completed
Google Calendar OAuth integration
Aptos blockchain integration
Real APT transfers on testnet
Smart contract deployment
Web interface for wallet management
Automatic transaction execution
Transaction monitoring and confirmation
🔄 In Progress
Enhanced error handling
Multi-signature support via calendar invitations
Recurring transaction support
📋 Planned
Aptos mainnet support
Token swap integration
Advanced DeFi operations
Mobile app development
Enterprise features
📚 API Documentation
Core Endpoints
Response Formats
🤝 Contributing
We welcome contributions! Here's how to get started:

Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request
Development Setup
🐛 Troubleshooting
Common Issues
Agent won't start:

Google authentication fails:

Verify client ID/secret in .env.aptos
Check redirect URI matches Google Cloud Console
Ensure Calendar API is enabled
Transactions fail:

Check wallet has sufficient APT balance
Verify recipient address format
Confirm testnet faucet is working
Calendar events not detected:

Verify Google Calendar authentication
Check event title matches supported patterns
Ensure agent is running and monitoring
Debug Mode
📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Aptos Labs - For the amazing Aptos blockchain platform
Google Calendar API - For enabling seamless calendar integration
Community Contributors - For testing and feedback
Open Source Libraries - All the amazing packages that made this possible
📞 Support
📧 Email: [support@calendefi.com]
💬 Discord: [CalendeFi Community]
🐦 Twitter: [@CalendeFi]
🐛 Issues: GitHub Issues
Made with ❤️ for the Aptos ecosystem

🌟 Star this repo | 🐛 Report Bug | 💡 Request Feature

🎯 Quick Links
🚀 Live Demo (when running locally)
📖 Documentation
🎥 Video Tutorial
🛠️ Developer Guide
🔐 Security Policy
Start scheduling your crypto payments today with CalendeFi! 🚀

Claude Sonnet 4 • 1x