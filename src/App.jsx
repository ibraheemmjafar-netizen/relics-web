import { useEffect, useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  ART,
  COIN,
  CONFIG,
  PKG,
  RECORD,
  RELIC_TYPE,
  TOKEN_CONFIG,
} from "./ids";

function cleanAddr(raw) {
  let addr = raw.trim().toLowerCase();
  if (!addr.startsWith("0x")) addr = "0x" + addr;
  addr = "0x" + addr.slice(2).replace(/[^0-9a-f]/g, "").slice(0, 64);
  return addr.length === 66 ? addr : "";
}

export default function App() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [status, setStatus] = useState("");
  const [relics, setRelics] = useState([]);
  const [deals, setDeals] = useState([]);
  const [toAddr, setToAddr] = useState("");
  const [offerId, setOfferId] = useState("");
  const [mineId, setMineId] = useState("");
  const [dealId, setDealId] = useState("");
  const [offerSui, setOfferSui] = useState("0.1");

  async function load() {
    if (!account) {
      setRelics([]);
      setDeals([]);
      return;
    }
    const owned = await client.getOwnedObjects({
      owner: account.address,
      options: { showContent: true, showType: true },
    });
    const rs = [];
    const ds = [];
    for (const o of owned.data) {
      const type = o.data?.type || "";
      const f = o.data?.content?.fields;
      if (type.includes("::relics::Relic") && f) {
        rs.push({
          id: o.data.objectId,
          name: f.name,
          note: f.note,
          image: f.image_url,
          gen: Number(f.generation),
          serial: f.serial,
        });
      }
      if (type.includes("::relics::MergeDeal") && f) {
        ds.push({
          id: o.data.objectId,
          from: f.from,
          pay: f.payment?.fields?.balance ?? "0",
        });
      }
    }
    setRelics(rs);
    setDeals(ds);
    if (rs[0]) {
      setOfferId((id) => id || rs[0].id);
      setMineId((id) => id || rs[0].id);
    }
    if (ds[0]) setDealId((id) => id || ds[0].id);
  }

  useEffect(() => {
    load().catch((e) => setStatus(e.message || String(e)));
  }, [account?.address]);

  async function run(tx, ok) {
    setStatus("Approve in wallet…");
    const res = await signAndExecute({ transaction: tx });
    setStatus(`${ok} ${res.digest}`);
    await load();
  }

  async function mint() {
  const coins = await client.getCoins({
    owner: account.address,
    coinType: RELIC_TYPE,
  });
  const list = coins.data.map((c) => c.balance).join(", ") || "none";
  setStatus(`On-chain RELIC units: ${list}`);
  const coin = coins.data
    .slice()
    .sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1))[0];
  if (!coin || BigInt(coin.balance) === 0n) {
    setStatus(`No RELIC coin object. Seen: ${list}`);
    return;
  }
  const tx = new Transaction();
  tx.moveCall({
    target: `${PKG}::relics::mint_genesis_with_token`,
    arguments: [
      tx.object(CONFIG),
      tx.object(RECORD),
      tx.object(TOKEN_CONFIG),
      tx.object(coin.coinObjectId),
      tx.pure.string("Genesis Relic"),
      tx.pure.string("Seal minted on Relics."),
      tx.pure.string(ART[1]),
      tx.pure.string(`Minted by ${account.address.slice(0, 6)}`),
    ],
  });
  await run(tx, "Minted");
}
  async function requestDeal() {
    const addr = cleanAddr(toAddr);
    if (!addr) return setStatus("Need 0x + 64 hex chars.");
    if (!offerId) return setStatus("Pick a Relic.");
    const mist = BigInt(Math.floor(Number(offerSui) * 1e9));
    const tx = new Transaction();
    const [pay] = tx.splitCoins(tx.gas, [mist]);
    tx.moveCall({
      target: `${PKG}::relics::request_deal`,
      arguments: [tx.object(offerId), pay, tx.pure.address(addr)],
    });
    await run(tx, "Deal sent");
  }

  async function acceptDeal() {
    if (!dealId || !mineId) return setStatus("Pick deal + your Relic.");
    const tx = new Transaction();
    tx.moveCall({
      target: `${PKG}::relics::accept_deal`,
      arguments: [tx.object(CONFIG), tx.object(dealId), tx.object(mineId)],
    });
    await run(tx, "Accepted. Fusion to requester. SUI to you.");
  }

  async function rejectDeal() {
    if (!dealId) return setStatus("Pick a deal.");
    const tx = new Transaction();
    tx.moveCall({
      target: `${PKG}::relics::reject_deal`,
      arguments: [tx.object(dealId)],
    });
    await run(tx, "Rejected. Relic + SUI returned.");
  }

  async function stamp(r) {
    const url = ART[r.gen] || ART[1];
    const tx = new Transaction();
    tx.moveCall({
      target: `${PKG}::relics::set_media`,
      arguments: [
        tx.object(r.id),
        tx.pure.string(url),
        tx.pure.string(r.note || `Gen ${r.gen}`),
      ],
    });
    await run(tx, "Art stamped");
  }

  return (
    <div className="page">
      <header>
        <div>
          <p className="tag">{COIN.network}</p>
          <h1>RELICS</h1>
        </div>
        <ConnectButton />
      </header>

      <section className="hero">
        <img src={ART[1]} alt="Genesis Relic" />
        <div>
          <h2>Mint a seal. Send it. Fuse it.</h2>
        </div>
      </section>

      <section>
        <h2>Coin</h2>
        <p className="ticker">${COIN.ticker}</p>
        <div className="ca-box">
          <span>{COIN.ca}</span>
          <button
            type="button"
            disabled={!COIN.ca}
            onClick={() => navigator.clipboard.writeText(COIN.ca)}
          >
            Copy CA
          </button>
        </div>
        <div className="social-links" aria-label="Social links">
          {COIN.telegram ? (
            <a href={COIN.telegram} target="_blank" rel="noreferrer">
              Telegram
            </a>
          ) : null}
          {COIN.twitter ? (
            <a href={COIN.twitter} target="_blank" rel="noreferrer">
              X · @SuiRelics
            </a>
          ) : null}
        </div>
      </section>

      <section>
        <h2>Mint</h2>
        <button
          type="button"
          disabled={!account}
          onClick={() => mint().catch((e) => setStatus(e.message))}
        >
          Mint Relic
        </button>
      </section>

      <section>
        <h2>My Relics</h2>
        <div className="grid">
          {relics.map((r) => (
            <article key={r.id} className="card">
              {r.image ? <img src={r.image} alt={r.name} /> : <p className="tiny">No art yet</p>}
              <p>{r.name}</p>
              <p className="tiny">
                #{r.serial} · gen {r.gen}
              </p>
              <button
                type="button"
                onClick={() => stamp(r).catch((e) => setStatus(e.message))}
              >
                Stamp gen art
              </button>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Ask someone to fuse</h2>
        <p className="tiny">
          You send <b>your Relic</b> and some <b>SUI</b>. If they accept:{" "}
          <b>you get the new Relic</b>, they keep the SUI. If they reject: Relic
          and SUI come back.
        </p>
        <label className="tiny">Relic you send</label>
        <select value={offerId} onChange={(e) => setOfferId(e.target.value)}>
          {relics.map((r) => (
            <option key={r.id} value={r.id}>
              #{r.serial} {r.name} (gen {r.gen})
            </option>
          ))}
        </select>
        <label className="tiny">Their wallet</label>
        <input
          placeholder="0x…"
          value={toAddr}
          onChange={(e) => setToAddr(e.target.value)}
          style={{ width: "100%", margin: "8px 0", padding: 8 }}
        />
        <label className="tiny">SUI you pay them</label>
        <input
          value={offerSui}
          onChange={(e) => setOfferSui(e.target.value)}
          style={{ width: "100%", margin: "8px 0", padding: 8 }}
        />
        <p className="tiny">Example: 0.1 means 0.1 SUI, not 100.</p>
        <button
          type="button"
          onClick={() => requestDeal().catch((e) => setStatus(e.message))}
        >
          Send Relic + SUI
        </button>
      </section>

      <section>
        <h2>Fuse requests for you</h2>
        {deals.length === 0 ? (
          <p className="tiny">Nobody has asked you to fuse yet.</p>
        ) : (
          <>
            <p className="tiny">
              Accept = they get the new Relic. You get the SUI. Your selected
              Relic is burned into theirs.
            </p>
            <label className="tiny">Request</label>
            <select value={dealId} onChange={(e) => setDealId(e.target.value)}>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  From {String(d.from).slice(0, 10)}… pays{" "}
                  {(Number(d.pay) / 1e9).toFixed(3)} SUI
                </option>
              ))}
            </select>
            <label className="tiny">Your Relic that will be burned</label>
            <select value={mineId} onChange={(e) => setMineId(e.target.value)}>
              {relics.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.serial} {r.name} (gen {r.gen})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => acceptDeal().catch((e) => setStatus(e.message))}
            >
              Accept — take SUI, burn this Relic
            </button>
            <button
              type="button"
              onClick={() => rejectDeal().catch((e) => setStatus(e.message))}
            >
              Reject — send their Relic + SUI back
            </button>
          </>
        )}
      </section>

      {status ? <p className="tiny">{status}</p> : null}
    </div>
  );
}