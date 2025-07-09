## 🚀 MicroServiceStack CDK Deployment

This project deploys a containerized web app to AWS ECS Fargate behind an HTTPS ALB, connected to Aurora PostgreSQL Serverless, with monitoring via CloudWatch.

## 🗂️ Stack Features

✅ ECS Fargate (with ALB, health check, auto-scaling)

✅ Aurora Serverless PostgreSQL (encrypted, internal access only)

✅ ACM HTTPS certificate (via env)

✅ CloudWatch dashboard and alarms

✅ Multi-stage support (dev, prod, etc.)

## 📁 Project Structure

```
lib/
  microServicesStack.ts      # Main CDK stack (infrastructure)
bin/
  script.ts                  # CDK App entry point (multi-stage deploy)
test/
  infra_as_code.test.ts      # CDK snapshot & resource tests
```

## ⚙️ Setup

Install dependencies:

```node
npm install
```

### Create .env file:

```DEV_AWS_ACCOUNT_ID=123456789012
DEV_AWS_REGION=us-east-1
DEV_ACM_CERT_ARN=arn:aws:acm:us-east-1:123456789012:certificate/xxx

PROD_AWS_ACCOUNT_ID=123456789012
PROD_AWS_REGION=us-east-1
PROD_ACM_CERT_ARN=arn:aws:acm:us-east-1:123456789012:certificate/yyy
```

## Bootstrap CDK environment:

```
npm run bootstrap
```

## 🚀 Deploy

Deploy all configured environments (e.g., dev + prod):

```
npm run deploy:multi
```

Or deploy a single stage:

```
cdk deploy dev-MicroServiceStack
```

### 🧪 Test

Run CDK stack tests:

```
npm test
```

📦 Useful Commands

```
npm run build         # Transpile TypeScript
npm run test          # Run tests
npm run synth         # CDK synth
npm run deploy        # CDK deploy current app
npm run destroy       # Tear down stack
npm run deploy:multi  # Deploy all stages via script.ts
```
