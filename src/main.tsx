import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
// The approved frontend is intentionally kept as JSX so its transaction logic
// remains identical to the supplied source.
// @ts-ignore -- the JSX entry is runtime-valid and is not part of the TS build.
import App from "./App.jsx";
import "@mysten/dapp-kit/dist/index.css";
import "./index.css";

const queryClient = new QueryClient();
const networks = {
  mainnet: { url: "https://sui-rpc.publicnode.com", network: "mainnet" },
} as const;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="mainnet">
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>
);