import React, { useEffect, useState } from "react";

import supabase from "@/supabase";
import { toast } from "sonner";
import { useFermiStore } from "@/stores/fermiStore";

type Props = {};

/**
 * Renders the last traded price component.
 * @param {Props} props - The component props.
 * @returns {JSX.Element} The last traded price component.
 */
const LastTradedPrice = (props: Props) => {
  const [lastTradedPrice, setLastTradedPrice] = useState<string | null>(null);
  const selectedMarket = useFermiStore((s) => s.selectedMarket);

  useEffect(() => {
    if (selectedMarket?.publicKey) {
      /**
       * Fetches the last traded price from the price feed.
       */
      const getLastTradedPrice = async () => {
        // Subscribe to the price feed channel
        const { data, error } = await supabase
          .from("price_feed")
          .select("*")
          .eq("market", selectedMarket.publicKey.toString())
          .order("timestamp", { ascending: false })
          .limit(1);

        if (error) {
          toast.error("Failed to get last traded price");
          console.error("[LAST_TRADED_PRICE] :", error);
          return;
        }
        
        // If we have data , get the last traded price
        if (data?.length > 0) {
          const price = data?.[0]?.["price"];
          if (price) setLastTradedPrice(price);
        }
      };

      getLastTradedPrice();
    }
  }, [selectedMarket]);

  return (
    <div className="bg-gray-900/75 border-y text-center text-sm  font-medium border-gray-600 p-4">
      {lastTradedPrice ?? "Last traded price"}
    </div>
  );
};

export default LastTradedPrice;
