import crypto from 'crypto';
import { Readable } from 'stream';
import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"; 
import { Parse } from 'parse-multipart';
import { parse } from 'csv-parse';

const clientCreds = {
  endpoint: 'http://host.docker.internal:4566', 
  region: 'us-west-2', 
  forcePathStyle: true,
  aws_access_key_id: "anything",
  aws_secret_access_key: "anything"
}

function getResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    body: body,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Optional, for CORS
    }
  };
}

function extractBoundaryFromBody(body) {
  // The boundary is after the first two dashes and before the first \r\n
  const match = body.match(/^--([^\r\n]+)/);
  return match ? match[1] : null;
}

function getCSVContent(event) {
  // Extract boundary from body
  const { body, isBase64Encoded } = event;
  const boundary = extractBoundaryFromBody(body);
  if (!boundary) {
    throw new Error('Could not extract boundary from body');
  }

  // Decode body from Buffer & Parse multipart & get file
  const bodyBuffer = Buffer.from(body, isBase64Encoded ? 'base64' : 'utf8');
  const parts = Parse(bodyBuffer, boundary);
  const filePart = parts.find(part => part.filename);
  if (!filePart) {
    throw new Error('CSV file not found in form-data');
  }
  const csvContent = filePart.data.toString('utf8');
  return { csvContent: csvContent, fileName: filePart.filename };
}

async function addToS3Bucket(body, fileName) {
  try {
    const timestamp = new Date().toJSON();
    const nameParts = fileName.split('.');
    const ext = nameParts.pop();
    fileName = `${nameParts.join('.')}_${timestamp}.${ext}`;
    const input = {
      Body: body,
      Bucket: "put-usage-bucket",
      Key: fileName
    };
    const client = new S3Client(clientCreds);
    const command = new PutObjectCommand(input);
    await client.send(command);
  } catch (error) {
    throw new Error(`Error uploading to S3: ${error.message}`);
  }
}

async function batchWriteToDynamoDB(client, batch, errorMessages) {
  try {
    const command = new BatchWriteItemCommand({
      RequestItems: {
        EnergyUsage: batch
      }
    })
    await client.send(command);
  } catch (error) {
    errorMessages.push(`Batch write error: ${error}`);
  }
}

/**
 * @function putUsageHandler
 * @param {object} event - API Gateway Lambda event contains usage csv
 * @returns {object} response - returns success or error response
**/
export const putUsageHandler = async (event) => {
  try {
    // All log statements are written to CloudWatch LogGroupName PutUsage
    console.info('received:', event);

    // Get CSV content from event body and add to S3 bucket
    const { csvContent, fileName } = getCSVContent(event);
    await addToS3Bucket(csvContent, fileName);

    // create DynamoDB client & responses
    const client = new DynamoDBClient(clientCreds);

    // Create response body arrays
    const threshold = Number(event.pathParameters.threshold);
    const thresholdExceeded = [];
    const errorMessages = [];

    //create a CSV parser readable stream
    const parser = parse({
      columns: true,
      delimiter: ','
    });
    const readableStream = Readable.from([csvContent]);
    readableStream.pipe(parser);

    let batch = [];
    const batchSize = 25;

    for await (const record of parser) {
      // Validate if record exceeds threshold
      if (parseFloat(record.Usage) > threshold) {
        thresholdExceeded.push({
          date: record.Date,
          usage: record.Usage
        });
      }

      // Adding records for DynamoDB
      batch.push({
        PutRequest: {
          Item: {
            date: { S: record.Date },
            usage: { N: record.Usage },
            userId: { S: "demo-user" },
            id: { S: crypto.randomUUID() }
          }
        }
      });

      if (batch.length === batchSize) {
        try {
          await batchWriteToDynamoDB(client, batch, errorMessages)
        } catch (error) {
          console.error(`Batch write error: ${error}`);
        }
        batch = [];
      }
    }

    if (batch.length > 0) {
      try {
        await batchWriteToDynamoDB(client, batch, errorMessages)
      } catch (error) {
        console.error(`Batch write error: ${error}`);
      }
    }
    
    console.log('threshold exceeded:', thresholdExceeded);
    console.log('error messages:', errorMessages);

    const statusCode = errorMessages.length ? 400 : 200;
    const body = JSON.stringify({
      thresholdExceeded,
      errorMessages,
      message: errorMessages.length ? "File processed with errors" : "File processed successfully"
    })
    
    console.info(`response from: ${event.path} statusCode: ${statusCode} body: ${body}`);
    const response = getResponse(statusCode, body);
    return response;
  } catch (error) {
    const errorMessage = `Unexpected error processing request: ${error.message}`;
    const body = JSON.stringify({ errorMessages: [errorMessage] });
    console.error(errorMessage);
    return getResponse(400, body);
  }
};
