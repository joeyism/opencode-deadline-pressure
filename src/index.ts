import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import { resolveOptions } from "./config.js";
import { createState } from "./state.js";
import { createHooks } from "./hooks.js";
import type { DeadlinePressureOptions } from "./types.js";

const deadlinePressure = async (ctx: PluginInput, options?: DeadlinePressureOptions): Promise<Hooks> => {
  const resolved = resolveOptions(options, ctx.directory);
  const state = createState(resolved);
  return createHooks(ctx, state);
};

export { deadlinePressure };
export default deadlinePressure;
