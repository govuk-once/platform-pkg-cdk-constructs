#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TestStack } from '../lib/test-stack';
import { AwsSolutionsChecks } from 'cdk-nag'

const app = new cdk.App();
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

new TestStack(app, 'TestStack');