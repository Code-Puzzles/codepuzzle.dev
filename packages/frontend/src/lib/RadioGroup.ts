import type { ComponentType } from "svelte";

export interface RadioGroupOption {
  label:
    | string
    | {
        component: ComponentType;
        [key: string]: any;
      };
  value: string;
}

let id = 0;
export const nextId = () => ++id;
