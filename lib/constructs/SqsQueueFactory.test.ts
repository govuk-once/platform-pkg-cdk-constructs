import { App, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { describe, expect, test } from 'vitest';
import { INamingProvider } from './namingProviders/INamingProvider';
import { ServiceEnvironmentNamingProvider } from './namingProviders/ServiceEnvironmentNamingProvider';

import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from 'aws-cdk-lib/aws-sqs';

import { SqsQueueFactory } from './SqsQueueFactory';

describe('SqsQueueFactory', () => {
  const namingProvder: INamingProvider = new ServiceEnvironmentNamingProvider(
    'test service',
  );

  function createTestFactory(stack: Stack): SqsQueueFactory {
    return new SqsQueueFactory(stack, 'test service');
  }

  test('creates a queue using a supplied queue name', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const factory = createTestFactory(stack);

    const result = factory.createQueue('TestQueue', {
      queueName: 'explicit-queue-name',
      enableEncryption: true,
    });

    expect(result.queue).toBeDefined();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: namingProvder.getResourceName('explicit-queue-name'),
      KmsMasterKeyId: 'alias/aws/sqs',
    });
  });

  test('creates an unencrypted queue when encryption is disabled', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const factory = createTestFactory(stack);

    factory.createQueue('TestQueue', {
      queueName: 'unencrypted-queue',
      enableEncryption: false,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: namingProvder.getResourceName('unencrypted-queue'),
      KmsMasterKeyId: Match.absent(),
    });
  });

  test('uses a customer-managed KMS key when supplied', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const key = new kms.Key(stack, 'QueueKey', {
      enableKeyRotation: true,
    });

    const factory = createTestFactory(stack);

    const result = factory.createQueue('TestQueue', {
      queueName: namingProvder.getResourceName('kms-queue'),
      enableEncryption: true,
      encryptionKey: key,
    });

    expect(result.encryptionKey).toBe(key);

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: namingProvder.getResourceName('kms-queue'),
      KmsMasterKeyId: {
        'Fn::GetAtt': [Match.stringLikeRegexp('QueueKey.*'), 'Arn'],
      },
    });
  });

  test('sets visibility timeout and retention period', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const factory = createTestFactory(stack);

    factory.createQueue('TestQueue', {
      queueName: 'timed-queue',
      visibilityTimeout: Duration.seconds(120),
      retentionPeriod: Duration.days(7),
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: namingProvder.getResourceName('timed-queue'),
      VisibilityTimeout: 120,
      MessageRetentionPeriod: 604800,
    });
  });

  test('creates a FIFO queue', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const factory = createTestFactory(stack);

    factory.createQueue('TestQueue', {
      queueName: 'orders.fifo',
      fifo: true,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: namingProvder.getResourceName('orders.fifo'),
      FifoQueue: true,
    });
  });

  test('configures a dead letter queue', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const deadLetterQueue = new sqs.Queue(stack, 'DeadLetterQueue', {
      queueName: 'dead-letter-queue',
    });

    const factory = createTestFactory(stack);

    factory.createQueue('MainQueue', {
      queueName: namingProvder.getResourceName('main-queue'),
      deadLetterQueue,
      maxReceiveCount: 5,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: namingProvder.getResourceName('main-queue'),
      RedrivePolicy: {
        deadLetterTargetArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('DeadLetterQueue.*'), 'Arn'],
        },
        maxReceiveCount: 5,
      },
    });
  });

  test('defaults maxReceiveCount to 3 when dead letter queue is supplied', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const deadLetterQueue = new sqs.Queue(stack, 'DeadLetterQueue', {
      queueName: namingProvder.getResourceName('dead-letter-queue'),
    });

    const factory = createTestFactory(stack);

    factory.createQueue('MainQueue', {
      queueName: namingProvder.getResourceName('main-queue'),
      deadLetterQueue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: namingProvder.getResourceName('main-queue'),
      RedrivePolicy: {
        deadLetterTargetArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('DeadLetterQueue.*'), 'Arn'],
        },
        maxReceiveCount: 3,
      },
    });
  });

  test('applies the supplied removal policy', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const factory = createTestFactory(stack);

    factory.createQueue('TestQueue', {
      queueName: namingProvder.getResourceName('destroy-queue'),
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const template = Template.fromStack(stack);

    template.hasResource('AWS::SQS::Queue', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });
});
