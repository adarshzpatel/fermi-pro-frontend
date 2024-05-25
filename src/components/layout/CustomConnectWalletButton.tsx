"use client";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@nextui-org/react";
import { TbArrowsExchange2, TbCopy, TbLogout } from "react-icons/tb";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";
import useSolBalance from "@/hooks/useSolBalance";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWalletMultiButton } from "@solana/wallet-adapter-base-ui";

// CustomWalletConnectButton component
const CustomWalletConnectButton = () => {
  const { disconnect } = useWallet();
  const { solBalance } = useSolBalance();
  const { setVisible: setModalVisible } = useWalletModal();
  const { buttonState, onConnect, publicKey } = useWalletMultiButton({
    onSelectWallet() {
      setModalVisible(true);
    },
  });
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLUListElement>(null);

  // Close the dropdown menu when clicking outside of it
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const node = ref.current;

      // Do nothing if clicking dropdown or its descendants
      if (!node || node.contains(event.target as Node)) return;

      setMenuOpen(false);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, []);

  // Handle disconnecting from the wallet
  const handleDisconnect = useCallback(() => {
    disconnect().catch(() => {
      // Silently catch because any errors are caught by the context `onError` handler
    });
  }, [disconnect]);

  // Generate the content to be displayed in the button
  const content = useMemo(() => {
    if (publicKey) {
      const base58 = publicKey.toBase58();
      return base58.slice(0, 4) + "..." + base58.slice(-4);
    } else if (buttonState === "connecting") {
      return "Connecting...";
    } else if (buttonState === "has-wallet") {
      return "Connect";
    } else if (buttonState === "no-wallet") {
      return "Select Wallet";
    }
  }, [buttonState, publicKey]);

  return (
    <>
      <Dropdown
        showArrow
        classNames={{
          base: "",
          content:
            "bg-gray-950 border  shadow-2xl shadow-gray-950  border-gray-600",
          arrow: "",
        }}
      >
        {buttonState === "connected" ? (
          // Display the connected wallet information
          <DropdownTrigger className="px-4 bg-gray-800/50 border-gray-700 border-l h-full rounded-r-xl hover:bg-gray-800 text-white/60 hover:text-white ease-out duration-300">
            <div className="flex items-center ">
              {solBalance && (
                <p className="hidden text-sm sm:block pr-4">
                  {solBalance && (solBalance / 1000000000).toFixed(4) + " SOL "}
                </p>
              )}
              <p className="border-l border-gray-600 pl-4">{content}</p>
            </div>
          </DropdownTrigger>
        ) : (
          // Display the connect button
          <button
            onClick={() => {
              console.log(buttonState);
              setModalVisible(true);
              switch (buttonState) {
                case "no-wallet":
                  setModalVisible(true);
                  break;
                case "has-wallet":
                  if (onConnect) {
                    onConnect();
                  }
                  break;
              }
            }}
            aria-expanded={menuOpen}
            className="px-4 bg-gray-800/50 border-gray-700 border-l h-full rounded-r-xl hover:bg-gray-800 text-white/60 hover:text-white ease-out duration-300"
          >
            {content}
          </button>
        )}
        <DropdownMenu aria-label="Wallet dropdown with options to change wallet and disconnect">
          {/* Copy Address option */}
          <DropdownItem
            closeOnSelect={false}
            className="data-[hover=true]:bg-gray-800"
            startContent={<TbCopy className="h-5 w-5" />}
            onClick={async () => {
              await navigator.clipboard.writeText(publicKey?.toBase58() ?? "");
              setCopied(true);
              toast.success("Copied to clipboard");
              setTimeout(() => setCopied(false), 400);
            }}
            key="copy_address"
          >
            {copied ? "Copied" : "Copy Address"}
          </DropdownItem>
          {/* Change Wallet option */}
          <DropdownItem
            className="data-[hover=true]:bg-gray-800"
            startContent={<TbArrowsExchange2 className="h-5 w-5" />}
            onClick={() => setModalVisible(true)}
            key="change_wallet"
          >
            Change wallet
          </DropdownItem>
          {/* Disconnect option */}
          <DropdownItem
            className="text-red-500 data-[hover=true]:bg-red-500 data-[hover=true]:text-white"
            startContent={<TbLogout className="h-5 w-5" />}
            onClick={() => handleDisconnect()}
            key="disconnect"
          >
            Disconnect
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </>
  );
};

export default CustomWalletConnectButton;
