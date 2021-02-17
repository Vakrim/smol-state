import { Canceled } from "../src/Canceled";
import { createStore } from "../src/createStore";
import { Store } from "../src/Store";
import { LoadableState } from "../src/LoadableState";

describe(Store, () => {
  it("stores initial value", () => {
    const store = createStore({ initial: 0 });

    expect(store.getLoadable().getValue()).toBe(0);
  });

  it("creates setters", () => {
    const store = createStore({ initial: 0 });
    const setToThree = store.createSetter(() => 3);
    const setTo = store.createSetter((n: number) => n);

    expect(store.getLoadable().getValue()).toBe(0);

    setToThree();
    expect(store.getLoadable().getValue()).toBe(3);

    setTo(12);
    expect(store.getLoadable().getValue()).toBe(12);
  });

  it("creates updaters", () => {
    const store = createStore({ initial: 0 });
    const increase = store.createUpdater((c) => c + 1);
    const increaseBy = store.createUpdater((c: number, n: number) => c + n);

    expect(store.getLoadable().getValue()).toBe(0);

    increase();
    expect(store.getLoadable().getValue()).toBe(1);

    increaseBy(12);
    expect(store.getLoadable().getValue()).toBe(13);
  });

  it("handles async values that resolves", async () => {
    const store = createStore({ initial: 0 });

    const { asyncSetter, resolve } = createAsyncSetter<number>(store);

    const asyncSetterFinished = asyncSetter();

    expect(store.getLoadable().state).toBe(LoadableState.loading);
    expect(() => store.getLoadable().getValue()).toThrowError(Promise);
    expect(store.getLoadable().valueMaybe()).toBe(undefined);
    expect(store.getLoadable().errorMaybe()).toBe(undefined);

    const storeChanged = store.getLoadable().toPromise();

    resolve(5);
    await asyncSetterFinished;

    expect(store.getLoadable().state).toBe(LoadableState.hasValue);
    expect(store.getLoadable().getValue()).toBe(5);
    expect(store.getLoadable().valueMaybe()).toBe(5);
    expect(store.getLoadable().errorMaybe()).toBe(undefined);
    expect(storeChanged).toBe(asyncSetterFinished);
    await expect(storeChanged).resolves.toBe(5);
  });

  it("handles async values that rejects", async () => {
    const store = createStore({ initial: 0 });

    const { asyncSetter, reject } = createAsyncSetter<number>(store);

    const asyncSetterFinished = asyncSetter();

    expect(store.getLoadable().state).toBe(LoadableState.loading);
    expect(() => store.getLoadable().getValue()).toThrowError(Promise);
    expect(store.getLoadable().valueMaybe()).toBe(undefined);
    expect(store.getLoadable().errorMaybe()).toBe(undefined);

    const storeChanged = store.getLoadable().toPromise();

    reject("whoops");
    try {
      await asyncSetterFinished;
    } catch (error) {}

    expect(store.getLoadable().state).toBe(LoadableState.hasError);
    expect(() => store.getLoadable().getValue()).toThrowError("whoops");
    expect(store.getLoadable().valueMaybe()).toBe(undefined);
    expect(store.getLoadable().errorMaybe()).toBe("whoops");
    expect(storeChanged).toBe(asyncSetterFinished);
    await expect(storeChanged).rejects.toBe("whoops");
  });

  it("handles async race by canceling previous update", async () => {
    const store = createStore({ initial: "initial" });

    const {
      asyncSetter: asyncSetterToBeCanceled,
      resolve: resolveToBeCanceled,
    } = createAsyncSetter<string>(store);

    const {
      asyncSetter: asyncSetterOverrides,
      resolve: resolveOverrides,
    } = createAsyncSetter<string>(store);

    expect(store.getLoadable().state).toBe(LoadableState.hasValue);

    const toBeCanceledFinished = asyncSetterToBeCanceled();

    expect(store.getLoadable().state).toBe(LoadableState.loading);

    const overridesFinished = asyncSetterOverrides();

    expect(store.getLoadable().state).toBe(LoadableState.loading);

    resolveOverrides("override");
    resolveToBeCanceled("toBeCanceled");

    await store.getLoadable().toPromise();

    expect(store.getLoadable().state).toBe(LoadableState.hasValue);
    expect(store.getLoadable().getValue()).toBe("override");

    await expect(toBeCanceledFinished).rejects.toBeInstanceOf(Canceled);
    await expect(toBeCanceledFinished).rejects.toThrowError(
      "Contents update cancled"
    );

    await expect(overridesFinished).resolves.toBe("override");
  });
});

const createAsyncSetter = <T, R = any>(store: Store<T>) => {
  let originResolve: (value: T) => void;
  let originReject: (reason: R) => void;

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
    reject: (reason: R) => {
      originReject(reason);
    },
  };
};
