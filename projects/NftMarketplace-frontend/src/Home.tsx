// src/components/Home.tsx
import * as algokit from "@algorandfoundation/algokit-utils";
import { useWallet } from "@txnlab/use-wallet-react";
import React, { useEffect, useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import MethodCall from "./components/MethodCall";
import * as methods from "./methods";
import { getAlgodConfigFromViteEnvironment } from "./utils/network/getAlgoClientConfigs";
import NFTForm from "./components/NFTForm";
import algosdk from "algosdk";
import "./styles/Home.css";
import { NftMarketplaceContractClient, NftMarketplaceContractFactory } from "./contracts/NFTMarketplaceContract";

const Home: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false);
  const { activeAccount, activeAddress, transactionSigner: TransactionSigner } = useWallet();

  const toggleWalletModal = () => setOpenWalletModal(!openWalletModal);

  const [inputAppId, setInputAppId] = useState("");
  const [inputAssetId, setInputAssetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [appId, setAppId] = useState<bigint>(BigInt(0));
  const [assetId, setAssetId] = useState<bigint>(0n);
  const [price, setPrice] = useState<bigint>(0n);
  const [newPrice, setnewPrice] = useState<bigint>(0n);
  const [assetname, setassetname] = useState<string>("");
  const [manager, setmanger] = useState<string>("");
  const [freeze, setfreeze] = useState<string>("");
  const [reserve, setreserve] = useState<string>("");
  const [clawback, setclawback] = useState<string>("");
  const [unitname, setunitname] = useState<string>("");
  const [ipfsCID, setIpfsCID] = useState<string>("");

  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algorand = algokit.AlgorandClient.fromConfig({ algodConfig });
  algorand.setDefaultSigner(TransactionSigner);

  const nftFactory = new NftMarketplaceContractFactory({
    algorand: algorand,
    defaultSender: activeAccount?.address,
    defaultSigner: TransactionSigner,
  });

  const nftClient = new NftMarketplaceContractClient({
    appId: BigInt(appId),
    algorand: algorand,
    defaultSigner: TransactionSigner,
  });

  useEffect(() => {
    if (TransactionSigner) algorand.setDefaultSigner(TransactionSigner);
  }, [TransactionSigner]);

  return (
    <div className="home-container">
      <div className="form-card">
        <h1>
          Welcome to <span className="bold">AlgoKit 🙂</span>
        </h1>
        <p className="subtitle">Sell your asset at your fingertips</p>

        <button className="wallet-btn" onClick={toggleWalletModal}>
          Wallet Connection
        </button>

        <label>Asset Name</label>
        <input type="text" value={assetname} onChange={(e) => setassetname(e.currentTarget.value || "")} />
        <label>Unit Name</label>
        <input type="text" value={unitname} onChange={(e) => setunitname(e.currentTarget.value || "")} />
        <label>Manager Wallet Address</label>
        <input type="text" value={manager} onChange={(e) => setmanger(e.currentTarget.value || "")} />
        <label>Freeze Wallet Address</label>
        <input type="text" value={freeze} onChange={(e) => setfreeze(e.currentTarget.value || "")} />
        <label>Reserve wallet Address</label>
        <input type="text" value={reserve} onChange={(e) => setreserve(e.currentTarget.value || "")} />
        <label>Clawback Wallet Address</label>
        <input type="text" value={clawback} onChange={(e) => setclawback(e.currentTarget.value || "")} />
        <h2>Upload NFT Metadata</h2>
        <NFTForm onUploadComplete={(cid) => setIpfsCID(cid)} />

        <MethodCall
          methodFunction={async () => {
            if (!ipfsCID) {
              alert("Upload metadata to IPFS first.");
              return;
            }

            const assetUrl = `https://ipfs.io/ipfs/${ipfsCID}#arc3`;
            const newAssetId = await methods.create(
              algorand,
              activeAddress!,
              assetname,
              assetUrl,
              unitname,
              manager,
              reserve,
              freeze,
              clawback
            );
            setAssetId(newAssetId);
          }}
          text="Create Asset"
        />
        {assetId !== 0n && (
          <div className="asset-id-display">
            <p>
              <strong>Asset ID:</strong> {assetId.toString()}
            </p>
          </div>
        )}

        <label>
          Price:
          <input
  type="number"
  value={price.toString()}
  onChange={(e) => setPrice(BigInt(e.target.value || "0"))}
  className="border p-1 rounded"
/>
        </label>

        <MethodCall
          methodFunction={async () => {
            if (assetId === 0n) {
              alert("Create the Asset First !!!");
            }

            const createApp = methods.createApplication(
              algorand,
              nftClient,
              nftFactory,
              TransactionSigner,
              activeAddress!,
              assetId,
              price,
              setAppId
            );

            const newAppId = await createApp();
            setAppId(newAppId);
          }}
          text="Create App"
        />
        <label>
          Price:
          <input type="text" value={Number(newPrice)} onChange={(e) => setInputAppId(e.target.value)} className="border p-1 rounded" />
        </label>

        <MethodCall
          methodFunction={async () => {
            if (assetId === 0n) {
              alert("Create the Asset First !!!");
            }

            const setprice = methods.setPrice(algorand, nftClient, TransactionSigner, activeAddress!, price);

            const newAppId = await setprice();
          }}
          text="Set The price"
        />
        {appId !== 0n && (
          <div className="asset-id-display">
            <p>
              <strong>Application ID:</strong> {appId.toString()}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label>
            App ID:
            <input type="text" value={inputAppId} onChange={(e) => setInputAppId(e.target.value)} className="border p-1 rounded" />
          </label>

          <label>
            Asset ID:
            <input type="text" value={inputAssetId} onChange={(e) => setInputAssetId(e.target.value)} className="border p-1 rounded" />
          </label>
        </div>

        <MethodCall
          methodFunction={async () => {
            setLoading(true);
            try {
              if (!activeAccount) throw new Error("Please connect wallet first");
              if (!inputAppId) throw new Error("App ID is required");
              const appId = BigInt(inputAppId);
              const assetId = BigInt(inputAssetId);
              const appAddress = algosdk.getApplicationAddress(appId);

              const nftClient = new NftMarketplaceContractClient({
                appId: BigInt(appId),
                algorand: algorand,
                defaultSigner: TransactionSigner,
              });

              const transfer = methods.buy(
                algorand,
                nftFactory,
                nftClient,
                activeAddress!,
                String(appAddress),
                assetId,
                appId,
                price,
                TransactionSigner
              );

              await transfer();
              alert(`Asset ${assetId} transferred to ${activeAddress}`);
            } catch (err) {
              console.error(err);
              alert("Transfer failed. See console for details.");
            } finally {
              setLoading(false);
            }
          }}
          text={loading ? "Transferring..." : "BUY"}
        />
        <MethodCall
          text="Delete App"
          methodFunction={async () => {
            const fn = methods.deleteApp(algorand, nftFactory, nftClient, assetId, activeAddress!, TransactionSigner, setAppId);
            await fn(); // 👈 Call the returned async function
          }}
        />

        <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      </div>
    </div>
  );
};

export default Home;
