export const NETWORK = "mainnet";
export const DEPLOYER =
  "0x15c87c2c26478e5e7da775cc515529bdb393050c28889e25363a71882759ff9f";

export const PKG =
  "0x8e08915671e2617f76f3b93945056b87e0a23086e9b065f64b522f2502aee46b";
export const CONFIG =
  "0x8f6765bde7c3599bc75e67ea3e0cba7ad7e15c68c9c970c2ccb4efb0229ab1ea";
export const RECORD =
  "0xc829e0b6c25602702ec96cf0039e302b2e37664b7aee3863f2d741e0c5677f9c";

// Mainnet no longer uses the testnet relic_token::TokenConfig object.
// Mint fee/configuration is stored on CONFIG.
export const TOKEN_CONFIG = "";
export const RELIC_TYPE =
  "0x5fe73610a1d744a17ecc899ab808affbfd13abbf64a496d8472048246a13776a::suipump::SUIPUMP";
export const RELIC_NFT = `${PKG}::relics::Relic`;
export const MERGE_DEAL = `${PKG}::relics::MergeDeal`;
export const MERGE_REQUEST = `${PKG}::relics::MergeRequest`;

export const ADMIN_CAP =
  "0x9ff0a65d88b1268f3d8951430ff880425ce419e48fc48bd24648adec25818ceb";
export const UPGRADE_CAP =
  "0xf833e9c8ba57dc991d7cc36638a15754073dc9e8d2f3c8923bb8780150521e87";

export const ART = {
  1: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/by-object-id/0xb497c56ada9b1db879144b02c4923c760e92a1a87e40deb4a62b3940872a5bff",
  2: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/by-object-id/0x44e1460c8b8a05927205903c441a62b4c68ee8ee8d2ff9289314eaf499a540b2",
  3: "https://aggregator.walrus-mainnet.walrus.space/v1/blobs/by-object-id/0x0a0772b54f02f4ada6e85a9d8534fb13c38727a23d2c2b1d9659f84e7b009beb",
};

export const COIN = {
  name: "RELIC",
  ticker: "RELIC",
  network: "Sui mainnet",
  ca: "0x5fe73610a1d744a17ecc899ab808affbfd13abbf64a496d8472048246a13776a::suipump::SUIPUMP",
  buyUrl:
    "https://suipump.org/token/0x7a179bd8fc178cd7c16ff6aaedfcee3007ba7fbb0a6f99395dd15ab84ca3236e",
  chartUrl:
    "https://suipump.org/token/0x7a179bd8fc178cd7c16ff6aaedfcee3007ba7fbb0a6f99395dd15ab84ca3236e",
  twitter: "https://x.com/SuiRelics",
  telegram: "https://t.me/+KASY4M196qU5OWU0",
};