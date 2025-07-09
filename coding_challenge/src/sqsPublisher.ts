import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { logger } from "./logger";
import { config } from "./config";

const sqs = new SQSClient({
  region: config.region,
  endpoint: "http://localhost:4566", // LocalStack endpoint
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

export async function publishToSQS(message: any, attempt = 1): Promise<void> {
  try {
    const cmd = new SendMessageCommand({
      QueueUrl: config.queueUrl,
      MessageBody: JSON.stringify(message),
    });
    await sqs.send(cmd);
    logger.info("✅ Message published to SQS", { message });
  } catch (err) {
    if (attempt < config.maxRetries) {
      logger.warn(`Retrying SQS publish (attempt ${attempt})`, { error: err });
      return publishToSQS(message, attempt + 1);
    }
    logger.error("❌ Failed to publish to SQS after retries", { error: err });
  }
}
