import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import { LambdaFactory } from '../../../lib/constructs/index';

export class TestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a KMS key for the Lambda function
    const lambdaKey = new kms.Key(this, 'TestLambdaKey', {
      description: 'Key for test Lambda function',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Not for production!
    });

    // Create a Lambda function using LambdaFactory
    const lambdaFactory = new LambdaFactory(this, 'test-service');

    const testLambda = lambdaFactory.createLambda('TestLambda', {
      duration: 30, // 30 seconds
      name: 'test-function',
      key: lambdaKey,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async () => {
          return { statusCode: 200, body: 'Hello World' };
        };
      `)
    });

    // Output the Lambda function ARN
    new cdk.CfnOutput(this, 'TestLambdaArn', {
      value: testLambda.functionArn
    });
  }
}