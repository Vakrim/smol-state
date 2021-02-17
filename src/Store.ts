import { Canceled } from "./Canceled";
import { isPromise } from "./isPromise";
import { LoadableState } from "./LoadableState";
import { createError, createLoading, createValue, Loadable } from "./Loadable";

export interface StoreConfig<Value> {
  initial: Value;
}

interface Subscriber<Value, Err> {
  (loadable: Loadable<Value, Err>): void;
}

export class Store<Value, Err = unknown> {
  private loadable: Loadable<Value, Err>;
  private version = 0;
  private subscribers: Set<Subscriber<Value, Err>> = new Set();

  constructor({ initial }: StoreConfig<Value>) {
    this.loadable = createValue(initial);
  }

  private setContents(newValue: Value | Promise<Value>) {
    const changeVersion = ++this.version;

    if (isPromise(newValue)) {
      const loading = newValue
        .then((newContents) => {
          if (changeVersion !== this.version) {
            throw new Canceled("Contents update cancled");
          }

          this.loadable = createValue(newContents);
          this.emitSnapshots();

          return newContents;
        })
        .catch((error) => {
          if (changeVersion !== this.version) {
            throw new Canceled("Contents update cancled");
          }

          this.loadable = createError(error);
          this.emitSnapshots();

          throw error;
        });

      this.loadable = createLoading(loading);
      this.emitSnapshots();
    } else {
      this.loadable = createValue(newValue);
      this.emitSnapshots();
    }
  }

  private emitSnapshots() {
    for (let listener of this.subscribers) {
      listener(this.loadable);
    }
  }

  public getLoadable() {
    return this.loadable;
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
      if (this.loadable.state !== LoadableState.hasValue) {
        throw new Error("Can't update contents when store hasn't stable value");
      }
      const updateResult = updater(this.loadable.contents, payload);

      this.setContents(updateResult);

      return this.loadable.toPromise();
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

      this.setContents(setResult);

      return this.loadable.toPromise();
    };
  }
}
