import { App, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { describe, test } from "vitest";

import * as sqs from "aws-cdk-lib/aws-sqs";

import { EventBusFactory } from "./EventBusFactory.js";

describe("EventBusFactory tests", () => {
  test("Should Create an EventBridge Bus", () => {
    const app = new App();
    const stack = new Stack(app, "TestStack");

    const factory = new EventBusFactory(stack, "test service");
    const busName = "applebus";

    factory.createEventBus("testEventBus", {
      eventBusName: busName,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Events::EventBus", {
      Name: busName,
    });
  });

  test("Should add a SQS Queue as a source using event bus pipes", () => {
    const app = new App();
    const stack = new Stack(app, "testStack");
    const queueName = "testQueue";

    const queue = new sqs.Queue(stack, "sourceStack", {
      queueName: queueName,
    });

    const busName = "pearbus";

    const factory = new EventBusFactory(stack, "test service");
    const bus = factory.createEventBus("testEventBus", {
      eventBusName: busName,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    factory.addSqsAsSource(`${queueName}-source`, {
      eventbus: bus.eventBus,
      queue: queue,
      detailType: "mailbox",
      source: "mailbox events",
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::Pipes::Pipe", 1);

    template.hasResourceProperties("AWS::Pipes::Pipe", {
      Source: {
        "Fn::GetAtt": [Match.stringLikeRegexp("sourceStack.*"), "Arn"],
      },
      TargetParameters: {
        EventBridgeEventBusParameters: {
          DetailType: "mailbox",
          Source: "mailbox events",
        },
        InputTemplate: "<$.body>",
      },
    });
  });

  test("should use default sqs pipe values when values not supplied", () => {
    const app = new App();
    const stack = new Stack(app, "testStack");
    const queueName = "default queue";

    const queue = new sqs.Queue(stack, "sourceStack", {
      queueName: queueName,
    });

    const busName = "defualt-event-bus";

    const factory = new EventBusFactory(stack, "test service");
    const bus = factory.createEventBus("testEventBus", {
      eventBusName: busName,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    factory.addSqsAsSource(`${queueName}-source`, {
      eventbus: bus.eventBus,
      queue: queue,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Pipes::Pipe", {
      SourceParameters: {
        SqsQueueParameters: {
          BatchSize: 10,
          MaximumBatchingWindowInSeconds: 0,
        },
      },
      TargetParameters: {
        EventBridgeEventBusParameters: {
          DetailType: "SqsMessage",
        },
        InputTemplate: "<$.body>",
      },
    });
  });

  test("should set batch and max window when supplied", () => {
    const app = new App();
    const stack = new Stack(app, "testStack");
    const queueName = "default queue";

    const queue = new sqs.Queue(stack, "sourceStack", {
      queueName: queueName,
    });

    const busName = "defualt-event-bus";

    const factory = new EventBusFactory(stack, "test service");
    const bus = factory.createEventBus("testEventBus", {
      eventBusName: busName,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    factory.addSqsAsSource(`${queueName}-source`, {
      eventbus: bus.eventBus,
      queue: queue,
      batchSize: 5,
      maxBatchSizeWindow: Duration.seconds(30),
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Pipes::Pipe", {
      SourceParameters: {
        SqsQueueParameters: {
          BatchSize: 5,
          MaximumBatchingWindowInSeconds: 30,
        },
      },
    });
  });

  test("Should create role for to be assumed", () => {
    const app = new App();
    const stack = new Stack(app, "testStack");
    const queueName = "default queue";

    const queue = new sqs.Queue(stack, "sourceStack", {
      queueName: queueName,
    });

    const busName = "defualt-event-bus";

    const factory = new EventBusFactory(stack, "test service");
    const bus = factory.createEventBus("testEventBus", {
      eventBusName: busName,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    factory.addSqsAsSource(`${queueName}-source`, {
      eventbus: bus.eventBus,
      queue: queue,
      batchSize: 5,
      maxBatchSizeWindow: Duration.seconds(30),
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "sts:AssumeRole",
            Principal: {
              Service: "pipes.amazonaws.com",
            },
          }),
        ]),
      },
    });
  });
});
