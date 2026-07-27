#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TestStack } from '../lib/test-stack';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag'


const app = new cdk.App();

cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

NagSuppressions.addStackSuppressions(TestStack, [
  {
    id: 'AwsSolutions-IAM4',
    reason: 'Using AWS managed policies is acceptable for this test-rendered stack',
  },
  {
    id: 'AwsSolutions-KMS5',
    reason: 'This test-stack does not require automated key rotation',
  }
]);

new TestStack(app, 'TestStack');
