import dotenv from "dotenv";
dotenv.config();

/// Globa config var for import
export const config = {
  region: process.env.AWS_REGION || "us-east-1",
  bucket: process.env.S3_BUCKET || "test-bucket",
  queueUrl:
    process.env.SQS_QUEUE_URL ||
    "http://localhost:4566/000000000000/test-queue",
  maxRetries: parseInt(process.env.MAX_RETRIES || "3"),
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "30000"),
};
