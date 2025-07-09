import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { MicroServiceStack } from "../lib/microServicesStack";

describe("MicroServiceStack", () => {
  const certificateArn =
    "arn:aws:acm:us-east-1:123456789012:certificate/mock-cert";
  const stage = "test";

  function getTemplate() {
    const app = new cdk.App();
    const stack = new MicroServiceStack(app, "TestStack", {
      stage,
      certificateArn,
      env: { account: "123456789012", region: "us-east-1" },
    });
    return Template.fromStack(stack);
  }

  it("creates ECS Cluster and Fargate Service", () => {
    const template = getTemplate();

    template.hasResource("AWS::ECS::Cluster", {});
    template.hasResource("AWS::ECS::Service", {
      Properties: Match.objectLike({
        DesiredCount: Match.anyValue(),
        LaunchType: "FARGATE",
      }),
    });
    template.hasResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {});
  });

  it("creates Aurora Serverless cluster", () => {
    const template = getTemplate();
    template.hasResource("AWS::RDS::DBCluster", {
      Properties: Match.objectLike({
        Engine: Match.stringLikeRegexp("aurora-postgresql"),
      }),
    });
  });

  it("creates CloudWatch alarms", () => {
    const template = getTemplate();
    template.resourceCountIs("AWS::CloudWatch::Alarm", 3);
  });
});
