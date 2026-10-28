import { rpc } from "@stellar/stellar-sdk";

const servers = new Map<string, rpc.Server>();

/** One `rpc.Server` per RPC URL (the SDK client is stateless and reusable). */
export function rpcServer(rpcUrl: string): rpc.Server {
  let server = servers.get(rpcUrl);
  if (!server) {
    server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
    servers.set(rpcUrl, server);
  }
  return server;
}
