import React, { createContext, useContext, useEffect, useState } from "react";
import { TonConnectUI } from "@tonconnect/ui";

const TonConnectContext = createContext();

export const TonConnectProvider = ({ children }) => {
  const [tonConnectUI, setTonConnectUI] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState("0");

  useEffect(() => {
    // Initialize TonConnect UI
    const tonConnect = new TonConnectUI({
      manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
    });

    setTonConnectUI(tonConnect);

    // Subscribe to wallet changes
    const unsubscribe = tonConnect.onStatusChange(async (wallet) => {
      setWallet(wallet);
      if (wallet) {
        // Get wallet balance
        try {
          const client = tonConnect.wallet?.connector?.client;
          if (client) {
            // In production, fetch from blockchain
            // For now, we'll get it from user profile in backend
            setBalance(wallet.account?.balance || "0");
          }
        } catch (error) {
          console.error("Error fetching balance:", error);
        }
      }
    });

    return () => unsubscribe?.();
  }, []);

  const connectWallet = async () => {
    if (!tonConnectUI) return;
    setIsConnecting(true);
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (!tonConnectUI) return;
    try {
      await tonConnectUI.disconnect();
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };

  const sendTransaction = async (transaction) => {
    if (!tonConnectUI || !wallet) {
      throw new Error("Wallet not connected");
    }
    try {
      const result = await tonConnectUI.sendTransaction(transaction);
      return result;
    } catch (error) {
      console.error("Transaction error:", error);
      throw error;
    }
  };

  const value = {
    tonConnectUI,
    wallet,
    isConnecting,
    balance,
    connectWallet,
    disconnectWallet,
    sendTransaction,
    isConnected: !!wallet,
  };

  return (
    <TonConnectContext.Provider value={value}>
      {children}
    </TonConnectContext.Provider>
  );
};

export const useTonConnect = () => {
  const context = useContext(TonConnectContext);
  if (!context) {
    throw new Error("useTonConnect must be used within TonConnectProvider");
  }
  return context;
};
