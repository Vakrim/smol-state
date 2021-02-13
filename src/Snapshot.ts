import { LoadableState } from "./LoadableState";

interface HasValueSnapshot<Value> {
  state: LoadableState.hasValue;
  contents: Value;
}

interface LoadingSnapshot {
  state: LoadableState.loading;
}

interface HasErrorSnapshot<Err> {
  state: LoadableState.hasError;
  contents: Err;
}

export type Snapshot<Value, Err = unknown> =
  | HasValueSnapshot<Value>
  | LoadingSnapshot
  | HasErrorSnapshot<Err>;
