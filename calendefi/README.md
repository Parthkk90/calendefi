# CalendeFi

CalendeFi is a decentralized application that integrates Google Calendar with Aptos blockchain functionalities. It allows users to manage their calendar events while executing transactions on the Aptos network based on scheduled events.

## Features

- **Google Calendar Integration**: Fetch and display user events from Google Calendar.
- **NLP Intent Parsing**: Classify calendar events into intents such as payments, swaps, and governance actions.
- **Aptos Wallet Integration**: Connect to Aptos wallets (Petra/Martian) and execute transactions.
- **Scheduled Transactions**: Automatically trigger blockchain transactions based on calendar events.
- **Dashboard**: Monitor the status of transactions and calendar events.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)
- Aptos wallet (Petra or Martian)
- Google Calendar API access

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd calendefi
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in the required API keys and secrets.

### Running the Application

To start the application in development mode, run:
```
npm start
```

### Usage

- Connect your Aptos wallet using the WalletConnect component.
- Authorize Google Calendar access to fetch your events.
- Create calendar events with specific intents (e.g., payments, swaps).
- Monitor the dashboard for transaction statuses.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.