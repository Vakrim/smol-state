export const isPromise = <T>(value: Promise<T> | T): value is Promise<T> => {
  return (
    !!value &&
    typeof value === "object" &&
    "then" in value &&
    typeof value.then === "function"
  );
};
