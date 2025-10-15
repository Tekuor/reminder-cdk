import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";

export class ReminderCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const remindersTable = new dynamodb.Table(this, "RemindersTable", {
      tableName: "Reminders",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const sendReminderFn = new NodejsFunction(this, "SendReminder", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../src/lambdas/sendReminder.ts"),
      bundling: {
        forceDockerBundling: false,
      },
      environment: {
        REMINDERS_TABLE_NAME: remindersTable.tableName,
        REGION: process.env.AWS_REGION || "",
        SENDER_EMAIL: process.env.SENDER_EMAIL || "",
      },
    });
    remindersTable.grantReadWriteData(sendReminderFn);
    sendReminderFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    const schedulerRole = new iam.Role(this, "SchedulerRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
      description:
        "Role used by EventBridge Scheduler to invoke SendReminder Lambda",
    });
    schedulerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [sendReminderFn.functionArn],
        effect: iam.Effect.ALLOW,
      })
    );

    const createReminderFn = new NodejsFunction(this, "CreateReminder", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      entry: path.join(__dirname, "../src/lambdas/createReminder.ts"),
      bundling: {
        forceDockerBundling: false,
      },
      environment: {
        REMINDERS_TABLE_NAME: remindersTable.tableName,
        UPLOADS_BUCKET_NAME: uploadsBucket.bucketName,
        SEND_REMINDER_LAMBDA_ARN: sendReminderFn.functionArn,
        SCHEDULER_ROLE_ARN: schedulerRole.roleArn,
      },
    });
    const createReminderFnUrl = createReminderFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    remindersTable.grantWriteData(createReminderFn);
    uploadsBucket.grantPut(createReminderFn);
    createReminderFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["scheduler:CreateSchedule", "iam:PassRole"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    const processUploadsFn = new NodejsFunction(this, "ProcessUploads", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../src/lambdas/processUploads.ts"),
      bundling: {
        forceDockerBundling: false,
      },
      environment: {
        REMINDERS_TABLE_NAME: remindersTable.tableName,
      },
    });
    remindersTable.grantWriteData(processUploadsFn);
    uploadsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new LambdaDestination(processUploadsFn)
    );

    new cdk.CfnOutput(this, "CreateReminderFnUrl", {
      value: createReminderFnUrl.url,
    });
  }
}
