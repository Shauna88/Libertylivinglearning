/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "better-sqlite3" {
  namespace Database {
    interface RunResult {
      changes: number;
      lastInsertRowid: number | bigint;
    }
    interface Statement {
      run(...params: unknown[]): RunResult;
      get(...params: unknown[]): any;
      all(...params: unknown[]): any[];
    }
    interface Database {
      prepare(source: string): Statement;
      exec(source: string): void;
      pragma(source: string): unknown;
      transaction<T extends (...args: any[]) => any>(fn: T): T;
      close(): void;
    }
    interface Options {
      readonly?: boolean;
      fileMustExist?: boolean;
      timeout?: number;
    }
  }

  interface DatabaseConstructor {
    new (filename: string, options?: Database.Options): Database.Database;
    (filename: string, options?: Database.Options): Database.Database;
  }

  const Database: DatabaseConstructor;
  export = Database;
}
