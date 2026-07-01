import {
  SingletonAction,
  action,
  type KeyAction,
  type KeyDownEvent,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";

import streamDeck from "@elgato/streamdeck";

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

type AgentState =
  | "idle"
  | "working"
  | "waiting"
  | "error"
  | "offline";

interface StatusFile {
  agent?: string;
  state?: AgentState;
  message?: string;
  updatedAt?: string;
}

interface Settings {
  [key: string]: JsonValue;
  statusFile?: string;
  pressCommand?: string;
}

const DEFAULT_STATUS_FILE = join(homedir(), ".agent-status.json");

const COLORS: Record<AgentState, string> = {
  idle: "#22c55e",
  working: "#3b82f6",
  waiting: "#facc15",
  error: "#ef4444",
  offline: "#4b5563"
};

const LABELS: Record<AgentState, string> = {
  idle: "IDLE",
  working: "WORK",
  waiting: "WAIT",
  error: "ERR",
  offline: "OFF"
};

@action({
  UUID: "com.jaydee.agent-status.status"
})
export class AgentStatusAction extends SingletonAction<Settings> {
  private timer?: NodeJS.Timeout;
  private visibleAction?: KeyAction;

  public override async onWillAppear(
    ev: WillAppearEvent<Settings>
  ): Promise<void> {
    streamDeck.logger.info("Agent Status key appeared");

    const keyAction = ev.action as KeyAction;
    this.visibleAction = keyAction;

    await this.update(keyAction, ev.payload.settings);

    if (!this.timer) {
      this.timer = setInterval(async () => {
        if (!this.visibleAction) {
          return;
        }

        try {
          const settings =
            await this.visibleAction.getSettings<Settings>();

          await this.update(this.visibleAction, settings);
        } catch (err) {
          streamDeck.logger.error("Timer update failed");
          streamDeck.logger.error(String(err));
        }
      }, 1500);
    }
  }

  public override onWillDisappear(
    _ev: WillDisappearEvent<Settings>
  ): void {
    streamDeck.logger.info("Agent Status key disappeared");

    this.visibleAction = undefined;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public override async onKeyDown(
    ev: KeyDownEvent<Settings>
  ): Promise<void> {
    streamDeck.logger.info("Agent Status key pressed");

    const command =
      typeof ev.payload.settings.pressCommand === "string"
        ? ev.payload.settings.pressCommand.trim()
        : "";

    if (!command) {
      streamDeck.logger.info("No command configured");
      await ev.action.showOk();
      return;
    }

    try {
      streamDeck.logger.info(`Executing command: ${command}`);

      spawn(command, {
        shell: true,
        detached: true,
        stdio: "ignore",
        windowsHide: true
      }).unref();

      await ev.action.showOk();
    } catch (err) {
      streamDeck.logger.error("Command failed");
      streamDeck.logger.error(String(err));
      await ev.action.showAlert();
    }
  }

  private async update(
    action: KeyAction,
    settings: Settings
  ): Promise<void> {
    const statusFile =
      typeof settings.statusFile === "string" && settings.statusFile.trim()
        ? this.expandPath(settings.statusFile.trim())
        : DEFAULT_STATUS_FILE;

    const status = await this.readStatus(statusFile);

    const agent = status.agent ?? "Agent";
    const state = status.state ?? "offline";
    const message = status.message ?? LABELS[state];

    streamDeck.logger.debug(
      `Update: file=${statusFile}, agent=${agent}, state=${state}, message=${message}`
    );

    await action.setTitle("");
    await action.setImage(this.createSvg(agent, state, message));
  }

  private async readStatus(
    file: string
  ): Promise<StatusFile> {
    try {
      if (!existsSync(file)) {
        streamDeck.logger.warn(`Status file missing: ${file}`);

        return {
          agent: "Agent",
          state: "offline",
          message: "missing"
        };
      }

      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as StatusFile;

      if (!this.isValidState(parsed.state)) {
        streamDeck.logger.warn(`Invalid state in status file: ${String(parsed.state)}`);

        return {
          agent: parsed.agent ?? "Agent",
          state: "error",
          message: "bad state"
        };
      }

      return parsed;
    } catch (err) {
      streamDeck.logger.error(`Could not read status file: ${file}`);
      streamDeck.logger.error(String(err));

      return {
        agent: "Agent",
        state: "error",
        message: "json"
      };
    }
  }

  private isValidState(
    state: unknown
  ): state is AgentState {
    return (
      state === "idle" ||
      state === "working" ||
      state === "waiting" ||
      state === "error" ||
      state === "offline"
    );
  }

  private expandPath(path: string): string {
    if (path.startsWith("~/")) {
      return join(homedir(), path.slice(2));
    }

    if (path.includes("%USERPROFILE%")) {
      return path.replaceAll("%USERPROFILE%", homedir());
    }

    return path;
  }

  private createSvg(
    agent: string,
    state: AgentState,
    message: string
  ): string {
    const color = COLORS[state];
    const label = LABELS[state];

    const safeAgent = this.escapeXml(agent.slice(0, 12));
    const safeMessage = this.escapeXml(message.slice(0, 18));
    const safeLabel = this.escapeXml(label);

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="22" fill="#0f172a"/>
  <rect x="8" y="8" width="128" height="128" rx="18" fill="#111827" stroke="${color}" stroke-width="4"/>
  <circle cx="72" cy="44" r="24" fill="${color}"/>
  <text x="72" y="51" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#111827">${safeLabel}</text>
  <text x="72" y="91" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">${safeAgent}</text>
  <text x="72" y="115" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#cbd5e1">${safeMessage}</text>
</svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  private escapeXml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&apos;");
  }
}