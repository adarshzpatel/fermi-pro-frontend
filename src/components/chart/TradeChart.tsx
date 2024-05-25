import { AreaData, Time, WhitespaceData } from "lightweight-charts";
import React, { useEffect, useState } from "react";

import { ChartComponent } from "./ChartComponent";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Spinner } from "@nextui-org/react";
import supabase from "@/supabase";
import { useFermiStore } from "@/stores/fermiStore";

type Props = {};

type ChartStates = "loaded" | "loading" | "error";
type ChartDataType = (AreaData<Time> | WhitespaceData<Time>)[];

const TradeChart = (props: Props) => {
  const selectedMarket = useFermiStore((s) => s.selectedMarket);
  const [state, setState] = useState<ChartStates>("loading");
  const [data, setData] = useState<ChartDataType>([]);

  const fetchInitialData = async (marketString: string) => {
    // get the price feed from price_feed data matching current market
    if (marketString) {
      try {
        const res = await supabase
          .from("price_feed")
          .select("*")
          .eq("market", marketString);

        if (res?.data) {
          // convert the timestampz to UTC timestamp
          const chartData = res.data.map((it) => ({
            time: Date.parse(it.timestamp) / 1000,
            value: it.price,
          }));

          setData(chartData as ChartDataType);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setState("loaded");
      }
    }
  };

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    const marketString = selectedMarket?.publicKey.toString();
    if (marketString) {
      // get the initial price feed data
      fetchInitialData(marketString);

      // subscribe to the price feed channel 
      channel = supabase?.channel(`price_feed`).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "price_feed",
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData) {
            // convert timestampz to UTC timestamp
            const chartData = {
              time: Date.parse(newData.timestamp) / 1000,
              value: newData.price,
            };
            setData((prevData) => [...prevData, chartData] as ChartDataType);
          }
        }
      );

      channel.subscribe((status) => {
        return
      });
    }

    // clean up the channel on unmount
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [selectedMarket]);

  if (state === "loading") {
    return <Spinner color="current" />;
  }

  if (state === "error") {
    return "Something went wrong";
  }

  return <ChartComponent data={data} />;
};

export default TradeChart;
