import { Store, StoreConfig } from "./Store";

export const createStore = <Value>(config: StoreConfig<Value>) => {
  return new Store(config);
};
