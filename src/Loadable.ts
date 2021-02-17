import { LoadableState } from "./LoadableState";

export type Loadable<Value, Err = unknown> =
  | LoadableValue<Value>
  | LoadableLoading<Value>
  | LoadableError<Err>;

export function createValue<Contents>(contents: Contents) {
  return new LoadableValue(contents);
}

export function createLoading<Contetns>(contents: Promise<Contetns>) {
  return new LoadableLoading(contents);
}

export function createError<Err>(contents: Err) {
  return new LoadableError(contents);
}

interface LoadableMethods<Contents> {
  getValue(): Contents | void;
  toPromise(): Promise<Contents>;
  valueMaybe(): Contents | undefined;
  errorMaybe(): Contents | undefined;
}

class LoadableValue<Contetns> implements LoadableMethods<Contetns> {
  state = LoadableState.hasValue as const;

  constructor(public contents: Contetns) {}

  getValue() {
    return this.contents;
  }

  toPromise() {
    return Promise.resolve(this.contents);
  }

  valueMaybe() {
    return this.contents;
  }

  errorMaybe() {
    return undefined;
  }
}

class LoadableLoading<Contetns> implements LoadableMethods<Contetns> {
  state = LoadableState.loading as const;

  constructor(public contents: Promise<Contetns>) {}

  getValue() {
    throw this.contents;
  }

  toPromise() {
    return this.contents;
  }

  valueMaybe() {
    return undefined;
  }

  errorMaybe() {
    return undefined;
  }
}

class LoadableError<Contetns> implements LoadableMethods<Contetns> {
  state = LoadableState.hasError as const;

  constructor(public contents: Contetns) {}

  getValue() {
    throw this.contents;
  }

  toPromise() {
    return Promise.reject(this.contents);
  }

  valueMaybe() {
    return undefined;
  }

  errorMaybe() {
    return this.contents;
  }
}
