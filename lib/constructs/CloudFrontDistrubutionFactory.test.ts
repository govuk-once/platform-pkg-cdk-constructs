import { App, Stack } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { describe, test, expect } from 'vitest';

import { CloudFrontDistrubutionFactory } from './CloudFrontDistrubutionFactory';
import { NullNamingProvider } from './namingProviders/NullNamingProvider';

describe('CloudFrontDistrubutionFactory', () => {
  test('creates a S3 distrubution using service naming provider', () => {
    const env = (
      process.env.ENVIRONMENT ??
      process.env.USER ??
      'unkown'
    ).replace(/[^a-zA-Z0-9-]/g, '');

    const serviceName = 'helloservice';

    const app = new App();
    const stack = new Stack(app, 'testCloudfront');

    const bucket = new s3.Bucket(stack, 'website');
    const factory = new CloudFrontDistrubutionFactory(stack, serviceName);

    factory.createS3Distribution('testCloudfront', {
      bucket,
      defaultRootObject: 'start.html',
    });

    const template = Template.fromStack(stack);

    //the environment is set
    expect(JSON.stringify(template).includes(env)).toBe(true);

    //the service is set
    expect(JSON.stringify(template).includes(serviceName)).toBe(true);
  });

  test('creates a S3 distrubution using overriding naming provider', () => {
    const env = (
      process.env.ENVIRONMENT ??
      process.env.USER ??
      'unkown'
    ).replace(/[^a-zA-Z0-9-]/g, '');

    const serviceName = 'helloservice';

    const app = new App();
    const stack = new Stack(app, 'testCloudfront');

    const bucket = new s3.Bucket(stack, 'website');
    const factory = new CloudFrontDistrubutionFactory(
      stack,
      serviceName,
      new NullNamingProvider(),
    );

    factory.createS3Distribution('testCloudfront', {
      bucket,
      defaultRootObject: 'start.html',
    });

    const template = Template.fromStack(stack);

    //the environment is set
    expect(JSON.stringify(template)).not.toContain(env);

    //the service is set
    expect(JSON.stringify(template)).not.toContain(serviceName);
  });

  test('creates a S3 distrubution', () => {
    const app = new App();
    const stack = new Stack(app, 'testCloudfront');

    const bucket = new s3.Bucket(stack, 'website');
    const factory = new CloudFrontDistrubutionFactory(stack, 'CloudFront');

    factory.createS3Distribution('testCloudfront', {
      bucket,
      defaultRootObject: 'start.html',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'start.html',
        Enabled: true,
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'redirect-to-https',
        }),
        Origins: Match.arrayWith([
          Match.objectLike({
            OriginAccessControlId: Match.anyValue(),
            S3OriginConfig: Match.anyValue(),
          }),
        ]),
      }),
    });
  });

  test('creates a Apigateway distrubution', () => {
    const app = new App();
    const stack = new Stack(app, 'testCloudfrontApigateway');

    const api = new apigateway.RestApi(stack, 'testApi', {
      deployOptions: { stageName: 'test' },
    });

    api.root
      .addResource('hello')
      .addMethod('GET', new apigateway.MockIntegration(), {
        authorizationType: apigateway.AuthorizationType.IAM,
      });

    const factory = new CloudFrontDistrubutionFactory(stack, 'CloudFront');

    factory.createApigatewayDistribution('testApigateway', {
      api,
      behavior: {
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::CloudFront::Distribution', 1);

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Enabled: true,
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'https-only',
        }),
        Origins: Match.arrayWith([
          Match.objectLike({
            CustomOriginConfig: Match.objectLike({
              OriginProtocolPolicy: 'https-only',
            }),
          }),
        ]),
      }),
    });
  });
});
