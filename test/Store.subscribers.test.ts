import { createStore } from "../src/main";
import { Snapshot } from "../src/Snapshot";
import { Store } from "../src/Store";
import { StoreState } from "../src/StoreState";

describe(Store, () => {
  it("can be subscribed to", async () => {
    const store = createStore({
      initial: "initial",
    });

    const subscriber = jest.fn<void, [Snapshot<string>]>();

    store.subscribe(subscriber);

    const syncSetter = store.createSetter((x: string) => x);
    const asyncSetter = store.createSetter(async (x: string) => {
      return Promise.resolve(x).then((x) => x);
    });

    syncSetter("sync setted");

    const finish = asyncSetter("async setted");

    await finish;

    expect(subscriber).toHaveBeenCalledTimes(3);
    expect(subscriber).toHaveBeenNthCalledWith(1, {
      state: StoreState.hasValue,
      contents: "sync setted",
    });
    expect(subscriber).toHaveBeenNthCalledWith(2, {
      state: StoreState.loading,
    });
    expect(subscriber).toHaveBeenNthCalledWith(3, {
      state: StoreState.hasValue,
      contents: "async setted",
    });
  });

  it("can be unsubscribed from", async () => {
    const store = createStore({
      initial: "initial",
    });

    const subscriber = jest.fn<void, [Snapshot<string>]>();

    const unsubscribe = store.subscribe(subscriber);

    const syncSetter = store.createSetter((x: string) => x);
    const asyncSetter = store.createSetter(async (x: string) => {
      return Promise.resolve(x).then((x) => x);
    });

    syncSetter("sync setted");

    const finish = asyncSetter("async setted");

    unsubscribe();

    await finish;

    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenNthCalledWith(1, {
      state: StoreState.hasValue,
      contents: "sync setted",
    });
    expect(subscriber).toHaveBeenNthCalledWith(2, {
      state: StoreState.loading,
    });
  });
});