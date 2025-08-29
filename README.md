# Serverless Energy Usage Application

This project is a full-stack serverless application for uploading, processing, and analyzing energy usage data. It leverages AWS Serverless Application Model (SAM) to define and deploy backend resources, and includes a React-based frontend for user interaction. For local testing and development, the project uses [LocalStack](https://github.com/localstack/localstack) to emulate AWS services such as S3 and DynamoDB.

---

## Project Structure

- **/backend/src**: Lambda function source code for processing uploads and interacting with AWS services.
- **/frontend/src**: React frontend code for uploading CSV files and displaying results.
- **template.yaml**: AWS SAM template defining Lambda, API Gateway, S3, DynamoDB, and other resources.
- **README.md**: Project documentation and setup instructions.

---

## Features

- **CSV Upload**: Users can upload energy usage CSV files via the web interface.
- **Serverless Processing**: Uploaded files are processed by a Lambda function, which parses the CSV and stores records in DynamoDB.
- **Threshold Analysis**: The backend identifies records exceeding a user-specified usage threshold.
- **S3 Storage**: Uploaded files can be stored in an S3 bucket.
- **API Gateway**: Provides a RESTful API for frontend-backend communication.
- **CORS Support**: Configured for browser-based access.
- **CloudWatch Logging**: All Lambda logs are sent to CloudWatch for monitoring and debugging.

---

## Prerequisites

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [Node.js 22+](https://nodejs.org/en/)
- [Docker](https://www.docker.com/)
- [LocalStack](https://github.com/localstack/localstack)
- [LocalStack AWS CLI (awslocal)](https://docs.localstack.cloud/aws/integrations/aws-native-tools/aws-cli/#localstack-aws-cli-awslocal)

---

## Steps to run locally

```bash
1. Run Docker Desktop app

2. Open terminal 

3. localstack start

4. awslocal dynamodb create-table --table-name EnergyUsage --key-schema AttributeName=id,KeyType=HASH --attribute-definitions AttributeName=id,AttributeType=S --billing-mode PAY_PER_REQUEST --region us-west-2

5. awslocal s3api create-bucket --bucket put-usage-bucket --region us-west-2 --create-bucket-configuration LocationConstraint=us-west-2

6. Open new terminal tab

7. cd backend

8. npm install

9. cd ../

10. sam build

11. sam local start-api

12. Open new terminal tab 

13. cd frontend

14. npm install

15. npm start

16. In the browser input usage and upload energyUsage.csv

17. Open new terminal tab

18. awslocal s3api list-objects --bucket put-usage-bucket

19. awslocal dynamodb scan --table-name EnergyUsage --region us-west-2
