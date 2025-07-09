import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

interface MicroServiceStackConstructorParams {
  scope: Construct;
  id: string;
  props: MicroServiceStackProps;
}

interface MicroServiceStackProps extends cdk.StackProps {
  vpcName: string;
  certificateArn: string;
  stage: string;
}

export class MicroServiceStack extends cdk.Stack {
  constructor({ scope, id, props }: MicroServiceStackConstructorParams) {
    super(scope, id, props);

    const vpc = this.getVpc(props.vpcName);
    const cluster = this.createEcsCluster(vpc);
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      `${props.stage}-ACMCert`,
      props.certificateArn
    );
    const fargateService = this.createFargateService(
      cluster,
      certificate,
      props.stage
    );
    const dbSecurityGroup = this.createDbSecurityGroup(vpc, fargateService);
    const dbCluster = this.createAuroraServerless(
      vpc,
      dbSecurityGroup,
      props.stage
    );
    this.createMonitoring(fargateService, dbCluster, props.stage);
  }

  // GET VPC name
  private getVpc(vpcName = "DefaultVPC"): ec2.IVpc {
    return ec2.Vpc.fromLookup(this, vpcName, { isDefault: true });
  }

  // Create ECS cluster
  private createEcsCluster(vpc: ec2.IVpc): ecs.Cluster {
    return new ecs.Cluster(this, "Cluster", { vpc });
  }

  private createFargateService(
    cluster: ecs.Cluster,
    certificate: acm.ICertificate,
    stage: string
  ): ecs_patterns.ApplicationLoadBalancedFargateService {
    const fargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        `${stage}-FargateService`,
        {
          cluster,
          memoryLimitMiB: 512,
          cpu: 256,
          desiredCount: 2,
          listenerPort: 443,
          certificate,
          taskImageOptions: {
            image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
            containerPort: 80,
            environment: {
              DB_HOST: "will-set-later",
              STAGE: stage,
            },
          },
          publicLoadBalancer: true,
        }
      );

    fargateService.targetGroup.configureHealthCheck({
      path: "/",
      interval: cdk.Duration.seconds(30),
      healthyHttpCodes: "200",
    });

    const scaling = fargateService.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 5,
    });

    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 50,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    return fargateService;
  }

  private createDbSecurityGroup(
    vpc: ec2.IVpc,
    fargateService: ecs_patterns.ApplicationLoadBalancedFargateService
  ): ec2.SecurityGroup {
    const dbSecurityGroup = new ec2.SecurityGroup(this, "DBSecurityGroup", {
      vpc,
      description: "Allow ECS access to RDS",
      allowAllOutbound: true,
    });

    fargateService.service.connections.allowTo(
      dbSecurityGroup,
      ec2.Port.tcp(5432)
    );

    return dbSecurityGroup;
  }

  private createAuroraServerless(
    vpc: ec2.IVpc,
    dbSecurityGroup: ec2.SecurityGroup,
    stage: string
  ): rds.ServerlessCluster {
    return new rds.ServerlessCluster(this, `${stage}-AuroraCluster`, {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_13_7,
      }),
      vpc,
      scaling: {
        autoPause: cdk.Duration.minutes(10),
        minCapacity: rds.AuroraCapacityUnit.ACU_2,
        maxCapacity: rds.AuroraCapacityUnit.ACU_8,
      },
      credentials: rds.Credentials.fromGeneratedSecret("clusteradmin"),
      defaultDatabaseName: `${stage}AppDB`,
      securityGroups: [dbSecurityGroup],
      enableDataApi: true,
    });
  }

  private createMonitoring(
    fargateService: ecs_patterns.ApplicationLoadBalancedFargateService,
    dbCluster: rds.ServerlessCluster,
    stage: string
  ): void {
    const dashboard = new cloudwatch.Dashboard(this, `${stage}-AppDashboard`);

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "CPU Utilization",
        left: [fargateService.service.metricCpuUtilization()],
      })
    );

    const alb5xxMetric = new cloudwatch.Metric({
      namespace: "AWS/ApplicationELB",
      metricName: "HTTPCode_ELB_5XX_Count",
      dimensionsMap: {
        LoadBalancer: fargateService.loadBalancer.loadBalancerFullName,
      },
      statistic: "Sum",
      period: cdk.Duration.minutes(1),
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "ALB 5xx Errors",
        left: [alb5xxMetric],
      })
    );

    const dbConnectionsMetric = new cloudwatch.Metric({
      namespace: "AWS/RDS",
      metricName: "DatabaseConnections",
      dimensionsMap: {
        DBClusterIdentifier: dbCluster.clusterIdentifier,
      },
      statistic: "Average",
      period: cdk.Duration.minutes(1),
    });

    new cloudwatch.Alarm(this, `${stage}-TaskFailureAlarm`, {
      metric: fargateService.service.metric("CPUUtilization"),
      threshold: 90,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    new cloudwatch.Alarm(this, `${stage}-ALB5xxAlarm`, {
      metric: alb5xxMetric,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    new cloudwatch.Alarm(this, `${stage}-DBConnectionAlarm`, {
      metric: dbConnectionsMetric,
      threshold: 80,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
  }
}
