import type { PluginState } from "./types.js";
import { checkDeadline, formatDuration } from "./state.js";

function classifyIntent(command: string): "write" | "build" | "run" | "investigate" | "setup" {
  const trimmed = command.trim();
  // Package managers / installers
  if (/^(pip3?|python3?\s+-m\s+pip|npm\s+install|npx|yarn\s+add|pnpm\s+add|apt-get|apt\s+install|apk\s+add|yum|dnf|pacman|cargo\s+install|rustup|go\s+install|gem\s+install|Rscript\s+-e\s+.install)\b/.test(trimmed)) return "setup";
  // Compilers / build tools
  if (/^(gcc|g\+\+|cc|clang|make|cmake|cargo\s+build|npm\s+run\s+build|tsc|javac|go\s+build|rustc|coqc|ocamlfind|ocamlopt|ocamlc)\b/.test(trimmed)) return "build";
  // Running executables or scripts (including interpreters)
  if (/^(\.\/|time\s+\.\/|time\s+\/|timeout\s+\d+s?\s+\.\/|timeout\s+\d+s?\s+\/|\/app\/|\/tmp\/work\/)/.test(trimmed)) return "run";
  if (/^(python3?|node|ruby|perl|Rscript|java\s+-|lua|php|bash\s+\/|sh\s+\/)\s+\S/.test(trimmed)) return "run";
  if (/^echo\s+.*\|\s*(python3?|node|ruby|perl|Rscript|bash|sh|\.\/)\b/.test(trimmed)) return "run";
  // Heredoc or redirect to file — treat as write
  if (/<<\s*['"]?\w+['"]?/.test(trimmed) && />\s*\S+/.test(trimmed)) return "write";
  // cat/cp/mv to deliverable paths
  if (/^(cat|cp|mv)\s+.*\s+\/app\//.test(trimmed)) return "write";
  return "investigate";
}

export function createHooks(ctx: any, state: PluginState) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: any }
    ) => {
      const isWrite = input.tool === "write" || input.tool === "edit";
      
      // Tier 2: Full Lockdown (80%+)
      if (state.fullLockdown) {
        if (input.tool === "bash") {
          const intent = classifyIntent(output.args.command || "");
          if (intent === "investigate") {
            const elapsed = Date.now() - state.options.startTime;
            throw new Error(`🚨 DEADLINE LOCKDOWN: ${Math.round((elapsed/state.options.budgetMs)*100)}% of budget used. Diagnostic commands are blocked. Only build, run, write, and edit are permitted. Finalize your solution NOW.`);
          }
        } else if (input.tool === "read" || input.tool === "grep" || input.tool === "glob") {
          const elapsed = Date.now() - state.options.startTime;
          throw new Error(`🚨 DEADLINE LOCKDOWN: ${Math.round((elapsed/state.options.budgetMs)*100)}% of budget used. Read-only exploration is blocked. Focus on writing and running your solution.`);
        }
      }

      // Tier 1: Investigation Lockdown (33%+)
      if (state.investigationLockdown && !state.fullLockdown) {
        if (input.tool === "bash") {
          const intent = classifyIntent(output.args.command || "");
          if (intent === "investigate") {
            throw new Error(`⚠️ INVESTIGATION LOCKDOWN: You have used over 33% of your budget. Diagnostic scripts and exploration commands are no longer permitted. You must focus on writing, compiling, and testing your solution.`);
          }
        }
      }

      // Existing one-shot blocking logic for other thresholds
      if (state.pendingWarning && state.pendingBlocking) {
        if (isWrite) {
          // Never block write/edit calls - the agent needs these to finalize.
          // Demote to non-blocking warning which will be injected in 'after' hook.
          state.pendingBlocking = false;
          return;
        }
        const warning = state.pendingWarning;
        state.pendingWarning = null;
        state.pendingBlocking = false;
        throw new Error(warning);
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string; args?: any },
      output: { output?: string; metadata?: any }
    ) => {
      if (state.pendingWarning && !state.pendingBlocking) {
        const warning = state.pendingWarning;
        state.pendingWarning = null;
        state.pendingBlocking = false;
        if (typeof output.output === "string") {
          output.output += `\n\n${warning}`;
        } else {
          output.output = warning;
        }
      }
    },

    event: async (input: { event: any }) => {
      const event = input?.event;
      if (event?.type !== "message.part.updated") return;
      const part = event.part ?? event.properties?.part;
      if (part?.type !== "step-finish") return;

      state.stepCount++;
      checkDeadline(state);
    },
  };
}
