import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { Readable } from "stream";
import { SdkStreamMixin } from "@aws-sdk/types";
import { pollS3 } from "../src/s3Watcher";
import { publishToSQS } from "../src/sqsPublisher";

jest.mock("../src/sqsPublisher", () => ({
  publishToSQS: jest.fn(),
}));

const s3Mock = mockClient(S3Client);

function toSdkStream(stream: Readable): Readable & SdkStreamMixin {
  return Object.assign(stream, {
    transformToByteArray: async () => new Uint8Array([0]),
    transformToWebStream: () => new ReadableStream<Uint8Array>(),
    transformToString: async () => "",
  });
}

function createReadableStream(data: any): Readable {
  return Readable.from([Buffer.from(JSON.stringify(data))]);
}

describe("pollS3", () => {
  beforeEach(() => {
    s3Mock.reset();
    jest.clearAllMocks();
  });

  it("should process a valid file and publish to SQS", async () => {
    s3Mock
      .on(ListObjectsV2Command)
      .resolves({ Contents: [{ Key: "test.json" }] });

    s3Mock.on(GetObjectCommand).resolves({
      Body: toSdkStream(
        createReadableStream({
          transaction_id: "tx-1",
          amount: 100,
          currency: "USD",
          timestamp: "2024-01-01T00:00:00Z",
          merchant: { id: "m-1", name: "Merchant A" },
        })
      ),
    });

    s3Mock.on(DeleteObjectCommand).resolves({});

    await pollS3();

    expect(publishToSQS).toHaveBeenCalledWith({
      id: "tx-1",
      amount: 100,
      merchantName: "Merchant A",
    });
  });

  it("should skip invalid JSON files", async () => {
    s3Mock
      .on(ListObjectsV2Command)
      .resolves({ Contents: [{ Key: "bad.json" }] });

    s3Mock.on(GetObjectCommand).resolves({
      Body: toSdkStream(Readable.from([Buffer.from("not-json")])),
    });

    await pollS3();

    expect(publishToSQS).not.toHaveBeenCalled();
  });
});
