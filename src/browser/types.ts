export abstract class Browser {
  constructor(public version?: string) {}
  abstract install(): Promise<void>;
  abstract start(): Promise<void>;
  abstract execute<T>(script: string): Promise<T>;
  abstract close(): Promise<void>;
}
