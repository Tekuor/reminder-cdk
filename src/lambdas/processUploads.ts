import { S3Event } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const id = record.s3.object.key;
    const fileUrl = `https://${record.s3.bucket.name}.s3.amazonaws.com/${record.s3.object.key}`;
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.REMINDERS_TABLE_NAME,
        Key: {
          id,
        },
        UpdateExpression: "SET fileUrl = :fileUrl",
        ExpressionAttributeValues: {
          ":fileUrl": fileUrl,
        },
      })
    );
  }

  return;
};
