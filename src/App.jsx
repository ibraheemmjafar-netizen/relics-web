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
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Relics home">
          <span className="brand-mark">R</span>
          <span>
            <strong>RELICS</strong>
            <small>on Sui</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#story">The idea</a>
          <a href="#loop">How it works</a>
          <a href="#app">Your vault</a>
        </nav>
        <div className="header-actions">
          <span className="network-pill">
            <i /> {COIN.network}
          </span>
          <ConnectButton />
        </div>
      </header>

      <main>
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">A social collection on Sui</p>
            <h1>
              Mint a relic.
              <br />
              <em>Make it matter.</em>
            </h1>
            <p className="hero-lede">
              $RELIC is the ticket. A Relic is the thing you actually keep,
              send, and risk. Mint a clay seal, find someone willing to burn
              theirs, and leave a little history behind.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#app">
                Enter the loop <span>↘</span>
              </a>
              <a className="text-link" href="#story">
                Read the story <span>→</span>
              </a>
            </div>
            <div className="hero-notes">
              <span><b>3333</b> genesis objects</span>
              <span><b>3</b> clay stages</span>
              <span><b>1</b> mint per address</span>
            </div>
          </div>

          <div className="hero-art-wrap">
            <div className="hero-sticker sticker-top">GENESIS<br /><b>001 / 3333</b></div>
            <div className="hero-sticker sticker-bottom">CLAY<br /><b>IS ALIVE</b></div>
            <div className="hero-art">
              <div className="art-ring ring-one" />
              <div className="art-ring ring-two" />
              <img src={ART[1]} alt="Genesis Relic clay seal" />
              <span className="art-corner art-corner-top">01</span>
              <span className="art-corner art-corner-bottom">∞</span>
            </div>
            <p className="art-caption"><span /> Live on mainnet · art stored on Walrus</p>
          </div>
        </section>

        <section className="ticker-strip" aria-label="Relics facts">
          <div><span className="strip-icon">✳</span> THE SEAL IS THE MEME</div>
          <div><span className="strip-icon">✳</span> SEND IT TO SOMEONE</div>
          <div><span className="strip-icon">✳</span> BREAK IT TOGETHER</div>
          <div><span className="strip-icon">✳</span> THE SEAL IS THE MEME</div>
        </section>

        <section className="story-section section-pad" id="story">
          <div className="section-intro">
            <p className="eyebrow">Two pieces, one loop</p>
            <h2>The coin is the ticket.<br /><em>The Relic is the story.</em></h2>
            <p>
              Relics is a memecoin and a collection of owned objects that
              belong together. One gets you in. The other gives you something
              worth sending to a stranger, a friend, or the person who should
              have seen it coming.
            </p>
          </div>
          <div className="story-cards">
            <article className="story-card coin-card">
              <div className="card-topline"><span className="mini-icon">$</span><span>01 / THE TICKET</span></div>
              <h3>${COIN.ticker}</h3>
              <p>
                Hold enough $RELIC to pass the mint gate. After launch, it is
                the liquid side of the idea: tradeable, loud, and easy to find.
              </p>
              <div className="coin-meta"><span>SUPPLY GATE</span><strong>on-chain</strong></div>
            </article>
            <article className="story-card relic-card">
              <div className="card-topline"><span className="mini-icon">◆</span><span>02 / THE THING</span></div>
              <h3>Relic</h3>
              <p>
                An owned NFT-style object with a name, note, generation, serial,
                and a real clay picture stored on Walrus.
              </p>
              <div className="coin-meta"><span>GENESIS CAP</span><strong>3,333</strong></div>
            </article>
          </div>
        </section>

        <section className="loop-section section-pad" id="loop">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">The social loop</p>
              <h2>Don’t combine your own bags.</h2>
            </div>
            <p className="section-aside">
              Fuse is a request to another wallet. The other person decides
              whether the SUI — or the relationship — is worth their Relic.
            </p>
          </div>
          <div className="steps">
            <article className="step">
              <span className="step-number">01</span>
              <div className="step-symbol">◎</div>
              <h3>Mint a seal</h3>
              <p>Hold enough $RELIC, then mint one genesis Relic. One address, one mint. The cap is 3333.</p>
            </article>
            <article className="step step-highlight">
              <span className="step-number">02</span>
              <div className="step-symbol">↗</div>
              <h3>Make an offer</h3>
              <p>Choose your Relic, pick a wallet, and attach SUI. Your Relic locks inside the deal until they decide.</p>
            </article>
            <article className="step">
              <span className="step-number">03</span>
              <div className="step-symbol">✦</div>
              <h3>Fuse the history</h3>
              <p>Accept burns both Relics. A new one goes to the requester. The SUI goes to the person who accepted.</p>
            </article>
          </div>
        </section>

        <section className="generations-section section-pad">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">The clay gets more broken</p>
              <h2>Three stages.<br /><em>One shared myth.</em></h2>
            </div>
            <p className="section-aside">
              There are not 3333 different drawings. There are 3333 genesis
              objects moving through three increasingly crowded stages.
            </p>
          </div>
          <div className="generation-grid">
            <article className="generation-card">
              <div className="generation-image"><img src={ART[1]} alt="Generation one seal" /></div>
              <div className="generation-info"><span>GEN 01</span><h3>The seal</h3><p>One stamp in fresh clay.</p></div>
            </article>
            <article className="generation-card generation-card-featured">
              <div className="generation-image"><img src={ART[2]} alt="Generation two cracked tablet" /></div>
              <div className="generation-info"><span>GEN 02</span><h3>The fracture</h3><p>The tablet carries a new burn.</p></div>
            </article>
            <article className="generation-card">
              <div className="generation-image"><img src={ART[3]} alt="Generation three tablets" /></div>
              <div className="generation-info"><span>GEN 03</span><h3>The crowd</h3><p>Several histories in one object.</p></div>
            </article>
          </div>
          <p className="generation-footnote">Gen 3 cannot fuse again. Names and notes concatenate, so the object remembers what was burned into it.</p>
        </section>

        <section className="manifesto section-pad">
          <div className="manifesto-mark">R<span>°</span></div>
          <div>
            <p className="eyebrow">No roadmap cosplay</p>
            <h2>It is not a game.<br /><em>It is a reason to send.</em></h2>
            <p>
              Relics are not XP, not a stake-and-forget vault, and not a
              promise of returns. The point is simple: mint one, send one,
              fuse one, and see what survives the social pressure.
            </p>
          </div>
          <div className="manifesto-list">
            <div><span>→</span><strong>Owned objects</strong><small>Keep it in your wallet</small></div>
            <div><span>→</span><strong>Real clay art</strong><small>Stored on Walrus</small></div>
            <div><span>→</span><strong>Short history</strong><small>Names and notes persist</small></div>
          </div>
        </section>

        <section className="coin-section section-pad">
          <div>
            <p className="eyebrow">Get in early</p>
            <h2>Find the signal.<br /><em>Bring your wallet.</em></h2>
            <p>
              The mainnet art is already here. The coin address and buy route
              will appear when they are live. Until then, keep the story close.
            </p>
          </div>
          <div className="coin-terminal">
            <div className="terminal-header"><span className="terminal-dot" /><span>$RELIC / MAINNET</span><span className="terminal-live">● SOON</span></div>
            <div className="terminal-body">
              <span className="terminal-label">CONTRACT ADDRESS</span>
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
                {COIN.telegram ? <a href={COIN.telegram} target="_blank" rel="noreferrer">Telegram ↗</a> : null}
                {COIN.twitter ? <a href={COIN.twitter} target="_blank" rel="noreferrer">X / @SuiRelics ↗</a> : null}
                {COIN.buyUrl ? <a href={COIN.buyUrl} target="_blank" rel="noreferrer">Buy $RELIC ↗</a> : null}
              </div>
            </div>
          </div>
        </section>

        <section className="app-section section-pad" id="app">
          <div className="app-heading">
            <div>
              <p className="eyebrow">Your corner of the loop</p>
              <h2>Wallet actions,<br /><em>no theatre.</em></h2>
            </div>
            <div className="account-state">
              <span className={`state-dot ${account ? "is-connected" : ""}`} />
              {account ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}` : "Connect a wallet to begin"}
            </div>
          </div>

          <div className="app-grid">
            <section className="app-panel mint-panel">
              <div className="panel-kicker"><span>01</span><span>MINT GATE</span></div>
              <h3>Claim your genesis.</h3>
              <p>One address can mint one Relic when it holds enough $RELIC. The fee goes to the project treasury.</p>
              <div className="mint-preview">
                <img src={ART[1]} alt="Genesis Relic preview" />
                <div><span>YOU RECEIVE</span><strong>GEN 01 / SEAL</strong><small>3333 total genesis objects</small></div>
              </div>
              <button className="button button-primary wide-button" type="button" disabled={!account} onClick={() => mint().catch((e) => setStatus(e.message))}>
                {account ? "Mint a Relic" : "Connect wallet to mint"} <span>↗</span>
              </button>
            </section>

            <section className="app-panel offer-panel">
              <div className="panel-kicker"><span>02</span><span>MAKE A FUSE OFFER</span></div>
              <h3>Send the pressure.</h3>
              <p>Your Relic and SUI enter a deal object. They choose whether their Relic is worth more than the offer.</p>
              <label>Relic you send</label>
              <select value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                {relics.map((r) => <option key={r.id} value={r.id}>#{r.serial} {r.name} · gen {r.gen}</option>)}
              </select>
              <label>Their wallet</label>
              <input placeholder="0x…" value={toAddr} onChange={(e) => setToAddr(e.target.value)} />
              <label>SUI you pay them</label>
              <div className="input-suffix"><input value={offerSui} onChange={(e) => setOfferSui(e.target.value)} /><span>SUI</span></div>
              <p className="field-hint">0.1 means 0.1 SUI, not 100.</p>
              <button className="button button-dark wide-button" type="button" onClick={() => requestDeal().catch((e) => setStatus(e.message))}>
                Send Relic + SUI <span>↗</span>
              </button>
            </section>
          </div>

          <section className="wallet-section">
            <div className="wallet-section-heading">
              <div><p className="eyebrow">Connected objects</p><h3>My Relics <span>{relics.length}</span></h3></div>
              <p>Every object keeps its name, note, generation, and serial.</p>
            </div>
            {relics.length === 0 ? (
              <div className="empty-state"><span>◇</span><p>{account ? "No Relics in this wallet yet." : "Connect a wallet to see your Relics."}</p></div>
            ) : (
              <div className="relic-grid">
                {relics.map((r) => (
                  <article key={r.id} className="owned-card">
                    <div className="owned-image">{r.image ? <img src={r.image} alt={r.name} /> : <span>No art yet</span>}<span className="owned-gen">GEN {r.gen}</span></div>
                    <div className="owned-copy"><span>#{r.serial}</span><h4>{r.name}</h4><p>{r.note || "A seal with no note yet."}</p></div>
                    <button className="small-button" type="button" onClick={() => stamp(r).catch((e) => setStatus(e.message))}>Stamp gen art ↗</button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="wallet-section incoming-section">
            <div className="wallet-section-heading">
              <div><p className="eyebrow">Requests for you</p><h3>Incoming fuses <span>{deals.length}</span></h3></div>
              <p>Accept for SUI. Reject to return their Relic and payment.</p>
            </div>
            {deals.length === 0 ? (
              <div className="empty-state compact"><span>↗</span><p>Nobody has asked you to fuse yet.</p></div>
            ) : (
              <div className="deal-controls">
                <div className="deal-summary"><span>REQUEST</span><strong>Someone wants to break the seal</strong><small>Accept burns both and sends the new Relic to them.</small></div>
                <label>Request<select value={dealId} onChange={(e) => setDealId(e.target.value)}>{deals.map((d) => <option key={d.id} value={d.id}>From {String(d.from).slice(0, 10)}… · {(Number(d.pay) / 1e9).toFixed(3)} SUI</option>)}</select></label>
                <label>Your Relic to burn<select value={mineId} onChange={(e) => setMineId(e.target.value)}>{relics.map((r) => <option key={r.id} value={r.id}>#{r.serial} {r.name} · gen {r.gen}</option>)}</select></label>
                <div className="deal-actions">
                  <button className="button button-primary" type="button" onClick={() => acceptDeal().catch((e) => setStatus(e.message))}>Accept · take SUI</button>
                  <button className="button button-outline" type="button" onClick={() => rejectDeal().catch((e) => setStatus(e.message))}>Reject · return it</button>
                </div>
              </div>
            )}
          </section>

          {status ? <div className="status-bar"><span className="status-pulse" />{status}</div> : null}
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand"><span className="brand-mark">R</span><strong>RELICS</strong></div>
        <p>Mint a seal. Send it. Fuse it. <span>Not financial advice.</span></p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  );
}