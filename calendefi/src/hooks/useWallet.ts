import { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, getWalletAddress } from '../services/aptos/aptosWallet';

const useWallet = () => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    useEffect(() => {
        const fetchWalletAddress = async () => {
            const address = await getWalletAddress();
            if (address) {
                setWalletAddress(address);
                setIsConnected(true);
            }
        };

        fetchWalletAddress();
    }, []);

    const connect = async () => {
        const address = await connectWallet();
        if (address) {
            setWalletAddress(address);
            setIsConnected(true);
        }
    };

    const disconnect = async () => {
        await disconnectWallet();
        setWalletAddress(null);
        setIsConnected(false);
    };

    return {
        walletAddress,
        isConnected,
        connect,
        disconnect,
    };
};

export default useWallet;