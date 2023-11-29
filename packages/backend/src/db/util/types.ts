export type StringOnly<T> = T extends string ? T : never;

export type Replace<T, R extends Partial<Record<keyof T, unknown>>> = Omit<
  T,
  keyof R
> &
  R;
