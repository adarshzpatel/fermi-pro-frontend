import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { type Keypair, type Connection, type PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccount, mintTo } from "./helpers";

interface AirdropTokenParams {
  receiverPk: PublicKey;
  ownerKp: Keypair;
  connection: Connection;
  mint: PublicKey;
  amount: number;
}

export async function airdropToken({
  receiverPk,
  ownerKp,
  connection,
  mint,
  amount,
}: AirdropTokenParams): Promise<void> {
  try {
    const wallet = new anchor.Wallet(ownerKp);
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions()
    );

    const receiverTokenAccount: PublicKey = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(mint),
      receiverPk,
      false
    );

    if ((await connection.getAccountInfo(receiverTokenAccount)) == null) {
      console.log("ATA not found, creating one...");
    await createAssociatedTokenAccount(
        provider,
        new anchor.web3.PublicKey(mint),
        receiverTokenAccount,
        receiverPk
      );
      console.log("✅ ATA created for ", receiverPk.toString());
    }

    await mintTo(
      provider,
      new anchor.web3.PublicKey(mint),
      receiverTokenAccount,
      BigInt(amount.toString())
    );

    console.log(
      "✅ Tokens minted successfully to ",
      receiverTokenAccount.toString()
    );

    // return receiverTokenAccount;
  } catch (err) {
    console.log("Something went wrong while airdropping coin token.");
    console.log(err);
  }
}