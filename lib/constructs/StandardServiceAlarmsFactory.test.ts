import { describe, test } from 'vitest';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as keys from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

import { StandardServiceAlarmsFactory } from './StandardServiceAlarmsFactory';
import { ApiGatewayFactory } from './ApiGatewayFactory';

const serviceName = 'alarmService';

const createApiWithRoute = (
  stack: Stack,
  logKey: keys.Key,
  apiId: string,
  apiName: string,
): apigateway.RestApi => {
  const apiFactory = new ApiGatewayFactory(stack, serviceName);
  const api = apiFactory.createApiGatewayRouter(apiId, {
    cacheDurationMinutes: 10,
    description: `Test ${apiName}`,
    key: logKey,
    name: apiName,
  });

  const fn = new lambda.Function(stack, `${apiId}-handler`, {
    runtime: lambda.Runtime.NODEJS_LATEST,
    handler: 'index.handler',
    code: lambda.Code.fromInline(
      'exports.handler = async () => ({ statusCode: 200, body: "ok" })',
    ),
  });

  api.root.addMethod('GET', new apigateway.LambdaIntegration(fn));
  return api;
};

describe('Standard Service Alarms', () => {
  test('creates API Gateway 5xx error rate alarm with default threshold', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const logKey = new keys.Key(stack, 'testKey');
    const topic = new sns.Topic(stack, 'AlarmTopic');
    const api = createApiWithRoute(stack, logKey, 'testApi', 'testApi');

    const alarmsFactory = new StandardServiceAlarmsFactory(stack, serviceName);

    alarmsFactory.createAlarms('alarms', {
      restApis: [api],
      lambdas: [],
      alarmTopic: topic,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      ComparisonOperator: 'GreaterThanThreshold',
      Threshold: 5,
      EvaluationPeriods: 1,
      TreatMissingData: 'notBreaching',
      Metrics: Match.arrayWith([
        Match.objectLike({
          Expression: '(errors / requests) * 100',
          Label: '5xx Error Rate %',
        }),
      ]),
    });
  });

  test('creates Lambda error rate alarm with default threshold', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const topic = new sns.Topic(stack, 'AlarmTopic');

    const fn = new lambda.Function(stack, 'testFunc', {
      functionName: 'testFunction',
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok" })',
      ),
    });

    const alarmsFactory = new StandardServiceAlarmsFactory(stack, serviceName);

    alarmsFactory.createAlarms('alarms', {
      restApis: [],
      lambdas: [fn],
      alarmTopic: topic,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      ComparisonOperator: 'GreaterThanThreshold',
      Threshold: 1,
      EvaluationPeriods: 1,
      TreatMissingData: 'notBreaching',
      Metrics: Match.arrayWith([
        Match.objectLike({
          Expression: '(errors / invocations) * 100',
          Label: 'Error Rate %',
        }),
      ]),
    });
  });

  test('alarms publish to SNS topic on alarm and OK', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const topic = new sns.Topic(stack, 'AlarmTopic');

    const fn = new lambda.Function(stack, 'testFunc', {
      functionName: 'testFunction',
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok" })',
      ),
    });

    const alarmsFactory = new StandardServiceAlarmsFactory(stack, serviceName);

    alarmsFactory.createAlarms('alarms', {
      restApis: [],
      lambdas: [fn],
      alarmTopic: topic,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmActions: [{ Ref: Match.anyValue() }],
      OKActions: [{ Ref: Match.anyValue() }],
    });
  });

  test('creates alarms for multiple APIs and Lambdas', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const logKey = new keys.Key(stack, 'testKey');
    const topic = new sns.Topic(stack, 'AlarmTopic');

    const api1 = createApiWithRoute(stack, logKey, 'apiOne', 'apiOne');
    const api2 = createApiWithRoute(stack, logKey, 'apiTwo', 'apiTwo');

    const fn1 = new lambda.Function(stack, 'fnOne', {
      functionName: 'fnOne',
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok" })',
      ),
    });

    const fn2 = new lambda.Function(stack, 'fnTwo', {
      functionName: 'fnTwo',
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok" })',
      ),
    });

    const alarmsFactory = new StandardServiceAlarmsFactory(stack, serviceName);

    alarmsFactory.createAlarms('alm', {
      restApis: [api1, api2],
      lambdas: [fn1, fn2],
      alarmTopic: topic,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::CloudWatch::Alarm', 4);
  });

  test('supports custom thresholds and evaluation periods', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const topic = new sns.Topic(stack, 'AlarmTopic');

    const fn = new lambda.Function(stack, 'testFunc', {
      functionName: 'testFunction',
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok" })',
      ),
    });

    const alarmsFactory = new StandardServiceAlarmsFactory(stack, serviceName);

    alarmsFactory.createAlarms('alarms', {
      restApis: [],
      lambdas: [fn],
      alarmTopic: topic,
      lambdaErrorThresholdPercent: 10,
      evaluationPeriodMinutes: 10,
      evaluationPeriods: 3,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Threshold: 10,
      EvaluationPeriods: 3,
    });
  });

  test('API Gateway alarm uses 5-minute evaluation window by default', () => {
    const app = new App();
    const stack = new Stack(app, 'teststack');

    const logKey = new keys.Key(stack, 'testKey');
    const topic = new sns.Topic(stack, 'AlarmTopic');
    const api = createApiWithRoute(stack, logKey, 'testApi', 'testApi');

    const alarmsFactory = new StandardServiceAlarmsFactory(stack, serviceName);

    alarmsFactory.createAlarms('alarms', {
      restApis: [api],
      lambdas: [],
      alarmTopic: topic,
    });

    const template = Template.fromStack(stack);

    // 5-minute default = 300 seconds
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Metrics: Match.arrayWith([
        Match.objectLike({
          MetricStat: Match.objectLike({
            Period: 300,
          }),
        }),
      ]),
    });
  });
});
