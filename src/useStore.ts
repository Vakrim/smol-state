import { Store } from "./Store";
import { useEffect, useState } from "react";

export function useStore<Value, Err = unknown>(store: Store<Value, Err>) {
  const [storeState, setStoreState] = useState(store.getValue());

  useEffect(() => {
    const listener = () => {
      setStoreState(store.getValue());
    };

    const unsubscribe = store.subscribe(listener);

    return () => {
      unsubscribe();
    };
  }, []);

  return storeState;
}
