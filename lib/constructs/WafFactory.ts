import { Construct } from 'constructs';
import { FactoryBase } from './FactoryBase';
import { INamingProvider } from './namingProviders/INamingProvider';
import * as waf from 'aws-cdk-lib/aws-wafv2';

export interface IWafProperties {
  scope: 'CLOUDFRONT' | 'REGIONAL';
  name: string;
  defaultAction?: 'ALLOW' | 'BLOCK';

  managedRuleGroups?: Array<{
    vendorName?: string;
    name: string;
    priority: number;
    overrideAction?: 'NONE' | 'COUNT';
  }>;

  rateLimit?: {
    limit: number;
    priority: number;
    action?: 'BLOCK' | 'COUNT';
  };

  metricName?: string;
  customRules?: waf.CfnWebACL.RuleProperty[];
}

export class WafFactory extends FactoryBase {
  constructor(
    scope: Construct,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    super(scope, serviceName, namingProvider);
  }

  public createWebAcl(id: string, props: IWafProperties): waf.CfnWebACL {
    const defaultManagedRuleGroups = props.managedRuleGroups ?? [
      { name: 'AWSManagedRulesCommonRuleSet', priority: 20 },
      { name: 'AWSManagedRulesKnownBadInputsRuleSet', priority: 30 },
      { name: 'AWSManagedRulesSQLiSet', priority: 40 },
      { name: 'AWSManagedRulesAmazonIpReputationList', priority: 50 },
    ];

    const rules: waf.CfnWebACL.RuleProperty[] = [];

    if (props.rateLimit) {
      rules.push({
        name: 'RateLimit',
        priority: props.rateLimit.priority,
        statement: {
          rateBasedStatement: {
            limit: props.rateLimit.limit,
            aggregateKeyType: 'IP',
          },
        },
        action:
          (props.rateLimit.action ?? 'BLOCK') === 'COUNT'
            ? { count: {} }
            : { block: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'RateLimit',
          sampledRequestsEnabled: true,
        },
      });
    }
    defaultManagedRuleGroups.forEach((group) => {
      rules.push({
        name: group.name,
        priority: group.priority,
        statement: {
          managedRuleGroupStatement: {
            vendorName: group.vendorName ?? 'AWS',
            name: group.name,
          },
        },
        overrideAction:
          (group.overrideAction ?? 'BLOCK') === 'COUNT'
            ? { count: {} }
            : { none: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: group.name,
          sampledRequestsEnabled: true,
        },
      });
    });

    props.customRules?.forEach((rule) => rules.push(rule));

    return new waf.CfnWebACL(this.getScope(), this.getResourceId(id), {
      name: this.getResourceName(props.name),
      scope: props.scope,
      defaultAction:
        (props.defaultAction ?? 'ALLOW') === 'BLOCK'
          ? { block: {} }
          : { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: props.metricName ?? this.getResourceName(props.name),
        sampledRequestsEnabled: true,
      },
      rules,
    });
  }
}
