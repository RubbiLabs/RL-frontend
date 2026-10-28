/**
 * Lazy, client-only loader for Stellar Wallets Kit v2. The kit touches
 * `window` at import time, so it is only imported inside effects, never during
 * server rendering.
 */
import type { StellarWalletsKit as KitClass } from "@creit-tech/stellar-wallets-kit/sdk";
import type { KitEventType as KitEventTypeEnum, Networks as NetworksEnum } from "@creit-tech/stellar-wallets-kit/types";

export type Kit = typeof KitClass;

export interface LoadedKit {
  kit: Kit;
  KitEventType: typeof KitEventTypeEnum;
  Networks: typeof NetworksEnum;
}

let loading: Promise<LoadedKit> | null = null;
let initialisedFor: string | null = null;

export function loadWalletKit(): Promise<LoadedKit> {
  if (!loading) {
    loading = Promise.all([
      import("@creit-tech/stellar-wallets-kit/sdk"),
      import("@creit-tech/stellar-wallets-kit/types"),
    ]).then(([sdk, types]) => ({ kit: sdk.StellarWalletsKit, KitEventType: types.KitEventType, Networks: types.Networks }));
  }
  return loading;
}

/**
 * Initialises the kit once for the given network passphrase.
 *
 * Modules are listed explicitly instead of using the kit's `defaultModules()`:
 * that helper also loads `@metamask/connect-stellar`, which imports the kit
 * under its legacy npm scope (`@creit.tech/...`) and breaks the build when the
 * kit is installed from JSR (`@creit-tech/...`). Freighter comes first.
 */
export async function initWalletKit(networkPassphrase: string): Promise<LoadedKit> {
  const loaded = await loadWalletKit();
  if (initialisedFor === networkPassphrase) return loaded;

  const [{ FreighterModule }, { xBullModule }, { AlbedoModule }, { LobstrModule }, { RabetModule }, { HanaModule }] =
    await Promise.all([
      import("@creit-tech/stellar-wallets-kit/modules/freighter"),
      import("@creit-tech/stellar-wallets-kit/modules/xbull"),
      import("@creit-tech/stellar-wallets-kit/modules/albedo"),
      import("@creit-tech/stellar-wallets-kit/modules/lobstr"),
      import("@creit-tech/stellar-wallets-kit/modules/rabet"),
      import("@creit-tech/stellar-wallets-kit/modules/hana"),
    ]);
  const network = Object.values(loaded.Networks).find((value) => value === networkPassphrase);

  if (initialisedFor === null) {
    loaded.kit.init({
      modules: [
        new FreighterModule(),
        new xBullModule(),
        new AlbedoModule(),
        new LobstrModule(),
        new RabetModule(),
        new HanaModule(),
      ],
      network,
      authModal: { showInstallLabel: true },
    });
  } else if (network) {
    loaded.kit.setNetwork(network);
  }
  initialisedFor = networkPassphrase;
  return loaded;
}
