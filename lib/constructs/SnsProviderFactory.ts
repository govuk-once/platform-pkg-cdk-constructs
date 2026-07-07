import { Construct } from 'constructs';
import { INamingProvider } from './namingProviders/INamingProvider';
import { FactoryBase } from './FactoryBase';
import { KmsKeyFactory } from './KmsKeyFactory';
import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface ISnsEmailProviderProps {
  topicName: string;
  displayName?: string;

  emailAddresses: string[];

  enableEncryption?: boolean;
  encryptionKey?: kms.IKey;

  removalPolicy?: cdk.RemovalPolicy;
  publisherLambda?: lambda.IFunction;
}

export interface ISnsEmailProvider {
  topic: sns.Topic;
  encryptionKey?: kms.IKey;
}

export class SnsProviderFactory extends FactoryBase {
  constructor(
    scope: Construct,
    serviceName: string,
    protected keyFactory: KmsKeyFactory,
    namingProvider?: INamingProvider,
  ) {
    super(scope, serviceName, namingProvider);
  }

  public createEmailProvider(
    id: string,
    props: ISnsEmailProviderProps,
  ): ISnsEmailProvider {
    let encryptionKey: kms.IKey | undefined;

    if (props.enableEncryption ?? true) {
      encryptionKey =
        props.encryptionKey ??
        this.keyFactory?.createKey(`${id}-key`, {
          alias: `${props.topicName}-key`,
          description: `KMS key for topic ${props.topicName}`,
          removalPolicy: props.removalPolicy,
        }).key;
    }

    const topic = new sns.Topic(
      this.getScope(),
      `${this.getResourceId(id)}-topic`,
      {
        topicName: props.topicName,
        displayName: props.displayName ?? props.topicName,
        masterKey: encryptionKey,
      },
    );

    props.emailAddresses.forEach((emailAddress) => {
      topic.addSubscription(new subscriptions.EmailSubscription(emailAddress));
    });

    if (props.publisherLambda) {
      topic.grantPublish(props.publisherLambda);
    }

    topic.applyRemovalPolicy(props.removalPolicy ?? cdk.RemovalPolicy.RETAIN);

    return { topic, encryptionKey };
  }
}
