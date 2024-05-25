import React, { useEffect, useState } from "react";

import Asks from "./Asks";
import Bids from "./Bids";
import LastTradedPrice from "./LastTradedPrice";
import WebSocketStatus from "./WebsocketStatus";
import { toast } from "sonner";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useFermiStore } from "@/stores/fermiStore";

const wsUrl = "wss://api.fermilabs.xyz";

type Props = {};

/**
 * Orderbook component displays the order book for a selected market.
 * It connects to a WebSocket to receive real-time updates for bids and asks.
 * @param props - The component props.
 */
const Orderbook = (props: Props) => {
  const [ws, setWs] = useState<WebSocket | null>(null); // WebSocket connection
  const selectedMarket = useFermiStore((s) => s.selectedMarket); // Selected market from the store
  const [asks, setAsks] = useState([]); // Array of asks
  const [bids, setBids] = useState([]); // Array of bids
  const connectedWallet = useAnchorWallet(); // Connected wallet
  const [isWsConnected, setIsWsConnected] = useState(false); // WebSocket connection status

  useEffect(() => {
    /**
     * Connects to the WebSocket and subscribes to the selected market.
     * Handles WebSocket events for open, message, close, and error.
     */
    const connectWebSocket = () => {
      if (ws?.OPEN || ws?.CONNECTING) return; // If WebSocket is already open or connecting, return

      const websocket = new WebSocket(wsUrl); // Create a new WebSocket instance
      setWs(websocket); // Set the WebSocket connection

      websocket.onopen = () => {
        setIsWsConnected(true); // Set WebSocket connection status to true
        toast.success("Orderbook connected."); // Show success toast
        // Subscribe to the selected market
        websocket.send(
          JSON.stringify({
            type: "subscribe",
            subscriberPublicKey: connectedWallet?.publicKey?.toBase58(),
            marketAddress: selectedMarket?.publicKey,
          })
        );
      };

      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data); // Parse the received message
        if (message.type === "bids") {
          setBids(message.data); // Update bids with the received data
        } else if (message.type === "asks") {
          setAsks(message.data); // Update asks with the received data
        }
      };

      websocket.onclose = () => {
        setIsWsConnected(false); // Set WebSocket connection status to false
        // Try to reconnect after a delay
        toast.error("WebSocket connection closed. Reconnecting...");
        setTimeout(connectWebSocket, 100);
      };

      websocket.onerror = (err) => {
        setIsWsConnected(false); // Set WebSocket connection status to false
        // Try to reconnect after a delay
        setTimeout(connectWebSocket, 1000);
      };
    };

    if (selectedMarket?.publicKey) {
      connectWebSocket(); // Connect to the WebSocket if a selected market is available
    }

    console.log({ bids, asks });

    return () => {
      // Clean up the WebSocket connection when the component unmounts
      if (ws) {
        ws.close(); // Close the WebSocket connection
      }
    };
  }, [selectedMarket, connectedWallet]);

  return (
    <>
      <div className="border-b px-3 py-2 flex justify-between  border-gray-600 text-lg bg-gray-900/50">
        Orderbook
        <WebSocketStatus isConnected={isWsConnected} />
      </div>
      <div className="text-xs  flex-1 flex flex-col">
        <div className="flex text-white/40 bg-gray-900 border-b border-gray-600 p-3 py-2 justify-between items-center">
          <div>
            Price{" "}
            <span className="p-0.5 px-1.5 rounded-sm bg-gray-800">
              {selectedMarket?.quoteTokenName ?? "QUOTE"}
            </span>
          </div>
          <div>
            Quantity{" "}
            <span className="p-0.5 px-1.5 rounded-sm bg-gray-800">
              {selectedMarket?.baseTokenName ?? "BASE"}
            </span>
          </div>
        </div>
        <Asks data={asks} />
        <LastTradedPrice />
        <Bids data={bids} />
      </div>
    </>
  );
};

export default Orderbook;
