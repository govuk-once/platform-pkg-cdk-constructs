# platform-constructs

## Purpose

Provides an NPM installable suite of AWS CDK constructs and helper-factories for creating AWS resources to support development.



## Usage/Setup

1. Ensure your AWS CLI is correctly configured to point at your account and region. (gds-cli at present)
1. Acquire a one-hour token and configure your `.npmrc` by using the AWS CLI

run: 

```
aws codeartifact login --tool npm --repository registry-prod-repo --domain registry-prod --domain-owner 904690835784 --region eu-west-2
```

1. Install the CDK peer dependencies in your repo `pnpm i --save-dev aws-cdk aws-cdk-lib`
1. Use `pnpm i once-platform-constructs` to install this package.

## Usage/Developing-Constructs

TODO
