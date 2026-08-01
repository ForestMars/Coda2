/**
 * @file errors.ts
 * @description Custom error classes for library infrastructure
 */

export class InfrastructureError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "InfrastructureError";
  }
}

export class ModuleNotFoundError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ModuleNotFoundError";
  }
}
