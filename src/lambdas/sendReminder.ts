import { APIGatewayProxyEvent } from "aws-lambda";
// import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

// const client = new DynamoDBClient({});
exports.handler = async (event: APIGatewayProxyEvent) => {
  const body = JSON.parse(event.body || "{}");
  const response = body;

  return {
    body: JSON.stringify(response),
    statusCode: 200,
  };
};
