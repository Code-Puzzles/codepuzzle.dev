let id = 0;
export function uniqueId(): string {
  return `id-${++id}`;
}
