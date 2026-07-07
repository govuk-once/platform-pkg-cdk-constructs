import { describe, test, expect } from 'vitest';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as keys from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';

import { StandardServiceDashboardFactory } from './StandardServiceDashboard';
import { ApiGatewayFactory } from './ApiGatewayFactory';

const serviceName = 'dashboardService';
const env = (process.env.ENVIRONMENT ?? process.env.USER ?? 'unkown').replace(
  /[^a-zA-Z0-9-]/g,
  '',
);

const preFix = `${env}-${serviceName}`.toLowerCase();

/* eslint-disable @typescript-eslint/no-explicit-any */
const getDashboardBody = (template: Template): any => {
  const dashboards = template.findResources('AWS::CloudWatch::Dashboard');
  const first = Object.values(dashboards)[0] as any;
  return JSON.stringify(first.Properties.DashboardBody);
};

const expectAllConatined = (source: string, expected: string[]): void => {
  expected.forEach((testItem) => expect(source).toContain(testItem));
};

describe(' Standard Dashboard', () => {
  test('creates a dashboard with the provided name', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const factory = new StandardServiceDashboardFactory(stack, serviceName);

    factory.createDashboard('testDash', {
      name: 'myDash',
      restApis: [],
      lambdas: [],
      tables: [],
      widgetWidth: 12,
      widgetHeight: 6,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: `${preFix}-myDash`,
      DashboardBody: Match.anyValue(),
    });
  });

  test('creates a dashboard with an api gateway', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const logKey = new keys.Key(stack, 'testKeyOne');

    const apiFactory = new ApiGatewayFactory(stack, serviceName);
    const api1 = apiFactory.createApiGatewayRouter('apiOne', {
      cacheDurationMinutes: 10,
      description: 'Test api one',
      key: logKey,
      name: 'testApiOne',
    });

    const api2 = apiFactory.createApiGatewayRouter('apiTwo', {
      cacheDurationMinutes: 10,
      description: 'Test api Two',
      key: logKey,
      name: 'testApiTwo',
    });

    const fn = new lambda.Function(stack, 'testfunc', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok"})',
      ),
    });

    const lambdaRoute = {
      path: '/fred',
      methods: ['GET'],
      lambda: fn,
    };

    apiFactory.addRoute(lambdaRoute, api1);
    apiFactory.addRoute(lambdaRoute, api2);

    const factory = new StandardServiceDashboardFactory(stack, serviceName);

    factory.createDashboard('testDash', {
      name: 'myDash',
      restApis: [api1, api2],
      lambdas: [],
      tables: [],
      widgetWidth: 12,
      widgetHeight: 6,
    });

    const template = Template.fromStack(stack);
    const dashBody = getDashboardBody(template);

    expectAllConatined(dashBody, [
      `${preFix}-testApiOne - Requests and Latency`,
      `${preFix}-testApiTwo - Requests and Latency`,
      `${preFix}-testApiOne - 4xx / 5xx Errors`,
      `${preFix}-testApiTwo - 4xx / 5xx Errors`,
    ]);

    expectAllConatined(dashBody, [
      'AWS/ApiGateway',
      'Count',
      'Latency',
      '4XXError',
      '5XXError',
    ]);
  });

  test('creates a dashboard with an lambda', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const fnOne = new lambda.Function(stack, 'testfuncOne', {
      functionName: 'fnOne',
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok"})',
      ),
    });

    const fnTwo = new lambda.Function(stack, 'testfuncTwo', {
      functionName: 'fnTwo',
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok"})',
      ),
    });

    const factory = new StandardServiceDashboardFactory(stack, serviceName);

    factory.createDashboard('testDash', {
      name: 'myDash',
      restApis: [],
      lambdas: [fnOne, fnTwo],
      tables: [],
      widgetWidth: 12,
      widgetHeight: 6,
    });

    const template = Template.fromStack(stack);
    const dashBody = getDashboardBody(template);

    expectAllConatined(dashBody, [
      'Invocations and Durations',
      'Errors and Throttles',
      'testfuncOne',
      'testfuncTwo',
    ]);

    expectAllConatined(dashBody, [
      'AWS/Lambda',
      'Invocations',
      'Errors',
      'Throttles',
      'Duration',
    ]);
  });

  test('creates a dashboard with an Dynamo', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const tableOne = new dynamo.Table(stack, 'TableOne', {
      tableName: 'tableOne',
      partitionKey: { name: 'pk', type: dynamo.AttributeType.STRING },
    });

    const tableTwo = new dynamo.Table(stack, 'TableTwo', {
      tableName: 'tableTwo',
      partitionKey: { name: 'pk', type: dynamo.AttributeType.STRING },
    });

    const factory = new StandardServiceDashboardFactory(stack, serviceName);

    factory.createDashboard('testDash', {
      name: 'myDash',
      restApis: [],
      lambdas: [],
      tables: [tableOne, tableTwo],
      widgetWidth: 12,
      widgetHeight: 6,
    });

    const template = Template.fromStack(stack);
    const dashBody = getDashboardBody(template);

    expectAllConatined(dashBody, [
      'Consumed RCU / WCU',
      'Throttles',
      'TableOne',
      'TableTwo',
    ]);

    expectAllConatined(dashBody, [
      'AWS/DynamoDB',
      'ConsumedReadCapacityUnits',
      'ConsumedWriteCapacityUnits',
      'Sum of throttled requests across all operations',
    ]);
  });
});
