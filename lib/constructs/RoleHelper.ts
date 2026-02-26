import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { INamingProvider } from './namingProviders/INamingProvider';
import { ServiceEnvironmentNamingProvider } from './namingProviders/ServiceEnvironmentNamingProvider';
import { aws_kms } from 'aws-cdk-lib';

export enum Operations {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface IRoleHelperProps {
  id: string;
  lambda: lambda.IFunction;
  table?: dynamodb.ITable;
  bucket?: s3.IBucket;
  operations: Operations[];
  role?: iam.Role;
}

export class RoleHelper {
  private readonly namingProvider: INamingProvider;

  constructor(
    private readonly scope: Construct,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    this.namingProvider =
      namingProvider ?? new ServiceEnvironmentNamingProvider(serviceName);
  }

  public addDynamoOperationPermissionsToLambda(
    props: IRoleHelperProps,
  ): iam.Role {
    if (!props.table) throw 'table must be supplied to add s3 role to lambda';

    const role = this.findOrCreateRole(props);

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: this.createDynamodbOperations(props.operations),
        resources: [props.table.tableArn, `${props.table.tableArn}/index/*`],
      }),
    );

    console.log('looking for database key');
    const key = this.getTableEncryptionKey(props.table);

    console.log(`key = ${key}`);

    if (key) {
      if (props.operations.find((op) => op === Operations.READ)) {
        console.log(`adding decryption`);
        key.grantDecrypt(props.lambda);
        key.grantGenerateMac(props.lambda);
      }
      if (props.operations.find((op) => op === Operations.CREATE)) {
        console.log(`adding encryption create`);
        key.grantEncrypt(props.lambda);
        key.grantDecrypt(props.lambda);
      }
      if (props.operations.find((op) => op === Operations.UPDATE)) {
        console.log(`adding enccryption update`);
        key.grantEncrypt(props.lambda);
        key.grantDecrypt(props.lambda);
      }
      if (props.operations.find((op) => op === Operations.DELETE)) {
        console.log(`adding enccryption update`);
        key.grantDecrypt(props.lambda);
      }
    }

    return role;
  }

  public addS3OperationPermissionsToLambda(props: IRoleHelperProps): iam.Role {
    if (!props.bucket) throw 'bucket must be supplied to add s3 role to lambda';

    const role = this.findOrCreateRole(props);

    const { bucketActions, objectActions } = this.createS3Operations(
      props.operations,
    );

    if (bucketActions.length > 0) {
      role.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: bucketActions,
          resources: [props.bucket.bucketArn],
        }),
      );
    }

    if (objectActions.length > 0) {
      role.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: objectActions,
          resources: [props.bucket.arnForObjects('*')],
        }),
      );
    }
    return role;
  }

  private findOrCreateRole(props: IRoleHelperProps): iam.Role {
    if (props.role) return props.role;

    const roleCandidate = (props.lambda as lambda.Function).role;

    if (roleCandidate) return roleCandidate as iam.Role;

    return new iam.Role(
      this.scope,
      this.namingProvider.getResourceId(props.id) ?? 'noId',
      {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        description: `Role assumed by lambda: ${props.lambda.functionName} for resource access`,
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole',
          ),
        ],
      },
    );
  }

  private createDynamodbOperations(operations: Operations[]): string[] {
    const set = new Set<string>();

    operations.forEach((operation) => {
      switch (operation) {
        case Operations.CREATE:
          set.add('dynamodb:PutItem');
          break;
        case Operations.READ:
          set.add('dynamodb:BatchGetItem');
          set.add('dynamodb:GetItem');
          set.add('dynamodb:Query');
          set.add('dynamodb:Scan');
          set.add('dynamodb:DescribeTable');
          break;
        case Operations.UPDATE:
          set.add('dynamodb:UpdateItem');
          break;
        case Operations.DELETE:
          set.add('dynamodb:DeleteItem');
          break;
      }
    });

    return [...set];
  }

  private createS3Operations(operations: Operations[]): {
    bucketActions: string[];
    objectActions: string[];
  } {
    const bucketActions = new Set<string>();
    const objectActions = new Set<string>();

    operations.forEach((operation) => {
      switch (operation) {
        case Operations.CREATE:
          objectActions.add('s3:PutObject');
          objectActions.add('s3:AbortMultipartUpload');
          objectActions.add('s3:ListMultipartUploadParts');
          break;
        case Operations.READ:
          bucketActions.add('s3:ListBucket');
          objectActions.add('s3:GetObject');
          break;
        case Operations.UPDATE:
          objectActions.add('s3:PutObject');
          objectActions.add('s3:PutObjectTagging');
          break;
        case Operations.DELETE:
          objectActions.add('s3:DeleteObject');
          break;
      }
    });

    return {
      bucketActions: [...bucketActions],
      objectActions: [...objectActions],
    };
  }

  private getTableEncryptionKey(
    table: dynamodb.ITable,
  ): aws_kms.IKey | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicir-any
    const anyTable = table as any;

    if (
      anyTable &&
      typeof anyTable === 'object' &&
      'encryptionKey' in anyTable
    ) {
      return anyTable.encryptionKey as aws_kms.IKey | undefined;
    }

    return undefined;
  }
}
