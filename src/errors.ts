export class MaatError extends Error {
  constructor(public code: 1 | 2 | 3 | 4, message: string) { super(message); this.name = "MaatError"; }
}
