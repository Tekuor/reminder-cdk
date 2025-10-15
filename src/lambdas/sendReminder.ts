import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.REGION });
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
exports.handler = async (event: any) => {
  const item = await docClient.send(
    new GetCommand({
      TableName: process.env.REMINDERS_TABLE_NAME,
      Key: {
        id: event.reminderId,
      },
    })
  );

  const params = {
    Source: process.env.SENDER_EMAIL,
    Destination: {
      ToAddresses: [item.Item?.email],
    },
    Message: {
      Subject: { Data: item.Item?.title },
      Body: {
        Text: { Data: item.Item?.description },
      },
    },
  };
  try {
    await ses.send(new SendEmailCommand(params));
    console.log(`✅ Email sent to ${item.Item?.email}`);
    return;
  } catch (err) {
    console.error("❌ Error sending email:", err);
    return;
  }
};
