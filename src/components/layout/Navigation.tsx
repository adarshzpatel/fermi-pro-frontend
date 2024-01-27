import CustomWalletConnectButton from "./CustomConnectWalletButton";
import Link from "next/link";

const Navigation = () => {
  return (
    <header className="border-b-1 border-default-300 ">
      <nav className="flex ">
        <Link
          href={"/"}
          className="font-semibold  p-4  flex-1 text-2xl m-auto font-heading"
        >
          Fermi
        </Link>
        <Link
          color="foreground"
          href="/airdrop"
          className="p-4 flex hover:bg-default-100/50 cursor-pointer items-center justify-center border-l border-default-300"
        >
          Airdrop
        </Link>
        <Link
          color="foreground"
          href="/trade"
          className="p-4 flex hover:bg-default-100/50 cursor-pointer items-center justify-center border-l border-default-300"
        >
          Trade
        </Link>
        <div>
          <CustomWalletConnectButton />
        </div>
      </nav>
    </header>
  );
};

export default Navigation
