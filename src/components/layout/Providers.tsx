"use client";
import { NextUIProvider } from "@nextui-org/react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo, useState, useEffect } from "react";

import "@solana/wallet-adapter-react-ui/styles.css";
import FullScreenLoading from "../shared/FullScreenLoading";
import CustomToaster from "../shared/CustomToaster";

type ProviderProps = {
  children: React.ReactNode;
};

const SolanaWalletProviders = ({ children }: ProviderProps) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <>
      <ConnectionProvider
        endpoint={endpoint}
        config={{ commitment: "confirmed" }}
      >
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
      <CustomToaster />
    </>
  );
};

const Providers = ({ children }: ProviderProps) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  if (!isMounted) {
    return <FullScreenLoading />;
  }
  return (
    <SolanaWalletProviders>
      <NextUIProvider>{children}</NextUIProvider>
    </SolanaWalletProviders>
  );
};

export default Providers;
