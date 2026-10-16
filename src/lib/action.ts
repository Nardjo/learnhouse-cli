import { globalFlags } from "./config.js";
import { handleError } from "./errors.js";
import { output } from "./output.js";

/** Wrap a command action: print what it returns, or the error with the right exit code. */
export function run<A extends unknown[]>(fn: (...args: A) => unknown) {
  return async (...args: A) => {
    try {
      output(await fn(...args));
    } catch (err) {
      handleError(err, globalFlags.json);
    }
  };
}
