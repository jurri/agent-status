import streamDeck from "@elgato/streamdeck";
import { AgentStatusAction } from "./actions/agent-status.js";

streamDeck.logger.setLevel("debug");

streamDeck.logger.info("==========================================");
streamDeck.logger.info("Agent Status Plugin starting");
streamDeck.logger.info("Plugin UUID: com.jurri.agent-status");
streamDeck.logger.info(`Node Version: ${process.version}`);
streamDeck.logger.info("==========================================");

process.on("uncaughtException", (err) => {
  streamDeck.logger.error("UNCAUGHT EXCEPTION");
  streamDeck.logger.error(err.stack ?? String(err));
});

process.on("unhandledRejection", (err) => {
  streamDeck.logger.error("UNHANDLED PROMISE");
  streamDeck.logger.error(String(err));
});

try {
  streamDeck.actions.registerAction(new AgentStatusAction());
  streamDeck.logger.info("Action registered: com.jurri.agent-status.status");

  streamDeck.connect();
  streamDeck.logger.info("Connected to Stream Deck");
} catch (err) {
  streamDeck.logger.error("Fatal plugin startup error");
  streamDeck.logger.error(String(err));
  process.exit(1);
}