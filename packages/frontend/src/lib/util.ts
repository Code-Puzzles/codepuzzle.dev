import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../tailwind.config.js";

let id = 0;
export function uniqueId(): string {
  return `id-${++id}`;
}

const { screens } = resolveConfig(tailwindConfig).theme!;
if (!screens || Array.isArray(screens)) {
  throw new Error("you done messed up");
}

export const responsiveBreakpoint = "md";
export const responsiveBreakpointPixels = parseInt(
  (screens[responsiveBreakpoint] as string).replace(/[a-z]*/i, ""),
);

export const jsonClone = (x: any) => JSON.parse(JSON.stringify(x));
