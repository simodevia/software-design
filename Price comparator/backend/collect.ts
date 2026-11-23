import { collect } from "./collector.ts";
import { closeNetwork, configureNetwork } from "./network.ts";
configureNetwork();
try {
  const state = await collect();
  console.log(
    JSON.stringify(
      {
        lastRun: state.lastRun,
        totalObservations: state.observations.length,
        stores: state.stores.map(({ id, status }) => ({ id, status })),
      },
      null,
      2,
    ),
  );
} finally {
  closeNetwork();
}
