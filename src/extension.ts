import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";

import { hostname } from "node:os";

const HOSTNAME_MARKER = "hostname-marker";
const HOSTNAME_CONTEXT = "hostname-context";

export interface HostnameData {
  hostname: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function hostnameExtension(pi: ExtensionAPI) {
  const currentHostname = hostname();

  // Helper function to check hostname and inject context if needed
  const checkHostname = (ctx: ExtensionContext) => {
    const entries = ctx.sessionManager.getEntries();

    // Find the most recent hostname entry
    let recordedHostname: string | undefined;
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.type === "custom" && entry.customType === HOSTNAME_MARKER) {
        recordedHostname = (entry.data as HostnameData | undefined)?.hostname;
        break;
      }
    }

    if (!recordedHostname) {
      // First time loading this session - record the hostname
      pi.appendEntry(HOSTNAME_MARKER, { hostname: currentHostname });
    } else if (recordedHostname !== currentHostname) {
      // Session was created on a different machine
      // Inject context message for the LLM
      pi.sendMessage(
        {
          customType: HOSTNAME_CONTEXT,
          content: `System context: This session was originally created on machine "${recordedHostname}". You are now on "${currentHostname}". File paths, installed tools, environment variables, and system state may differ between these machines.`,
          display: false, // Hidden from TUI but included in LLM context
        },
        { triggerTurn: false }
      );
    }
  };

  pi.on("session_start", (_event, ctx) => {
    checkHostname(ctx);
  });

  // Also check on session resume (when switching sessions)
  pi.on("session_switch", async (_event, ctx) => {
    // Small delay to let the session load fully
    await sleep(100);
    checkHostname(ctx);
  });

  // Register a command to show hostname info
  pi.registerCommand("hostname", {
    description: "Show session hostname information",
    async handler(_args, ctx) {
      const entries = ctx.sessionManager.getEntries();
      let recordedHostname: string | undefined;

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.type === "custom" && entry.customType === HOSTNAME_MARKER) {
          recordedHostname = (entry.data as HostnameData | undefined)?.hostname;
          break;
        }
      }

      if (!recordedHostname) {
        ctx.ui.notify(
          `Current machine: ${currentHostname} (no hostname recorded in session)`,
          "info"
        );
      } else if (recordedHostname === currentHostname) {
        ctx.ui.notify(
          `Session created on: ${recordedHostname} (same machine)`,
          "info"
        );
      } else {
        ctx.ui.notify(
          `Session created on: ${recordedHostname} | Current machine: ${currentHostname}`,
          "warning"
        );
      }
    },
  });
}
