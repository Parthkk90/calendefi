export const config = {
    googleCalendarAPIKey: process.env.GOOGLE_CALENDAR_API_KEY,
    aptosNodeUrl: process.env.APTOS_NODE_URL,
    aptosUSDCAddress: process.env.APTOS_USDC_ADDRESS,
    nlpServiceUrl: process.env.NLP_SERVICE_URL,
    defaultTransactionFee: process.env.DEFAULT_TRANSACTION_FEE || 0.01,
};