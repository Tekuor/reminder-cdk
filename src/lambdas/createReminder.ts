import { APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});
exports.handler = async (event: APIGatewayProxyEvent) => {
  const body = JSON.parse(event.body || "{}");
  const { description, title, dueDate } = body;
  const response = await client.send(
    new PutItemCommand({
      TableName: process.env.REMINDERS_TABLE_NAME,
      Item: {
        title,
        description,
        dueDate,
      },
    })
  );

  return {
    body: JSON.stringify(response),
    statusCode: 200,
  };
};
