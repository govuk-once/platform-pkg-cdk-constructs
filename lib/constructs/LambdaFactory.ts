import { KmsKeyFactory } from "./KmsKeyFactory.js";
import { Construct } from "constructs";
import { ILambdaRoute } from "./types/ILambdaRoute.js";
import { FactoryBase } from "./FactoryBase.js";
import { INamingProvider } from "./namingProviders/INamingProvider.js";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";


class constants {
  static readonly MEMORY_SIZE: number = 256;
  static readonly DURATION: number = 10;
  static readonly METHODS: string[] = ["get"];
  static readonly PATH_ERROR: string = "PATH NOT SET";
  static readonly RETENTION_DAYS: logs.RetentionDays.TWO_WEEKS;
}

/**
 * Defines additional properties to the lambda.FunctionProps
 *
 * @param duration - required set maximum run time for the lambda in seconds
 * @param methods - optional set the http verbs to be used when routing via a restful apigateway
 * @param name - the name of the function.  the system will ensure the function name is configured for the environment in which it is deployed
 * @param path - optional sets the path for the restful apigateway
 * @param retentionDays - optional sets the number of day logs will be stored in cloudwatch
 */
export interface ILambdaProperties extends lambda.FunctionProps {
  duration: number;
  key: cdk.aws_kms.Key;
  methods?: string[];
  name: string;
  path?: string;
  retentionDays?: logs.RetentionDays;
  skipCheckovRule?: string;
}

export interface IEnvironmentVariable {
  name: string;
  value: string;
}

export interface IScheduledTime {
  hour: number;
  minute: number;
}

export interface IScheduledLambdaProps extends ILambdaProperties {
  cronName: string;

  /** Use either interval or specific times  not both*/
  interval?: cdk.Duration;
  specificTimes?: IScheduledTime[];
}

export interface IScheduledLambdaProps extends ILambdaProperties {
  cronName: string;

  /** Use either interval or specific times  not both*/
  interval?: cdk.Duration;
  specificTimes?: IScheduledTime[];
}

export interface ISqsLambdaProps extends ILambdaProperties {
  queueName: string;
  visibilityTimeout: cdk.Duration;
  retentionPeriod: cdk.Duration;
  fifo?: boolean;
  enableEncryption: boolean;
  encryptionKey?: kms.IKey;
  enableQueueTrigger?: boolean;
  batchSize?: number;
  maxBatchingWindow?: cdk.Duration;
}

export interface IScheduledLambda {
  lambda: lambda.IFunction;
  rules: events.Rule[];
}

export interface ISqsProcessingLambda {
  lambda: lambda.IFunction;
  queue: sqs.Queue;
}

/**
 * create a basic lambda configured as required to work with an routing apigateway or a stand alone lambda
 * @param scope - the stack scope which is associated with the building of the gateway
 */
export class LambdaFactory extends FactoryBase {
  kmsKeyFactory: KmsKeyFactory;
  constructor(
    scope: Construct,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    super(scope, serviceName, namingProvider);
    this.kmsKeyFactory = new KmsKeyFactory(scope, serviceName, namingProvider);
  }

  /**
   * Create a lambda function and its associated log group
   * @param id - a unique identifier for the lambda with in the cdk scope
   * @param props - configuration setting for the lambda see {!ILambdaProperties}
   * @returns A lambda function
   */
  public createLambda(id: string, props: ILambdaProperties): lambda.Function {
    const namedProps = { ...props };
    namedProps.functionName = `${this.getResourceName(props.name)}`;
    namedProps.timeout = cdk.Duration.seconds(props.duration);

    const log = new logs.LogGroup(
      this.getScope(),
      `${this.getResourceId(id)}-LogGroup`,
      {
        logGroupName: `/aws/lambda/${this.getResourceName(namedProps.functionName)}`,
        retention: props.retentionDays
          ? props.retentionDays
          : constants.RETENTION_DAYS,
        encryptionKey: props.key,
        removalPolicy: this.getRemovalPolicy(),
      },
    );

    namedProps.logGroup = log;

    const newFunction = new lambda.Function(
      this.getScope(),
      this.getResourceId(id),
      namedProps,
    );

    return newFunction;
  }

