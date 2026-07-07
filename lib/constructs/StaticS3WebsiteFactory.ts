import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { FactoryBase } from './FactoryBase';
import { INamingProvider } from './namingProviders/INamingProvider';

export interface IStaticWebsiteProperties {
  siteName: string;
  indexDocument?: string;
  errorDocument?: string;

  publicReadAccess?: boolean;

  removalPolicy?: cdk.RemovalPolicy;
}

export class StaticS3WebsiteFactory extends FactoryBase {
  constructor(
    scope: Construct,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    super(scope, serviceName, namingProvider);
  }

  public createS3Website(
    id: string,
    props: IStaticWebsiteProperties,
  ): s3.Bucket {
    const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.DESTROY;
    const publicRead = props.publicReadAccess ?? true;
    const blockPublicAccess = publicRead
      ? new s3.BlockPublicAccess({
          blockPublicAcls: false,
          blockPublicPolicy: false,
          ignorePublicAcls: false,
          restrictPublicBuckets: false,
        })
      : s3.BlockPublicAccess.BLOCK_ALL;

    return new s3.Bucket(this.getScope(), this.getResourceId(id), {
      bucketName: this.getResourceName(props.siteName),
      removalPolicy,
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,

      websiteIndexDocument: props.indexDocument ?? 'index.html',
      websiteErrorDocument: props.errorDocument ?? 'index.html',

      publicReadAccess: publicRead,
      blockPublicAccess,
      enforceSSL: false,
    });
  }
}
