import { describe, test, expect } from 'vitest';
import { App, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { StaticS3WebsiteFactory } from './StaticS3WebsiteFactory';
import { NullNamingProvider } from './namingProviders/NullNamingProvider';

describe('StaticS3Website', () => {
  const serviceName = 'S3BucketService';
  const env = (process.env.ENVIRONMENT ?? process.env.USER ?? 'unkown').replace(
    /[^a-zA-Z0-9-]/g,
    '',
  );

  test('creates a S3 bucket service naming provider', () => {
    const app = new App();
    const stack = new Stack(app, 'testCloudfront');

    const factory = new StaticS3WebsiteFactory(stack, serviceName);

    factory.createS3Website('websiteBucket', {
      siteName: 'test-static-website',
    });

    const template = Template.fromStack(stack);

    //the environment is set
    expect(JSON.stringify(template).includes(env)).toBe(true);

    //the service is set
    expect(JSON.stringify(template).includes(serviceName.toLowerCase())).toBe(
      true,
    );
  });

  test('creates a S3 bucket overridden naming provider', () => {
    const app = new App();
    const stack = new Stack(app, 'testCloudfront');

    const factory = new StaticS3WebsiteFactory(
      stack,
      serviceName,
      new NullNamingProvider(),
    );

    factory.createS3Website('websiteBucket', {
      siteName: 'test-static-website',
    });

    const template = Template.fromStack(stack);

    //the environment is set
    expect(JSON.stringify(template)).not.toContain(env);

    //the service is set
    expect(JSON.stringify(template)).not.toContain(serviceName.toLowerCase());
  });

  test('creates an S3 website bucket with defaults public read, index and error docs', () => {
    const app = new App();
    const stack = new Stack(app, 'testWebsite');

    const factory = new StaticS3WebsiteFactory(stack, serviceName);

    factory.createS3Website('websiteBucket', {
      siteName: 'test-static-website',
    });

    const bucketName = `${env.toLowerCase()}-${serviceName.toLowerCase()}-test-static-website`;
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: bucketName,
      WebsiteConfiguration: {
        IndexDocument: 'index.html',
        ErrorDocument: 'index.html',
      },
    });
  });

  test('creates a private bucket when public read is false', () => {
    const app = new App();
    const stack = new Stack(app, 'testWebsite');

    const factory = new StaticS3WebsiteFactory(stack, serviceName);

    factory.createS3Website('websiteBucket', {
      siteName: 'test-static-website',
      publicReadAccess: false,
    });

    const bucketName = `${env.toLowerCase()}-${serviceName.toLowerCase()}-test-static-website`;
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('creates an S3 website overriding defaults public read, index and error docs', () => {
    const app = new App();
    const stack = new Stack(app, 'testWebsite');

    const factory = new StaticS3WebsiteFactory(stack, serviceName);

    factory.createS3Website('websiteBucket', {
      siteName: 'test-static-website',
      indexDocument: 'home.html',
      errorDocument: '404.html',
    });

    const bucketName = `${env.toLowerCase()}-${serviceName.toLowerCase()}-test-static-website`;
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: bucketName,
      WebsiteConfiguration: {
        IndexDocument: 'home.html',
        ErrorDocument: '404.html',
      },
    });
  });

  test('creates an S3 website setting deletion policy to retained', () => {
    const app = new App();
    const stack = new Stack(app, 'testWebsite');

    const factory = new StaticS3WebsiteFactory(stack, serviceName);

    factory.createS3Website('websiteBucket', {
      siteName: 'test-static-website',
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });
});