  public createSQSTriggeredLambda(
    id: string,
    props: ISqsLambdaProps,
  ): ISqsProcessingLambda {
    const lambdaFunction = this.createLambda(id, props);

    let encryptionKey: kms.IKey | undefined;

    if (props.enableEncryption) {
      encryptionKey =
        props.encryptionKey ??
        this.kmsKeyFactory.createKey(`${id}-LambdalogKey`, {
          alias: `${props.queueName}-key`,
          description: "KMS Key to secure the queue",
        }).key;
    }

    const queue = new sqs.Queue(this.getScope(), this.getResourceName(id), {
      queueName: this.getResourceName(props.queueName),
      visibilityTimeout: cdk.Duration.seconds(
        props.visibilityTimeout.toSeconds() > props.duration * 6
          ? props.visibilityTimeout.toSeconds()
          : props.duration * 6,
      ),
      retentionPeriod: props.retentionPeriod,
      fifo: props.fifo ?? false,
      ...(props.enableEncryption && encryptionKey
        ? {
            encryption: sqs.QueueEncryption.KMS,
            encryptionMasterKey: encryptionKey,
          }
        : {}),
    });

    if (encryptionKey) {
      encryptionKey.grant(lambdaFunction, "kms:GenerateDataKey", "kms:Decrypt");
    }

    if (props.enableQueueTrigger ?? true) {
      lambdaFunction.addEventSource(
        new lambdaEventSources.SqsEventSource(queue, {
          batchSize: props.batchSize ?? 10,
          maxBatchingWindow: props.maxBatchingWindow,
          reportBatchItemFailures: true,
        }),
      );
      queue.grantConsumeMessages(lambdaFunction);
    }

    return {
      lambda: lambdaFunction,
      queue,
    };
  }

  public createScheduledLambda(
    id: string,
    props: IScheduledLambdaProps,
  ): IScheduledLambda {
    if (!!props.interval === !!props.specificTimes) {
      throw new Error(
        "Invalid properties supply either interval or specificTimes not both",
      );
    }

    const lambdaFunction = this.createLambda(id, props);
    const rules: events.Rule[] = [];

    if (props.interval) {
      const rule = new events.Rule(this.getScope(), `${id}ScheduleRule`, {
        ruleName: props.cronName,
        schedule: events.Schedule.rate(props.interval),
      });

      rule.addTarget(new targets.LambdaFunction(lambdaFunction));
      rules.push(rule);
    }

    props.specificTimes?.forEach((time) => {
      const rule = new events.Rule(
        this.getScope(),
        `${id}ScheduleRule${time.hour}${time.minute}`,
        {
          ruleName:
            props.specificTimes!.length === 1
              ? props.cronName
              : `${props.cronName}-${time.hour}${time.minute}}`,
          schedule: events.Schedule.cron({
            hour: `${time.hour}`,
            minute: `${time.minute}`,
          }),
        },
      );

      rule.addTarget(new targets.LambdaFunction(lambdaFunction));
      rules.push(rule);
    });

    return {
      lambda: lambdaFunction,
      rules,
    };
  }

  /**
   * Create a lambda function and its associated log group
   * @param id - a unique identifier for the lambda with in the cdk scope
   * @param props - configuration setting for the lambda see {!ILambdaProperties}
   * @returns A ILambdaRoute with the path and methods configured as defined i the props
   */
  public createLambdaWithApiRoute(
    id: string,
    props: ILambdaProperties,
  ): ILambdaRoute {
    return {
      path: props.path ? props.path : constants.PATH_ERROR,
      methods: props.methods ? props.methods : constants.METHODS,
      lambda: this.createLambda(id, props),
      skipCheckovRule: props.skipCheckovRule,
    };
  }

  public addEnvironmentVariable(
    fn: lambda.IFunction,
    variable: IEnvironmentVariable,
  ): void {
    if (this.isLambdaFunction(fn))
      (fn as lambda.Function).addEnvironment(variable.name, variable.value);
  }

  public addEnvironmentVariables(
    fn: lambda.IFunction,
    variables: IEnvironmentVariable[],
  ): void {
    if (this.isLambdaFunction(fn))
      variables.forEach((en) =>
        (fn as lambda.Function).addEnvironment(en.name, en.value),
      );
  }

  private isLambdaFunction = (fn: lambda.IFunction): boolean => {
    return fn instanceof lambda.Function;
  };
}

export default LambdaFactory;
