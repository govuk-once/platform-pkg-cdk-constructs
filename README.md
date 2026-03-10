# platform-constructs

## Purpose

Provides an NPM installable suite of AWS CDK constructs and helper-factories for creating AWS resources to support development.

### Concepts

* `skeletons/*` are opinionated templates for groups of AWS resources. They can be used to bootstrap new projects, environments, accounts or otherwise elements with configuration that is common to many projects in the Once Estate.
* `factories/*` are functions that will render a set of common resources with sensible defaults and a minimal interface.
* `structures/*` are internal constructs that are not intended for direct use by external consumers. They are used internally by skeletons, factories or helpers.


## Usage/Setup

1. Ensure your AWS CLI is correctly configured to point at your account and region. (gds-cli at present)
1. Acquire a one-hour token and configure your `.npmrc` by using the AWS CLI

```
aws codeartifact login --tool npm --repository registry-sandbox-repo --domain registry-sandbox --domain-owner 513758042057 --region eu-west-2
```

1. Install the CDK peer dependencies in your repo `pnpm i --save-dev aws-cdk aws-cdk-lib`
1. Use `pnpm i once-platform-constructs` to install this package.

## Usage/Developing-Constructs

TODO