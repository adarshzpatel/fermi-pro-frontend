"use client";

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@nextui-org/react";
import { MARKETS } from "@/solana/constants";
import MarketList from "@/components/trade-form/MarketList";
import MarketSelector from "@/components/trade-form/MarketSelector";
import Navigation from "@/components/layout/Navigation";
import { PublicKey } from "@solana/web3.js";
import axios from "axios";
import { fetchTokenBalance } from "@/solana/utils/helpers";
import { toast } from "sonner";
import { useFermiStore } from "@/stores/fermiStore";

type Balances = { baseBalance: string; quoteBalance: string };



const Airdrop = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const marketParam = searchParams?.get("market");
  const selectedMarket = useFermiStore((state) => state.selectedMarket);
  const connectedWallet = useAnchorWallet();
  const { connection } = useConnection();
  const client = useFermiStore((s) => s.client);
  const set = useFermiStore((s) => s.set);
  const [isMarketListOpen, setIsMarketListOpen] = useState(false);

  const [balances, setBalances] = useState<Balances>({
    quoteBalance: "0.00",
    baseBalance: "0.00",
  });
  useLayoutEffect(() => {
    if (!marketParam) {
      router.replace(`/airdrop?market=${MARKETS[0].marketPda}`);
    }
  }, [marketParam, router]);

  const findAndSetMarket = async (marketPk: string) => {
    try {
      const { marketPda, baseTokenName, quoteTokenName } =
        MARKETS.find((it) => it.marketPda === marketPk) ?? MARKETS[0];

      const marketAccount = await client.deserializeMarketAccount(
        new PublicKey(marketPda)
      );

      if (marketAccount === null) throw new Error("Market is Null");
      set((s) => {
        s.selectedMarket = {
          publicKey: new PublicKey(marketPda),
          current: marketAccount,
          baseTokenName,
          quoteTokenName,
        };
      });

    } catch (err: any) {
      console.log("[MARKET]", err);
      toast.error("Market Not Found");
    } finally {
      setIsMarketListOpen(false)
    }
  };
  useEffect(() => {
    if (client && marketParam) {
      findAndSetMarket(marketParam);
    }
  }, [marketParam]);
  const getQuoteBalance = async () => {
    try {
      setBalances((prev) => ({
        ...prev,
        quoteBalance: "Fetching...",
      }));
      if (!connectedWallet?.publicKey) throw new Error("Wallet not connected");
      if (!selectedMarket?.current) throw new Error("Market not selected");

      const quoteBalance = await fetchTokenBalance(
        connectedWallet?.publicKey,
        selectedMarket.current?.quoteMint,
        connection
      );
      setBalances((prev) => ({
        ...prev,
        quoteBalance: (Number(quoteBalance) / 1000000).toFixed(2),
      }));
    } catch (err) {
      setBalances((prev) => ({
        ...prev,
        quoteBalance: "0.00",
      }));
      console.log("Error in getQuoteBalance", err);
    }
  };
  const getBaseBalance = async () => {
    try {
      setBalances((prev) => ({
        ...prev,
        baseBalance: "Fetching...",
      }));
      if (!connectedWallet?.publicKey) throw new Error("Wallet not connected");
      if (!selectedMarket?.current) throw new Error("Market not selected");

      const baseBalance = await fetchTokenBalance(
        connectedWallet.publicKey,
        selectedMarket.current?.baseMint,
        connection
      );

      setBalances((prev) => ({
        ...prev,
        baseBalance: (Number(baseBalance) / 1000000000).toFixed(2),
      }));
    } catch (err) {
      setBalances((prev) => ({
        ...prev,
        baseBalance: "0.00",
      }));
      console.log("Error in getBaseBalance", err);
    }
  };

  const airdropToken = async (mint: string, amount: number) => {
    try {
      const data = {
        destinationAddress: connectedWallet?.publicKey,
        mint,
        amount,
      };
      await axios.post("/api/airdrop", data);
      await getBaseBalance();
      await getQuoteBalance();
      toast.success("Airdrop Successful ✅");
    } catch (err) {
      toast.error("Failed to send airdrop.");
      console.log(err);
    } 
  };

  useEffect(() => {
    if (connectedWallet && selectedMarket) {
      getBaseBalance();
      getQuoteBalance();
    }
  }, [selectedMarket, connectedWallet]);

  return (
    <main className="h-screen bg-gradient-to-t from-primary-700 to-primary-400 flex flex-col space-y-4  text-white p-4 bg-gradient">
      <Navigation />
      <div className="flex-1 grid place-items-center">

      <div className="border-default-200  bg-gradient-to-br via-gray-950 from-gray-900/75 to-gray-900/75 relative flex w-full max-w-md flex-col gap-4 overflow-hidden rounded-xl border  p-6">
        {/* PAY SECTION */}
        <p className="whitespace-nowrap  text-2xl font-medium">
          Airdrop Tokens
        </p>
        <div className="bg-gray-800/50 border rounded-xl overflow-hidden border-gray-600">
          <MarketSelector
            handleClick={() => setIsMarketListOpen((prev) => !prev)}
            />
        </div>
        {isMarketListOpen ? (
          <div className="bg-gray-800/50 border rounded-xl overflow-hidden border-gray-600">
            <MarketList
              markets={MARKETS.filter(
                (it) => it.marketPda !== selectedMarket?.publicKey.toString()
                )}
                />
          </div>
        ) : (
          <>
            <div className="bg-gray-800/50 border-gray-600 rounded-xl  border p-4">
              <p className="font-medium">Market</p>
              <p className="text-default-600 text-xs">
                {selectedMarket !== undefined
                  ? selectedMarket?.publicKey?.toString()
                  : "Loading Market...."}
              </p>
            </div>
            <div className="bg-gray-800/50 border-gray-600 rounded-xl border p-4">
              <p className="font-medium">Quote token</p>
              <p className="border-gray-600 text-xs">
                {selectedMarket !== undefined
                  ? selectedMarket.current?.quoteMint.toString()
                  : "Loading..."}
              </p>
              <Button
                isDisabled={selectedMarket === undefined}
                radius="sm"
                onClick={() => {
                  if (!selectedMarket?.current) return;
                  airdropToken(
                    selectedMarket?.current?.quoteMint.toString(),
                    10000 * 1000000
                    );
                  }}
                  size="sm"
                  className="my-2"
                  color="primary"
                  >
                Airdrop 1000 quote tokens
              </Button>
              <p>Balance : {balances.quoteBalance}</p>
            </div>
            <div className="bg-gray-800/50 border-gray-600 rounded-xl  border p-4">
              <p className="font-medium">Base Token</p>
              <p className="text-default-600 text-xs">
                {selectedMarket !== undefined
                  ? selectedMarket.current?.baseMint.toString()
                  : "Loading..."}
              </p>
              <Button
                isDisabled={selectedMarket === undefined}
                onClick={() => {
                  if (!selectedMarket?.current) return;
                  airdropToken(
                    selectedMarket.current?.baseMint.toString(),
                    10000 * 1000000000
                    );
                  }}
                  size="sm"
                  radius="sm"
                  className="my-2"
                  color="primary"
                  >
                Airdrop 1000 base tokens
              </Button>
              <p>Balance : {balances.baseBalance}</p>
            </div>
          </>
        )}
        </div>
      </div>
    </main>
  );
};

export default Airdrop;
