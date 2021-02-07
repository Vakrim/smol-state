import { isPromise } from "../src/isPromise";

describe(isPromise, () => {
  it("checks is value is a promise", () => {
    expect(isPromise(Promise.resolve(1))).toBe(true);
    expect(isPromise(new Promise(() => {}))).toBe(true);
    expect(isPromise((async () => {})())).toBe(true);

    expect(isPromise(1)).toBe(false);
    expect(isPromise({})).toBe(false);
    expect(isPromise(null)).toBe(false);
  });
});
