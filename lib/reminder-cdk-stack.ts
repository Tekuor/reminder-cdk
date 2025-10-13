import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ReminderCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    new s3.Bucket(this, "Bucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const remindersTable = new dynamodb.Table(this, "RemindersTable", {
      tableName: "Reminders",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    new sqs.Queue(this, "ReminderQueue", {
      fifo: true,
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      contentBasedDeduplication: true,
    });

    new NodejsFunction(this, "CreateReminder", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      entry: path.join(__dirname, "../src/lambdas/createReminder.ts"),
      bundling: {
        forceDockerBundling: false,
      },
      environment: {
        REMINDERS_TABLE_NAME: remindersTable.tableName,
      },
    });

    new NodejsFunction(this, "SendReminder", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../src/lambdas/sendReminder.ts"),
      bundling: {
        forceDockerBundling: false,
      },
      environment: {
        REMINDERS_TABLE_NAME: remindersTable.tableName,
      },
    });
  }
}
