import * as lambda from "aws-cdk-lib/aws-lambda";

export default {
  runtime: lambda.Runtime.NODEJS_24_X,
  handler: "index.handler",
};
