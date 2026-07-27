import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as pipes from "aws-cdk-lib/aws-pipes";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { INamingProvider } from "./namingProviders/INamingProvider.js";
import { FactoryBase } from "./FactoryBase.js";

export interface IEventBusFactoryProps {
  eventBusName: string;
  removalPolicy: RemovalPolicy;
}

export interface IEventBusFactoryResult {
  eventBus: events.EventBus;
}

export interface IAddSqsSourceProps {
  eventbus: events.EventBus;
  queue: sqs.IQueue;

  batchSize?: number;
  maxBatchSizeWindow?: Duration;
  detailType?: string;
  source?: string;
}

export interface IAddSqsSourceResult {
  pipe: pipes.CfnPipe;
  role: iam.Role;
}

export class EventBusFactory extends FactoryBase {
  constructor(
    scope: Construct,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    super(scope, serviceName, namingProvider);
  }

  public createEventBus(
    id: string,
    props: IEventBusFactoryProps,
  ): IEventBusFactoryResult {
    const eventBus: events.EventBus = new events.EventBus(
      this.getScope(),
      this.getResourceId(id),
      {
        eventBusName: props.eventBusName,
      },
    );

    eventBus.applyRemovalPolicy(this.getRemovalPolicy(props.removalPolicy));

    return { eventBus };
  }

  public addSqsAsSource(id: string, props: IAddSqsSourceProps) {
    const pipeRole = new iam.Role(this.getScope(), this.getResourceId(id), {
      assumedBy: new iam.ServicePrincipal("pipes.amazonaws.com"),
    });

    props.queue.grantConsumeMessages(pipeRole);
    props.eventbus.grantPutEventsTo(pipeRole);

    const pipe = new pipes.CfnPipe(
      this.getScope(),
      this.getResourceId(`${id}-pipe`),
      {
        name: this.getPipeName(props.queue),
        roleArn: pipeRole.roleArn,
        source: props.queue.queueArn,
        target: props.eventbus.eventBusArn,

        sourceParameters: {
          sqsQueueParameters: {
            batchSize: props.batchSize ?? 10,
            maximumBatchingWindowInSeconds:
              props.maxBatchSizeWindow?.toSeconds() ?? 0,
          },
        },

        targetParameters: {
          eventBridgeEventBusParameters: {
            detailType: props.detailType ?? "SqsMessage",
            source: props.source ?? props.queue.queueName,
          },
          inputTemplate: "<$.body>",
        },
      },
    );

    return {
      pipe,
      role: pipeRole,
    };
  }

  private getPipeName(queue: sqs.IQueue): string {
    return this.getResourceName(`${queue.queueName}-eventbus-pipe`);
  }
}
