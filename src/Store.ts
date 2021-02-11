import { Canceled } from "./Canceled";
import { isPromise } from "./isPromise";
import { Snapshot } from "./Snapshot";
import { StoreState } from "./StoreState";

export interface StoreConfig<Value> {
  initial: Value;
}

interface Subscriber<Value, Err> {
  (snapshot: Snapshot<Value, Err>): void;
}

export class Store<Value, Err = unknown> {
  private contents: Value;
  private errorContents!: Err;
  private asyncContents: Promise<Value>;
  private state: StoreState = StoreState.hasValue;
  private version = 0;
  private subscribers: Set<Subscriber<Value, Err>> = new Set();

  constructor({ initial }: StoreConfig<Value>) {
    this.contents = initial;
    this.asyncContents = Promise.resolve(this.contents);
  }

  private setContents(newValue: Value | Promise<Value>) {
    const changeVersion = ++this.version;

    if (isPromise(newValue)) {
      this.state = StoreState.loading;
      this.emitSnapshots();

      this.asyncContents = newValue
        .then((newContents) => {
          if (changeVersion !== this.version) {
            throw new Canceled("Contents update cancled");
          }

          this.contents = newContents;
          this.state = StoreState.hasValue;
          this.emitSnapshots();

          return this.contents;
        })
        .catch((error) => {
          if (changeVersion !== this.version) {
            throw new Canceled("Contents update cancled");
          }

          this.errorContents = error;
          this.state = StoreState.hasError;
          this.emitSnapshots();

          throw this.errorContents;
        });
      return this.asyncContents;
    } else {
      this.contents = newValue;
      this.asyncContents = Promise.resolve(this.contents);
      this.state = StoreState.hasValue;
      this.emitSnapshots();

      return this.asyncContents;
    }
  }

  private emitSnapshots() {
    const snapshot: Snapshot<Value, Err> =
      this.state === StoreState.hasValue
        ? { state: StoreState.hasValue, contents: this.contents }
        : this.state === StoreState.loading
        ? { state: StoreState.loading }
        : { state: StoreState.hasError, contents: this.errorContents };

    for (let listener of this.subscribers) {
      listener(snapshot);
    }
  }

  public subscribe(subscriber: Subscriber<Value, Err>) {
    this.subscribers.add(subscriber);

    return () => {
      this.unsubscribe(subscriber);
    };
  }

  public unsubscribe(subscriber: Subscriber<Value, Err>) {
    this.subscribers.delete(subscriber);
  }

  public createUpdater(
    updater: (prevValue: Value) => Value | Promise<Value>
  ): () => Promise<Value>;
  public createUpdater<Payload>(
    updater: (prevValue: Value, payload: Payload) => Value | Promise<Value>
  ): (payload: Payload) => Promise<Value>;
  public createUpdater<Payload>(
    updater: (prevValue: Value, payload?: Payload) => Value | Promise<Value>
  ) {
    return (payload?: Payload): Promise<Value> => {
      if (this.state === StoreState.loading) {
        throw new Error("Can't update contents while in loading state");
      }
      const updateResult = updater(this.contents, payload);

      return this.setContents(updateResult);
    };
  }

  public createSetter(
    setter: () => Value | Promise<Value>
  ): () => Promise<Value>;
  public createSetter<Payload>(
    setter: (payload: Payload) => Value | Promise<Value>
  ): (payload: Payload) => Promise<Value>;
  public createSetter<Payload>(
    setter: (payload?: Payload) => Value | Promise<Value>
  ) {
    return (payload?: Payload): Promise<Value> => {
      const setResult = setter(payload);

      return this.setContents(setResult);
    };
  }

  /**
   *  Method to access the value that matches the semantics of React Suspense and Recoil selectors.
   *  If the state has a value then it returns a value, if it has an error then it throws that error,
   *  and if it is still pending then it suspends execution or rendering to propagate the pending state.
   */
  public getValue() {
    if (this.state === StoreState.loading) {
      throw this.asyncContents;
    }
    if (this.state === StoreState.hasError) {
      throw this.errorContents;
    }
    return this.contents;
  }

  /**
   * Returns a Promise that will resolve when the selector has resolved.
   * If the selector is synchronous or has already resolved, it returns a Promise that resolves immediately.
   */
  public toPromise() {
    return this.asyncContents;
  }

  /**
   * Return state of store
   */
  public getState() {
    return this.state;
  }

  /**
   * Returns the value if available, otherwise returns undefined
   */
  public valueMaybe() {
    if (this.state !== StoreState.hasValue) {
      return;
    }
    return this.contents;
  }

  /**
   * Returns the error if available, otherwise returns undefined
   */
  public errorMaybe() {
    if (this.state !== StoreState.hasError) {
      return;
    }
    return this.errorContents;
  }
}
