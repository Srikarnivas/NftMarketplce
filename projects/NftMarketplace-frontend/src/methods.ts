import * as algokit from "@algorandfoundation/algokit-utils";
import { NftMarketplaceContractClient, NftMarketplaceContractFactory } from "./contracts/NFTMarketplaceContract";
import { TransactionSigner } from "algosdk";
import { useState } from "react";

export async function create(
  algorand: algokit.AlgorandClient,
  sender: string,
  assetname: string,
  url: string,
  unitName: string,
  manager?: string,
  reserve?: string,
  freeze?: string,
  clawback?: string
): Promise<bigint> {
  const assetCreate = await algorand.send.assetCreate({
    sender,
    total: BigInt(1),
    decimals: 0,
    assetName: assetname,
    unitName: unitName,
    url: url,
    ...(manager && { manager }),
    ...(reserve && { reserve }),
    ...(freeze && { freeze }),
    ...(clawback && { clawback }),
  });

  const assetId = BigInt(assetCreate.confirmation.assetIndex!);
  if (!assetId) throw new Error("Asset creation failed, no ID returned");

  console.log("✅ Asset created with ID:", assetId);
  return assetId;
}

export function createApplication(
  algorand: algokit.AlgorandClient,
  nftclient: NftMarketplaceContractClient,
  nftfactory: NftMarketplaceContractFactory,
  signer: TransactionSigner,
  sender: string,
  assetId: bigint,
  price: bigint,
  setAppId: (id: bigint) => void
): () => Promise<bigint> {
  return async () => {
    const result = await nftfactory.send.create.createMarketplaceApplication({
      args: [assetId, price],
      sender,
      assetReferences: [assetId],
    });

    const newClient = new NftMarketplaceContractClient({ appId: result.appClient.appId, algorand, defaultSigner: signer });

    const mbrpay = await algorand.createTransaction.payment({
      sender,
      receiver: result.appClient.appAddress,
      amount: algokit.algos(0.2),
      extraFee: algokit.algos(0.001),
    });

    await newClient.send.optInToAsset({ args: [mbrpay], sender, assetReferences: [assetId] });

    await algorand.send.assetTransfer({
      sender,
      assetId,
      receiver: result.appClient.appAddress,
      amount: BigInt(1),
    });

    const appId = BigInt(result.appClient.appId);
    setAppId(appId);

    return appId;
  };
}

export function setPrice(
  algorand: algokit.AlgorandClient,
  nftclient: NftMarketplaceContractClient,
  signer: TransactionSigner,
  sender: string,
  price: bigint
) {
  return async () => {
    try {
      const result = await nftclient.send.setPrice({ args: [price], sender: sender, signer });
      console.log("Nft price set to:", price, "\n result", result);
    } catch (err) {
      console.log(err);
    }
  };
}

export function buy(
  algorand: algokit.AlgorandClient,
  nftFactory: NftMarketplaceContractFactory,
  nftClient: NftMarketplaceContractClient,
  sender: string,
  appAddress: string,
  assetID: bigint,
  appId: bigint,
  price: bigint,
  signer: TransactionSigner
) {
  return async () => {
    try {
      const accountInfo = await algorand.asset.getAccountInformation(sender, assetID);
      if (accountInfo && accountInfo.balance > 0n) {
        alert("You already own this asset. You cannot purchase it again.");
        return;
      }
    } catch (error) {
      console.log("User does not own the asset. Proceeding with purchase...");
    }
    let seller = "";

    await algorand.client.algod
      .getApplicationByID(Number(appId))
      .do()
      .then((app) => {
        seller = String(app.params.creator);
      });
    const buyerTxn = await algorand.createTransaction.payment({
      sender,
      receiver: seller,
      amount: algokit.microAlgos(Number(price)),
      extraFee: algokit.microAlgos(1000),
    });
    console.log(buyerTxn);

    // Add a valid condition or remove the if statement if not needed
    try {
      await algorand.asset.getAccountInformation(sender, assetID);
    } catch (error) {
      console.error("Error fetching account information or opting in:", error);
      await algorand.send.assetOptIn({ sender: sender, assetId: assetID });
    }

    const result = await nftClient.send.buy({ args: [buyerTxn], sender: sender, assetReferences: [assetID] });
    console.log(result);
    const state = await nftClient.appClient.getGlobalState();
    const assetId = state.assetid.value as bigint;
    const info = await algorand.asset.getAccountInformation(appAddress, assetId);
    alert("Purchase successful!");
  };
}

export function deleteApp(
  algorand: algokit.AlgorandClient,
  nftFactory: NftMarketplaceContractFactory,
  nftClient: NftMarketplaceContractClient,
  assetID: bigint,
  sender: string,
  signer: TransactionSigner,
  setAppId: (id: bigint) => void
) {
  return async () => {
    await nftClient.send.delete.deleteApplication({ args: [], sender: sender, assetReferences: [assetID] });
    setAppId(BigInt(0));
  };
}
