import {
  EventHeapAccount,
  FillEvent,
  LeafNode,
  MarketAccount,
  OpenBookV2Client,
  OpenOrdersAccount,
  OutEvent,
} from "@/solana/fermiClient";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { create } from "zustand";
import { produce } from "immer";
import { subscribeWithSelector } from "zustand/middleware";

import { AnchorWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import EmptyWallet from "@/solana/utils/emptyWallet";
import {
  Side,
  checkOrCreateAssociatedTokenAccount,
} from "@/solana/utils/helpers";
import { FERMI_DEVNET_PROGRAM_ID, MARKETS } from "@/solana/constants";

type FermiStore = {
  isMarketLoading: boolean;
  isOOLoading: boolean;
  connected: boolean;
  connection: Connection;
  client: OpenBookV2Client;
  set: (x: (x: FermiStore) => void) => void;
  openOrders: {
    publicKey: PublicKey | undefined;
    current: OpenOrdersAccount | undefined;
    orders: { clientId: string; id: string; lockedPrice: string }[] | undefined;
  };
  selectedMarket: {
    publicKey: PublicKey | undefined;
    current: MarketAccount | undefined;
    bids: LeafNode[] | null | undefined;
    asks: LeafNode[] | null | undefined;
    eventHeap: any | undefined;
  };
  actions: {
    updateConnection: (url: string) => void;
    updateMarket: (newMarket: string) => Promise<void>;
    reloadMarket: () => Promise<void>;
    connectClientWithWallet: (
      wallet: AnchorWallet,
      connection?: Connection
    ) => void;
    fetchOpenOrders: (reloadMarket?: boolean) => Promise<void>;
    cancelOrderById: (id: string) => Promise<void>;
    placeOrder: (price: BN, size: BN, side: "bid" | "ask") => Promise<void>;
    finalise: (
      maker: PublicKey,
      taker: PublicKey,
      slotsToConsume: BN
    ) => Promise<void>;
  };
};

const initFermiClient = (provider: AnchorProvider) => {
  const postSendTxCallback = ({ txid }: { txid: string }) => {
    console.group("Post tx sent callback");
    console.log(`Transaction ${txid} sent`);
    console.log(
      `Explorer: https://explorer.solana.com/tx/${txid}?cluster=devnet`
    );
    toast.success("Transaction sent successfully", { description: txid });
  };
  const txConfirmationCommitment: Commitment = "finalized";
  const opts = {
    postSendTxCallback,
    txConfirmationCommitment,
  };
  const client = new OpenBookV2Client(
    provider,
    new PublicKey(FERMI_DEVNET_PROGRAM_ID),
    opts
  );
  return client;
};

const ENDPOINT = "https://api.devnet.solana.com";
const emptyWallet = new EmptyWallet(Keypair.generate());

export const useFermiStore = create<FermiStore>()(
  subscribeWithSelector((_set, get) => {
    const connection = new Connection(ENDPOINT);
    const provider = new AnchorProvider(connection, emptyWallet, {
      commitment: "finalized",
    });
    const client = initFermiClient(provider);
    return {
      isMarketLoading: false,
      isOOLoading: true,
      connected: false,
      connection: new Connection(ENDPOINT),
      client: client,
      markets: MARKETS,
      selectedMarket: {
        publicKey: undefined,
        current: undefined,
        bids: null,
        asks: null,
        eventHeap: null,
        openOrdersAccount: null,
      },
      openOrders: {
        publicKey: undefined,
        current: undefined,
        orders: undefined,
      },
      openOrdersAccount: undefined,
      set: (fn) => _set(produce(fn)),
      actions: {
        updateMarket: async (newMarketPda: string) => {
          console.log("updating market to", newMarketPda);
          const client = get().client;
          const set = get().set;
          try {
            set((state) => {
              state.isMarketLoading = true;
            });
            if (!client) throw new Error("Client not initialized");
            const newMarket = await client.deserializeMarketAccount(
              new PublicKey(newMarketPda)
            );
            if (!newMarket) throw new Error("Market not found");

            const bidsAccount = await client.deserializeBookSide(
              new PublicKey(newMarket.bids)
            );

            const bids = bidsAccount && client.getLeafNodes(bidsAccount);

            const asksAccount = await client.deserializeBookSide(
              new PublicKey(newMarket.asks)
            );

            const asks = asksAccount && client.getLeafNodes(asksAccount);

            const eventHeapAccount = await client.deserializeEventHeapAccount(
              new PublicKey(newMarket.eventHeap)
            );

            const eventHeap =
              eventHeapAccount && parseEventHeap(client, eventHeapAccount);

            set((state) => {
              state.selectedMarket.publicKey = new PublicKey(newMarketPda);
              state.selectedMarket.current = newMarket;
              state.selectedMarket.bids = bids;
              state.selectedMarket.asks = asks;
              state.selectedMarket.eventHeap = eventHeap;
            });

            console.log("Market Updated Successfully");
            // get().actions.fetchOpenOrders()
          } catch (err: any) {
            console.log("Error in updateSelectedMarket:", err?.message);
            set((state) => {
              state.selectedMarket.publicKey = undefined;
              state.selectedMarket.current = undefined;
              state.selectedMarket.bids = undefined;
              state.selectedMarket.asks = undefined;
              state.selectedMarket.eventHeap = undefined;
            });
          } finally {
            console.groupEnd();
            set((state) => {
              state.isMarketLoading = false;
            });
          }
        },
        connectClientWithWallet: (
          wallet: AnchorWallet,
          connection?: Connection
        ) => {
          const set = get().set;
          const conn = connection || get().connection;

          try {
            const provider = new AnchorProvider(conn, wallet, {
              commitment: "confirmed",
              maxRetries: 3,
            });

            const client = initFermiClient(provider);

            set((s) => {
              s.connected = true;
              s.connection = conn;
              s.client = client;
            });

            toast.success("Connected wallet to client successfully");
            console.log("Connected wallet to client successfully");
          } catch (e) {
            console.error("Error in connectClientWithWallet ", e);
          }
        },
        reloadMarket: async () => {
          const updateMarket = get().actions.updateMarket;
          updateMarket(get().selectedMarket.publicKey?.toString() ?? "");
        },
        updateConnection: (url: string) => {
          const set = get().set;
          set((state) => {
            state.connected = true;
            state.connection = new Connection(url);
          });
        },
        finalise: async (maker, taker, slotsToConsume: BN) => {
          const client = get().client;
          const market = get().selectedMarket.current;
          if (!client) throw new Error("Client not found");
          if (!market) throw new Error("No market found!");
          const marketPublicKey = get().selectedMarket.publicKey;
          if (!marketPublicKey) throw new Error("No market found!");

          const ooMaker = await client.deserializeOpenOrderAccount(maker);
          const ooTaker = await client.deserializeOpenOrderAccount(taker);
          console.log(ooMaker?.owner.toString());
          console.log(ooTaker?.owner.toString());
          if (!ooMaker || !ooTaker) throw new Error("Open orders not found");
          const makerAtaPublicKey = new PublicKey(
            await checkOrCreateAssociatedTokenAccount(
              client.provider,
              market.quoteMint,
              ooMaker?.owner
            )
          );
          const takerAtaPublicKey = new PublicKey(
            await checkOrCreateAssociatedTokenAccount(
              client.provider,
              market.quoteMint,
              ooTaker?.owner
            )
          );
          const accounts = {
            market: marketPublicKey,
            marketAuthority: market.marketAuthority,
            eventHeap: market.eventHeap,
            makerAta: makerAtaPublicKey,
            takerAta: takerAtaPublicKey,
            marketVaultBase: market.marketBaseVault,
            marketVaultQuote: market.marketQuoteVault,
            maker: maker,
          };

          const [ix, signers] = await client.createFinalizeEventsInstruction(
            marketPublicKey,
            market.marketAuthority,
            market.eventHeap,
            makerAtaPublicKey,
            takerAtaPublicKey,
            market.marketBaseVault,
            market.marketQuoteVault,
            maker,
            slotsToConsume
          );

          await client.sendAndConfirmTransaction([ix], {
            additionalSigners: signers,
          });
        },
        cancelOrderById: async (id: string) => {
          console.group("Cancelling All orders");
          const client = get().client;
          const market = get().selectedMarket;
          const openOrders = get().openOrders;
          const orderId = new BN(id);
          if (!client) throw new Error("Open orders account not found");
          if (!openOrders.current || !openOrders.publicKey)
            throw new Error("Open orders account not found");
          if (!market.current) throw new Error("market not found");
          const [ix, signers] = await client?.cancelOrderById(
            openOrders.publicKey,
            openOrders.current,
            market.current,
            orderId
          );
          await client.sendAndConfirmTransaction([ix]);
          await get().actions.fetchOpenOrders();
          await get().actions.reloadMarket();
        },
        placeOrder: async (price: BN, size: BN, side: "bid" | "ask") => {
          const client = get().client;
          const oo = get().openOrders;
          const selectedMarket = get().selectedMarket;

          if (!client) throw new Error("Client not found");
          if (!oo.current || !oo.publicKey)
            throw new Error("Open orders not found");
          if (!selectedMarket.current || !selectedMarket.publicKey)
            throw new Error("Market not found");

          // generate client id  - number of open orders + 1
          const clientOrderId = new BN((oo?.orders?.length ?? 0) + 1);

          // build order args
          const orderArgs = {
            side: side === "bid" ? Side.Bid : Side.Ask,
            priceLots: price,
            maxBaseLots: size,
            maxQuoteLotsIncludingFees: new BN(size).mul(new BN(price)),
            clientOrderId,
            orderType: { limit: {} },
            expiryTimestamp: new BN(Math.floor(Date.now() / 1000) + 3600),
            selfTradeBehavior: { decrementTake: {} }, // Options might include 'decrementTake', 'cancelProvide', 'abortTransaction', etc.
            limit: 5,
          };

          // get user token account according to the side
          // quote ata for bid, base ata for ask
          let userTokenAccount;
          if (side === "bid") {
            userTokenAccount = new PublicKey(
              await checkOrCreateAssociatedTokenAccount(
                client.provider,
                selectedMarket.current?.quoteMint,
                client.walletPk
              )
            );
          } else {
            userTokenAccount = new PublicKey(
              await checkOrCreateAssociatedTokenAccount(
                client.provider,
                selectedMarket.current?.baseMint,
                client.walletPk
              )
            );
          }

          const [ix, signers] = await client.placeOrderIx(
            oo.publicKey,
            selectedMarket.publicKey,
            selectedMarket.current,
            selectedMarket.current.marketAuthority,
            userTokenAccount,
            null, // openOrdersAdmin
            orderArgs,
            [] // remainingAccounts
          );
          // Send transaction
          await client.sendAndConfirmTransaction([ix], {
            additionalSigners: signers,
          });
          await get().actions.reloadMarket();
          await get().actions.fetchOpenOrders();
        },
        fetchOpenOrders: async (reloadMarket: boolean = false) => {
          console.log("fetching open orders");
          const client = get().client;
          const selectedMarketPk = get().selectedMarket.publicKey;
          const set = get().set;
          set((state) => {
            state.isOOLoading = true;
          });
          try {
            if (!client || !selectedMarketPk)
              throw new Error("Client or Market not initialized");
            const openOrdersAccounts = await client.findOpenOrdersForMarket(
              client.walletPk,
              selectedMarketPk
            );

            const openOrdersAccountPk = openOrdersAccounts[0];
            if (!openOrdersAccountPk)
              throw new Error("Open Orders account Public Key not found");
            let openOrdersAccount = await client.deserializeOpenOrderAccount(
              openOrdersAccountPk
            );
            if (!openOrdersAccount)
              throw new Error("Open Orders account not found!");
            let orders: any = openOrdersAccount.openOrders;
            // parse orders

            if (orders) {
              orders = orders.filter((i: any) => i.isFree === 0);
              orders = orders.map((i: any) => ({
                clientId: i.clientId.toString(),
                lockedPrice: i.lockedPrice.toString(),
                id: i.id.toString(),
              }));
            }
            console.log("Fetched open orders Successfully");
            set((state) => {
              state.openOrders.publicKey = openOrdersAccountPk;
              state.openOrders.current = openOrdersAccount;
              state.openOrders.orders = orders;
            });
            if (reloadMarket) get().actions.reloadMarket();
          } catch (err) {
            console.error("Error in fetchOpenOrders:", err);
            set((state) => {
              state.openOrders.publicKey = undefined;
              state.openOrders.current = undefined;
              state.openOrders.orders = undefined;
            });
          } finally {
            set((state) => {
              state.isOOLoading = false;
            });
          }
        },
      },
    };
  })
);

export const openOrdersSelector = (state: FermiStore) => state.openOrders;
export const selectedMarketSelector = (state: FermiStore) =>
  state.selectedMarket;

export const parseEventHeap = (
  client: OpenBookV2Client,
  eventHeap: EventHeapAccount | null
) => {
  if (eventHeap == null) throw new Error("Event Heap not found");
  let fillEvents: any = [];
  let outEvents: any = [];
  // let nodes: any = [];
  if (eventHeap !== null) {
    (eventHeap.nodes as any).forEach((node, i) => {
      // nodes.push(node.event);
      if (node.event.eventType === 0) {
        const fillEvent: FillEvent = client.program.coder.types.decode(
          "FillEvent",
          Buffer.from([0, ...node.event.padding])
        );
        if (fillEvent.timestamp.toString() !== "0") {
          fillEvents.push({
            ...fillEvent,
            index: i,
            maker: fillEvent.maker.toString(),
            taker: fillEvent.taker.toString(),
            price: fillEvent.price.toString(),
            quantity: fillEvent.quantity.toString(),
            makerClientOrderId: fillEvent.makerClientOrderId.toString(),
            takerClientOrderId: fillEvent.takerClientOrderId.toString(),
          });
        }
      } else {
        const outEvent: OutEvent = client.program.coder.types.decode(
          "OutEvent",
          Buffer.from([0, ...node.event.padding])
        );
        if (outEvent.timestamp.toString() !== "0")
          outEvents.push({ ...outEvent, index: i });
      }
    });
  }
  console.log({ fillEvents, outEvents });
  return fillEvents;
};
