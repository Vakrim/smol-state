import { Store } from "./Store";
import { useEffect, useState } from "react";
import { Loadable } from "./Loadable";

export function useStore<Value, Err = unknown>(store: Store<Value, Err>) {
  const [storeState, setStoreState] = useState(store.getValue());

  useEffect(() => {
    const listener = (loadable: Loadable<Value, Err>) => {
      setStoreState(loadable.getValue());
    };

    const unsubscribe = store.subscribe(listener);

    return () => {
      unsubscribe();
    };
  }, []);

  return storeState;
}
