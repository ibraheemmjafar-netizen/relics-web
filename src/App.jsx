  async function mint() {
    const coins = await client.getCoins({
      owner: account.address,
      coinType: RELIC_TYPE,
    });

    const coin = coins.data
      .slice()
      .sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1))[0];

    if (!coin || BigInt(coin.balance) < 100_000_000_000n) {
      setStatus(
        `Need 100,000 $RELIC in one coin. Seen: ${
          coins.data.map((c) => c.balance).join(", ") || "none"
        }`
      );
      return;
    }

    const tx = new Transaction();

    const [fee] = tx.splitCoins(
      tx.object(coin.coinObjectId),
      [100_000_000_000n]
    );

    tx.moveCall({
      target: `${PKG}::relics::mint_genesis_with_token`,
      typeArguments: [RELIC_TYPE],
      arguments: [
        tx.object(CONFIG),
        tx.object(RECORD),
        fee,
        tx.pure.string("Genesis Relic"),
        tx.pure.string("Seal minted on Relics."),
        tx.pure.string(ART[1]),
        tx.pure.string(`Minted by ${account.address.slice(0, 6)}`),
      ],
    });

    await run(tx, "Minted");
  }