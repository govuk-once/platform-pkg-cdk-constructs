# Lambda Factory

## Description

Creates Lambda functions with integrated CloudWatch Log Groups. It uses a naming provider to ensure function names and log groups are standardized for the environment in which they are deployed. The factory provides helper methods to prepare functions for use with API Gateway routing and simplifies environment variable management.

## Constructor

The constructor has three parameters:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| scope | Construct | The stack scope associated with the resource building | YES |
| serviceName | String | The name of the service which this resource is a part of | YES |
| namingProvider | INamingProvider | Creates a standardized pre-fix for identifiers and names | NO |

**Returns**: LambdaFactory

---

## Methods

### createLambda

Creates a basic Lambda function and its associated encrypted Log Group.

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| id | String | A unique identifier for the lambda within the CDK scope | YES |
| props | [ILambdaProperties](#ILambdaProperties) | Configuration settings for the lambda | YES |

**Returns**: lambda.Function

### createLambdaWithApiRoute

Creates a Lambda function and returns it wrapped in an `ILambdaRoute` object, making it ready for use with the ApiGatewayFactory.

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| id | String | A unique identifier for the lambda within the CDK scope | YES |
| props | [ILambdaProperties](#ILambdaProperties) | Configuration settings including path and methods | YES |

**Returns**: ILambdaRoute

### addEnvironmentVariable

Adds a single environment variable to an existing Lambda function.

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| fn | lambda.IFunction | The function to modify | YES |
| variable | [IEnvironmentVariable](#IEnvironmentVariable) | The name and value to add | YES |

**Returns**: void

---

## Properties

### ILambdaProperties

Extends `lambda.FunctionProps` with additional requirements for logging and routing:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| duration | Number | Maximum run time for the lambda in seconds | YES |
| key | cdk.aws_kms.Key | KMS key used to encrypt the associated Log Group | YES |
| name | String | The name of the function (will be prefixed by provider) | YES |
| methods | string[] | HTTP verbs for API Gateway routing (Defaults to 'get') | NO |
| path | String | The URL path for the API Gateway | NO |
| retentionDays | logs.RetentionDays | Log storage duration (Defaults to Two Weeks) | NO |
| skipCheckovRule | String | A Checkov security rule to be ignored | NO |

### IEnvironmentVariable

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| name | String | The key for the environment variable | YES |
| value | String | The value for the environment variable | YES |

---

## Example

### Create a Lambda with an API Route

```typescript
import { App, Stack, aws_kms, aws_lambda as lambda } from "aws-cdk-lib";
import { LambdaFactory } from "./factories/LambdaFactory";

const app = new App();
const stack = new Stack(app, "LambdaStack");
const factory = new LambdaFactory(stack, "OrderService");

const orderLambda = factory.createLambdaWithApiRoute("GetOrders", {
  name: "GetOrdersFunction",
  runtime: lambda.Runtime.NODEJS_LATEST,
  handler: "index.handler",
  code: lambda
  ```
  ## Known Issues