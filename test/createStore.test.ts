import { createStore, StoreState } from "../src/createStore";

describe(createStore, () => {
  it("stores initial value", () => {
    const store = createStore({ initial: 0 });

    expect(store.getValue()).toBe(0);
  });

  it("creates setters", () => {
    const store = createStore({ initial: 0 });
    const setToThree = store.createSetter(() => 3);
    const setTo = store.createSetter((n: number) => n);

    expect(store.getValue()).toBe(0);

    setToThree();
    expect(store.getValue()).toBe(3);

    setTo(12);
    expect(store.getValue()).toBe(12);
  });

  it("creates updaters", () => {
    const store = createStore({ initial: 0 });
    const increase = store.createUpdater((c) => c + 1);
    const increaseBy = store.createUpdater((c: number, n: number) => c + n);

    expect(store.getValue()).toBe(0);

    increase();
    expect(store.getValue()).toBe(1);

    increaseBy(12);
    expect(store.getValue()).toBe(13);
  });

  it("handles async values that resolves", async () => {
    const store = createStore({ initial: 0 });

    const { asyncSetter, resolve } = createAsyncSetter<number>(store);

    const asyncSetterFinished = asyncSetter();

    expect(store.getState()).toBe(StoreState.loading);
    expect(() => store.getValue()).toThrowError(Promise);
    expect(store.valueMaybe()).toBe(undefined);
    expect(store.errorMaybe()).toBe(undefined);

    const storeChanged = store.toPromise();

    resolve(5);
    await asyncSetterFinished;

    expect(store.getState()).toBe(StoreState.hasValue);
    expect(store.getValue()).toBe(5);
    expect(store.valueMaybe()).toBe(5);
    expect(store.errorMaybe()).toBe(undefined);
    await expect(storeChanged).resolves.toBe(5);
  });

  it("handles async values that rejects", () => {});

  it("handles async race", () => {});
});

const createAsyncSetter = <T>(store: any /* TODO Store */) => {
  let originResolve: (value: T) => void;
  let originReject: (reason: T) => void;

  const asyncSetter = store.createSetter(async () => {
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
      originResolve = resolvePromise;
      originReject = rejectPromise;
    });

    return promise;
  });

  return {
    asyncSetter,
    resolve: (value: T) => {
      originResolve(value);
    },
    reject: (reason: T) => {
      originReject(reason);
    },
  };
};
