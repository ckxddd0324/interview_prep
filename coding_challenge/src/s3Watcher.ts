import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "./config";
import { logger } from "./logger";
import Ajv from "ajv";
import { transactionSchema } from "./schema";
import { transformTransaction } from "./transformer";
import { publishToSQS } from "./sqsPublisher";
import { streamToString } from "./utils";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv); // 👈 Add this line

const validate = ajv.compile(transactionSchema);

const s3 = new S3Client({
  region: config.region,
  endpoint: "http://localhost:4566",
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  forcePathStyle: true, // for LocalStack
});

export async function pollS3(): Promise<void> {
  const listCmd = new ListObjectsV2Command({ Bucket: config.bucket });
  const result = await s3.send(listCmd);

  const keys = result.Contents?.map((item) => item.Key!) || [];
  if (keys.length === 0) {
    logger.info("🟡 No new files found in bucket");
    return;
  }

  for (const key of keys) {
    logger.info(`📄 Processing file: ${key}`);
    try {
      const getCmd = new GetObjectCommand({ Bucket: config.bucket, Key: key });
      const data = await s3.send(getCmd);
      const jsonStr = await streamToString(data.Body as any);

      let parsed;
      try {
        console.log(jsonStr);
        parsed = JSON.parse(jsonStr);
      } catch (parseErr) {
        logger.error("❌ Malformed JSON", { key, error: parseErr });
        continue;
      }

      const valid = validate(parsed);
      if (!valid) {
        logger.warn("⚠️ JSON validation failed", {
          key,
          errors: validate.errors,
        });
        continue;
      }

      const transformed = transformTransaction(parsed);
      await publishToSQS(transformed);

      // Optional: delete file after success
      await s3.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key })
      );
      logger.info(`🧹 File processed and deleted: ${key}`);
    } catch (err) {
      logger.error("❌ Error processing file", { key, error: err });
    }
  }
}
