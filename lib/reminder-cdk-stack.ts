import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import path from "path";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ReminderCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'ReminderCdkStackQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
    new s3.Bucket(scope, "Bucket", {
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

    new sqs.Queue(scope, "ReminderQueue", {
      fifo: true,
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      contentBasedDeduplication: true,
    });

    new lambda.Function(this, "CreateReminder", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../src/lambdas/createReminder.ts")
      ),
      environment: {
        REMINDERS_TABLE_NAME: remindersTable.tableName,
      },
    });

    new lambda.Function(this, "SendReminder", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../src/lambdas/sendReminder.ts")
      ),
      environment: {
        REMINDERS_TABLE_NAME: remindersTable.tableName,
      },
    });
  }
}
