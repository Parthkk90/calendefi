import { AptosClient, AptosAccount, TxnBuilderTypes } from 'aptos';

const NODE_URL = process.env.APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com/v1';
const client = new AptosClient(NODE_URL);

export const connectWallet = async () => {
    // Logic to connect to the Aptos wallet (Petra/Martian)
    // This will involve wallet-specific methods to initiate the connection
};

export const sendTransaction = async (recipient: string, amount: number, token: string) => {
    const account = new AptosAccount(); // Replace with actual account retrieval logic
    const payload = {
        type: 'entry_function_payload',
        function: '0x1::coin::transfer',
        arguments: [recipient, amount],
        type_arguments: [token],
    };

    const transactionRequest = {
        sender: account.address(),
        payload,
        gas_unit_price: 100,
        max_gas_amount: 1000,
    };

    try {
        const response = await client.generateTransaction(account.address(), transactionRequest);
        const signedTxn = await client.signTransaction(account, response);
        const txnHash = await client.submitTransaction(signedTxn);
        return txnHash;
    } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
    }
};