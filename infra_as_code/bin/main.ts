#!/usr/bin/env ts-node

import * as cdk from "aws-cdk-lib";
import { MicroServiceStack } from "../lib/microServicesStack";
import * as dotenv from "dotenv";

dotenv.config();

const app = new cdk.App();

// 🧠 Define deployment stages here
const deployments = [
  {
    stage: "dev",
    vpcName: "abc",
    certificateArn: process.env.DEV_ACM_CERT_ARN,
    env: {
      account: process.env.DEV_AWS_ACCOUNT_ID,
      region: process.env.DEV_AWS_REGION,
    },
  },
  {
    stage: "prod",
    vpcName: "xyz",
    certificateArn: process.env.PROD_ACM_CERT_ARN,
    env: {
      account: process.env.PROD_AWS_ACCOUNT_ID,
      region: process.env.PROD_AWS_REGION,
    },
  },
];

// 🚀 Loop over each deployment target
for (const deployment of deployments) {
  try {
    if (!deployment.certificateArn) {
      throw new Error(`Missing ACM cert for stage: ${deployment.stage}`);
    }

    new MicroServiceStack({
      scope: app,
      id: `${deployment.stage}-MicroServiceStack`,
      props: {
        vpcName: deployment.vpcName,
        stage: deployment.stage,
        certificateArn: deployment.certificateArn,
        env: deployment.env,
      },
    });

    console.log(`✅ ${deployment.stage} stack added to app`);
  } catch (err) {
    console.error(`❌ Failed to create stack for stage: ${deployment.stage}`);
    console.error(err);
  }
}
