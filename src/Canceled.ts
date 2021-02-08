export class Canceled extends Error {
  constructor(m: string) {
    super(m);

    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, Canceled.prototype);
  }
}
