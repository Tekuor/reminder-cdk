# Reminder CDK Stack

This project sets up a small **serverless reminder system** that lets users add reminders, upload files, and receive email notifications at scheduled times.  
It’s built using **AWS CDK**, **Lambda**, **DynamoDB**, **S3**, and **SES**.

---

## Resources

| Resource                  | Purpose                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **S3 Bucket**             | Stores uploaded files securely.                                                                |
| **DynamoDB Table**        | Stores reminder details such as title, description, due date, and file information.            |
| **CreateReminder Lambda** | Creates reminders, saves it in DynamoDB, and schedules email notifications.                    |
| **SendReminder Lambda**   | Sends reminder emails through Amazon SES.                                                      |
| **ProcessUploads Lambda** | Runs when a file is uploaded and updates the reminder in DynamoDB.                             |
| **Scheduler Role**        | Grants EventBridge Scheduler permission to invoke the SendReminder Lambda at the correct time. |

---

# How to Deploy

## Prerequisites

- Node.js 18+
- AWS CDK installed globally
  ```bash
  npm install -g aws-cdk
  ```

## Steps

1. npm install
2. cdk bootstrap --profile awsprofile (first time only)
3. npm run deploy
   After deployment, you’ll see a Function URL for the CreateReminder Lambda in the terminal. Use it to add new reminders.

## Create a Reminder

```
POST https://create-reminder-function-url.on.aws/
Content-Type: application/json

{
  "title": "Hair Stylist Appointment",
  "description": "Wash and styl hair",
  "dueDate": "2025-10-16T08:00:00Z",
  "email": "me@gmail.com"
}

```
