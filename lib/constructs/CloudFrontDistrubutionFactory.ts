import { Construct } from 'constructs';
import { FactoryBase } from './FactoryBase';
import { INamingProvider } from './namingProviders/INamingProvider';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

interface ICloudFrontDistrubutionProperties {
  domainNames?: string[];
  certificate?: acm.Certificate;
  webAclId?: string;

  enableStandardLoggingToS3?: {
    bucket: s3.IBucket;
    prefix?: string;
  };

  behavior?: Partial<cloudfront.BehaviorOptions>;
  distribution?: Omit<cloudfront.DistributionProps, 'defaultBehavior'>;
}

export interface ICloudFrontDistrubutionS3Properties extends ICloudFrontDistrubutionProperties {
  bucket: s3.IBucket;
  originPath?: string;
  originAccessControl?: cloudfront.S3OriginAccessControl;

  defaultRootObject?: string;

  errorResponses?: cloudfront.ErrorResponse[];
  comment?: string;
}

export interface ICloudFrontDistrubutionApigatewayProperties extends ICloudFrontDistrubutionProperties {
  api: apigateway.RestApi;
}

export class CloudFrontDistrubutionFactory extends FactoryBase {
  constructor(
    scope: Construct,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    super(scope, serviceName, namingProvider);
  }

  public createS3Distribution(
    id: string,
    props: ICloudFrontDistrubutionS3Properties,
  ): cloudfront.Distribution {
    const originAccessControl =
      props.originAccessControl ??
      new cloudfront.S3OriginAccessControl(
        this.getScope(),
        `${this.getResourceId(id)}_origin_access_control`,
        {
          description: 'origin access control',
        },
      );

    const origin = origins.S3BucketOrigin.withOriginAccessControl(
      props.bucket,
      {
        originAccessControl,
        originPath: props.originPath,
      },
    );

    const defaultBehavior: cloudfront.BehaviorOptions = this.createBehaviourS3(
      origin,
      props,
    );

    const loggingProps = this.createLoggingProperties(props);

    return new cloudfront.Distribution(this.getScope(), id, {
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      domainNames: props.domainNames,
      certificate: props.certificate,
      webAclId: this.getResourceId(props.webAclId),

      defaultRootObject: props.defaultRootObject ?? 'index.html',
      errorResponses: props.errorResponses,

      ...loggingProps,
      ...(props.distribution ?? {}),
      defaultBehavior,
    });
  }

  public createApigatewayDistribution(
    id: string,
    props: ICloudFrontDistrubutionApigatewayProperties,
  ): cloudfront.Distribution {
    const stack = cdk.Stack.of(props.api);
    const domainName = `${props.api.restApiId}.execute-api.${stack.region}.amazonaws.com`;

    const origin = new origins.HttpOrigin(domainName, {
      originPath: `/${props.api.deploymentStage.stageName}`,
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    const defaultBehavior: cloudfront.BehaviorOptions = this.createBehaviourApi(
      origin,
      props,
    );

    const loggingProps = this.createLoggingProperties(props);

    return new cloudfront.Distribution(
      this.getScope(),
      this.getResourceId(id),
      {
        enableIpv6: true,
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        domainNames: props.domainNames,
        certificate: props.certificate,
        webAclId: this.getResourceId(props.webAclId),

        ...loggingProps,
        ...(props.distribution ?? {}),
        defaultBehavior,
      },
    );
  }

  private createLoggingProperties(props: ICloudFrontDistrubutionProperties) {
    return props.enableStandardLoggingToS3
      ? {
          logBucket: props.enableStandardLoggingToS3.bucket,
          logFilePrefix: props.enableStandardLoggingToS3.prefix,
        }
      : {};
  }

  private createBehaviourS3(
    origin: cdk.aws_cloudfront.IOrigin,
    props: ICloudFrontDistrubutionS3Properties,
  ): cdk.aws_cloudfront.BehaviorOptions {
    return {
      origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      compress: true,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      ...(props.behavior ?? {}),
    };
  }

  private createBehaviourApi(
    origin: cdk.aws_cloudfront.IOrigin,
    props: ICloudFrontDistrubutionApigatewayProperties,
  ): cdk.aws_cloudfront.BehaviorOptions {
    return {
      origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      compress: true,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      ...(props.behavior ?? {}),
    };
  }
}
