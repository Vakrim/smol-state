import { Canceled } from "../src/Canceled";
import { createStore } from "../src/createStore";
import { Store } from "../src/Store";
import { StoreState } from "../src/StoreState";

describe(Store, () => {
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
    expect(storeChanged).toBe(asyncSetterFinished);
    await expect(storeChanged).resolves.toBe(5);
  });

  it("handles async values that rejects", async () => {
    const store = createStore({ initial: 0 });

    const { asyncSetter, reject } = createAsyncSetter<number>(store);

    const asyncSetterFinished = asyncSetter();

    expect(store.getState()).toBe(StoreState.loading);
    expect(() => store.getValue()).toThrowError(Promise);
    expect(store.valueMaybe()).toBe(undefined);
    expect(store.errorMaybe()).toBe(undefined);

    const storeChanged = store.toPromise();

    reject("whoops");
    try {
      await asyncSetterFinished;
    } catch (error) {}

    expect(store.getState()).toBe(StoreState.hasError);
    expect(() => store.getValue()).toThrowError("whoops");
    expect(store.valueMaybe()).toBe(undefined);
    expect(store.errorMaybe()).toBe("whoops");
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

    expect(store.getState()).toBe(StoreState.hasValue);

    const toBeCanceledFinished = asyncSetterToBeCanceled();

    expect(store.getState()).toBe(StoreState.loading);

    const overridesFinished = asyncSetterOverrides();

    expect(store.getState()).toBe(StoreState.loading);

    resolveOverrides("override");
    resolveToBeCanceled("toBeCanceled");

    await store.toPromise();

    expect(store.getState()).toBe(StoreState.hasValue);
    expect(store.getValue()).toBe("override");

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
