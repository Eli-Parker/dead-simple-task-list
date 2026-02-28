import { badUserInput } from "./errors.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertUuid(value: string, fieldName: string): void {
  if (!UUID_RE.test(value)) {
    badUserInput(`${fieldName} must be a valid UUID`);
  }
}

export function assertNonNegativeInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0) {
    badUserInput(`${fieldName} must be a non-negative integer`);
  }
}

export function assertRequiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    badUserInput(`${fieldName} cannot be empty`);
  }
  return trimmed;
}
