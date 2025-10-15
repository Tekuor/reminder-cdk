import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  SchedulerClient,
  CreateScheduleCommand,
} from "@aws-sdk/client-scheduler";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3 = new S3Client({});
const schedulerClient = new SchedulerClient({});

exports.handler = async (event: APIGatewayProxyEvent) => {
  const body = JSON.parse(event.body || "{}");
  const { description, title, dueDate, email, hasFile } = body;

  if (!title || !description || !dueDate || !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing fields" }),
    };
  }

  const id = ulid();
  await docClient.send(
    new PutCommand({
      TableName: process.env.REMINDERS_TABLE_NAME,
      Item: {
        id,
        title,
        description,
        dueDate,
        email,
      },
    })
  );

  let uploadUrl;
  if (hasFile) {
    uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: id }),
      { expiresIn: 3600 }
    );
  }

  await schedulerClient.send(
    new CreateScheduleCommand({
      Name: `reminder-${id}`,
      ScheduleExpression: `at(${
        new Date(dueDate).toISOString().split(".")[0]
      })`,
      Target: {
        Arn: process.env.SEND_REMINDER_LAMBDA_ARN,
        RoleArn: process.env.SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({ reminderId: id }),
      },
      FlexibleTimeWindow: {
        Mode: "OFF",
      },
    })
  );

  return {
    body: JSON.stringify({ id, uploadUrl }),
    statusCode: 200,
  };
};
