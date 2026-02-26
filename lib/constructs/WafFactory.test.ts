import { describe, expect, test } from 'vitest';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';

import { WafFactory } from './WafFactory';
import { NullNamingProvider } from './namingProviders/NullNamingProvider';

describe('Waf Factory', () => {
  const serviceName = 'WAFService';
  const env = (process.env.ENVIRONMENT ?? process.env.USER ?? 'unkown').replace(
    /[^a-zA-Z0-9-]/g,
    '',
  );

  const testName = 'test-web-acl';

  const wafName = `${env.toLowerCase()}-${serviceName.toLowerCase()}-${testName}`;

  test('creates a S3 bucket service naming provider', () => {
    const app = new App();
    const stack = new Stack(app, 'testCloudfront');

    const factory = new WafFactory(stack, serviceName);

    factory.createWebAcl('WebAcl', {
      scope: 'REGIONAL',
      name: 'testName',
    });

    const template = Template.fromStack(stack);

    //the environment is set
    expect(JSON.stringify(template).includes(env)).toBe(true);

    //the service is set
    expect(JSON.stringify(template).includes(serviceName.toLowerCase())).toBe(
      true,
    );
  });

  test('creates a S3 bucket overriden naming provider', () => {
    const app = new App();
    const stack = new Stack(app, 'testCloudfront');

    const factory = new WafFactory(
      stack,
      serviceName,
      new NullNamingProvider(),
    );

    factory.createWebAcl('WebAcl', {
      scope: 'REGIONAL',
      name: 'testName',
    });

    const template = Template.fromStack(stack);

    //the environment is set
    expect(JSON.stringify(template)).not.toContain(env);

    //the service is set
    expect(JSON.stringify(template)).not.toContain(serviceName.toLowerCase());
  });

  test('creates a webAlc with ratelimit rules', () => {
    const app = new App();
    const stack = new Stack(app, 'testWaf');

    const factory = new WafFactory(stack, serviceName);

    factory.createWebAcl('WebAcl', {
      scope: 'REGIONAL',
      name: testName,
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Name: wafName,
      Scope: 'REGIONAL',
      DefaultAction: { Allow: {} },
      VisibilityConfig: {
        CloudWatchMetricsEnabled: true,
        SampledRequestsEnabled: true,
        MetricName: wafName,
      },
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesCommonRuleSet',
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: 'AWS',
              Name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          OverrideAction: { None: {} },
        }),
      ]),
    });
  });

  test('creates a webAlc with additional rule', () => {
    const app = new App();
    const stack = new Stack(app, 'testWaf');

    const factory = new WafFactory(stack, serviceName);
    const testName = 'test-web-acl';

    factory.createWebAcl('WebAcl', {
      scope: 'REGIONAL',
      name: testName,
      rateLimit: {
        limit: 200,
        priority: 10,
        action: 'BLOCK',
      },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'RateLimit',
          Statement: {
            RateBasedStatement: {
              Limit: 200,
              AggregateKeyType: 'IP',
            },
          },
          Action: { Block: {} },
        }),
      ]),
    });
  });

  test('creates a webAlc with default action to BLOCK', () => {
    const app = new App();
    const stack = new Stack(app, 'testWaf');

    const factory = new WafFactory(stack, serviceName);
    const testName = 'test-web-acl';

    factory.createWebAcl('WebAcl', {
      scope: 'REGIONAL',
      name: testName,
      defaultAction: 'BLOCK',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      DefaultAction: { Block: {} },
    });
  });

  test('creates a webAlc with rule groups rather than defaults', () => {
    const app = new App();
    const stack = new Stack(app, 'testWaf');

    const factory = new WafFactory(stack, serviceName);
    const testName = 'test-web-acl';

    factory.createWebAcl('WebAcl', {
      scope: 'REGIONAL',
      name: testName,
      managedRuleGroups: [
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 5,
          overrideAction: 'COUNT',
        },
      ],
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesSQLiRuleSet',
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: 'AWS',
              Name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
        }),
      ]),
    });

    const webAlcs = template.findResources('AWS::WAFv2::WebACL');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = Object.values(webAlcs)[0] as any;
    const rules = first.Properties.Rules ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ruleNames = rules.map((rule: any) => rule.Name);

    expect(ruleNames).not.toContain('AWSManagedRulesCommonRuleSet');
  });

  test('creates a Cloudfront WebACL', () => {
    const app = new App();
    const stack = new Stack(app, 'testWaf');

    const factory = new WafFactory(stack, serviceName);
    const testName = 'test-web-acl';

    factory.createWebAcl('WebAcl', {
      scope: 'CLOUDFRONT',
      name: testName,
      managedRuleGroups: [
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 5,
          overrideAction: 'COUNT',
        },
      ],
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Name: wafName,
      Scope: 'CLOUDFRONT',
    });
  });
});
