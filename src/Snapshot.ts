import { StoreState } from "./StoreState";

interface HasValueSnapshot<Value> {
  state: StoreState.hasValue;
  contents: Value;
}

interface LoadingSnapshot {
  state: StoreState.loading;
}

interface HasErrorSnapshot<Err> {
  state: StoreState.hasError;
  contents: Err;
}

export type Snapshot<Value, Err = unknown> =
  | HasValueSnapshot<Value>
  | LoadingSnapshot
  | HasErrorSnapshot<Err>;
