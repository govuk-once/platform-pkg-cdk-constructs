import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as kms from "aws-cdk-lib/aws-kms";

import { FactoryBase } from "./FactoryBase.js";
import { INamingProvider } from "./namingProviders/INamingProvider.js";

export interface SqsQueueFactoryProps {
  queueName: string;
  fifo?: boolean;

  visibilityTimeout?: Duration;
  retentionPeriod?: Duration;

  enableEncryption?: boolean;
  encryptionKey?: kms.IKey;

  deadLetterQueue?: sqs.IQueue;
  maxReceiveCount?: number;

  removalPolicy?: RemovalPolicy;
}

export interface SqsQueueFactoryResult {
  queue: sqs.Queue;
  encryptionKey?: kms.IKey;
}

export class SqsQueueFactory extends FactoryBase {
  constructor(
    scope: Construct,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    super(scope, serviceName, namingProvider);
  }

  public createQueue(
    id: string,
    props: SqsQueueFactoryProps,
  ): SqsQueueFactoryResult {
    const queueName = this.getResourceName(props.queueName, 80);

    const queue = new sqs.Queue(this.scope, id, {
      queueName,
      fifo: props.fifo ?? false,

      visibilityTimeout: props.visibilityTimeout ?? Duration.seconds(60),

      retentionPeriod: props.retentionPeriod ?? Duration.days(4),

      encryption:
        props.enableEncryption === false
          ? sqs.QueueEncryption.UNENCRYPTED
          : props.encryptionKey
            ? sqs.QueueEncryption.KMS
            : sqs.QueueEncryption.KMS_MANAGED,

      encryptionMasterKey:
        props.enableEncryption === false ? undefined : props.encryptionKey,

      deadLetterQueue: props.deadLetterQueue
        ? {
            queue: props.deadLetterQueue,
            maxReceiveCount: props.maxReceiveCount ?? 3,
          }
        : undefined,
    });

    queue.applyRemovalPolicy(this.getRemovalPolicy(props.removalPolicy));

    return {
      queue,
      encryptionKey: props.encryptionKey,
    };
  }
}
