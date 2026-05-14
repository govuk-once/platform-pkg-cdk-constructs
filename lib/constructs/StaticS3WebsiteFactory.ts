import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { FactoryBase } from "./FactoryBase.js";
import { INamingProvider } from "./namingProviders/INamingProvider.js";

export interface IStaticWebsiteProperties {
  siteName: string;
  indexDocument?: string;
  errorDocument?: string;

  publicReadAccess?: boolean;

  removalPolicy?: cdk.RemovalPolicy;
}

export class StaticS3WebsiteFactory extends FactoryBase {
  constructor(
    private readonly scope: Construct,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    super(serviceName, namingProvider);
  }

  public createS3Website(
    id: string,
    props: IStaticWebsiteProperties,
  ): s3.Bucket {
    const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.DESTROY;
    const publicRead = props.publicReadAccess ?? true;
    const blockPublicAccess = publicRead
       ? new s3.BlockPublicAccess({
           blockPublicAcls: true,
           blockPublicPolicy: false,
           ignorePublicAcls: true,
           restrictPublicBuckets: false,
         })
       : s3.BlockPublicAccess.BLOCK_ALL;

    return new s3.Bucket(this.scope, this.getResourceId(id), {
      bucketName: this.getResourceName(props.siteName),
      removalPolicy,
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,

      websiteIndexDocument: props.indexDocument ?? "index.html",
      websiteErrorDocument: props.errorDocument ?? "index.html",

      publicReadAccess: publicRead,
      blockPublicAccess,
      enforceSSL: true,
    });
  }
}
