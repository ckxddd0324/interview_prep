import { pollS3 } from "./s3Watcher";
import { logger } from "./logger";
import { config } from "./config";

const POLL_INTERVAL_MS = config.pollIntervalMs; // 30 seconds

// Continous running till user exit
async function start() {
  logger.info("Starting S3 monitor service");
  while (true) {
    try {
      await pollS3();
    } catch (err) {
      logger.error("Fatal error during S3 poll", { error: err });
    }
    await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
  }
}

start();
