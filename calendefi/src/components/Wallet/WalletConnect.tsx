import React, { useState } from 'react';
import { connectPetraWallet, connectMartianWallet } from '../../services/aptos/aptosWallet';

const WalletConnect: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleConnectPetra = async () => {
        try {
            const address = await connectPetraWallet();
            setWalletAddress(address);
            setError(null);
        } catch (err) {
            setError('Failed to connect to Petra wallet');
        }
    };

    const handleConnectMartian = async () => {
        try {
            const address = await connectMartianWallet();
            setWalletAddress(address);
            setError(null);
        } catch (err) {
            setError('Failed to connect to Martian wallet');
        }
    };

    return (
        <div>
            <h2>Connect Your Wallet</h2>
            <button onClick={handleConnectPetra}>Connect Petra Wallet</button>
            <button onClick={handleConnectMartian}>Connect Martian Wallet</button>
            {walletAddress && <p>Connected: {walletAddress}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default WalletConnect;