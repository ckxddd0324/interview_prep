// scripts/setupLocalStack.ts
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
import { SQSClient, CreateQueueCommand } from "@aws-sdk/client-sqs";

const region = "us-east-1";
const endpoint = "http://localhost:4566";
const credentials = {
  accessKeyId: "test",
  secretAccessKey: "test",
};

const s3 = new S3Client({
  region,
  endpoint,
  credentials,
  forcePathStyle: true,
});
const sqs = new SQSClient({ region, endpoint, credentials });

async function setup() {
  await s3.send(new CreateBucketCommand({ Bucket: "test-bucket" }));
  await sqs.send(new CreateQueueCommand({ QueueName: "test-queue" }));
  console.log("✅ LocalStack: S3 bucket and SQS queue created");
}

setup().catch(console.error);
