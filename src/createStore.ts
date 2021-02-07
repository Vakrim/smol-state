import { isPromise } from "./isPromise";

interface CreateUpdater<Value> {
  (updater: (prevValue: Value) => Value): () => Promise<Value>;

  <Payload>(updater: (prevValue: Value, payload: Payload) => Promise<Value>): (
    payload: Payload
  ) => Promise<Value>;

  <Payload>(updater: (prevValue: Value, payload: Payload) => Value): (
    payload: Payload
  ) => Promise<Value>;
}

interface CreateSetter<Value> {
  (setter: () => Value): () => Promise<Value>;

  <Payload>(setter: (payload: Payload) => Promise<Value>): (
    payload: Payload
  ) => Promise<Value>;

  <Payload>(setter: (payload: Payload) => Value): (
    payload: Payload
  ) => Promise<Value>;
}

export enum StoreState {
  hasValue,
  loading,
  hasError,
}

export const createStore = <Value>({ initial }: { initial: Value }) => {
  let contents: Value = initial;
  let asyncContents: Promise<Value> = Promise.resolve(contents);
  let state: StoreState = StoreState.hasValue;
  let version = 0;

  const setContents = (newValue: Value | Promise<Value>) => {
    const changeVersion = ++version;

    if (isPromise(newValue)) {
      state = StoreState.loading;
      asyncContents = newValue
        .then((newContents) => {
          if (changeVersion === version) {
            contents = newContents;
            state = StoreState.hasValue;
          }
          return contents;
        })
        .catch((error) => {
          if (changeVersion === version) {
            contents = error;
            state = StoreState.hasError;
          }
          throw contents;
        });
      return asyncContents;
    } else {
      contents = newValue;
      asyncContents = Promise.resolve(contents);
      state = StoreState.hasValue;
      return asyncContents;
    }
  };

  const createUpdater: CreateUpdater<Value> = <Payload>(
    updater: (prevValue: Value, payload?: Payload) => Value | Promise<Value>
  ) => {
    return (payload?: Payload): Promise<Value> => {
      if (state === StoreState.loading) {
        throw new Error("Can't update contents while in loading state");
      }
      const updateResult = updater(contents, payload);

      return setContents(updateResult);
    };
  };

  const createSetter: CreateSetter<Value> = <Payload>(
    setter: (payload?: Payload) => Value | Promise<Value>
  ) => {
    return (payload?: Payload): Promise<Value> => {
      const setResult = setter(payload);

      return setContents(setResult);
    };
  };

  /**
   *  Method to access the value that matches the semantics of React Suspense and Recoil selectors.
   *  If the state has a value then it returns a value, if it has an error then it throws that error,
   *  and if it is still pending then it suspends execution or rendering to propagate the pending state.
   */
  const getValue = () => {
    if (state === StoreState.loading) {
      throw asyncContents;
    }
    if (state === StoreState.hasError) {
      throw contents;
    }
    return contents;
  };

  /**
   * Returns a Promise that will resolve when the selector has resolved.
   * If the selector is synchronous or has already resolved, it returns a Promise that resolves immediately.
   */
  const toPromise = () => {
    return asyncContents;
  };

  /**
   * Return state of store
   */
  const getState = () => {
    return state;
  };

  /**
   * Returns the value if available, otherwise returns undefined
   */
  const valueMaybe = () => {
    if (state !== StoreState.hasValue) {
      return;
    }
    return contents;
  };

  /**
   * Returns the error if available, otherwise returns undefined
   */
  const errorMaybe = () => {
    if (state !== StoreState.hasError) {
      return;
    }
    return contents;
  };

  return {
    createUpdater,
    createSetter,
    getValue,
    getState,
    toPromise,
    valueMaybe,
    errorMaybe,
  };
};
