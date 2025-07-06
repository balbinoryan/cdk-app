import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as path from 'path';

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'TestAppVPC', {
      maxAzs: 2,
    });

    const cluster = new ecs.Cluster(this, 'TestAppCluster', {
      vpc: vpc,
      clusterName: 'testapp-cluster'
    });

    const image = ecs.ContainerImage.fromAsset(
      path.resolve(__dirname, '../../TestApp/TestApp'),
      {
        platform: Platform.LINUX_AMD64,
      } 
    );

    new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'TestAppService', {
      cluster: cluster,
      cpu: 256,
      desiredCount: 1,
      memoryLimitMiB: 512,
      publicLoadBalancer: true,
      taskImageOptions: {
        image: image,
        containerPort: 8000,
      },
    });
  }
}
