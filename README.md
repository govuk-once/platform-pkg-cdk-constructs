# GDS CDK Construct Library

An NPM-installable suite of AWS CDK constructs and helper factories for creating AWS resources. These constructs encode security best practices and operational defaults, reducing boilerplate and ensuring consistency across our GOV.UK services.

## Constructs

| Construct | Description |
| --- | --- |
| [LambdaFactory](lib/documentation/LambdaFunctionFactory.md) | Lambda functions with encrypted CloudWatch Log Groups and API Gateway routing helpers |
| [ApiGatewayFactory](lib/documentation/ApiGatewayFactory.md) | REST API Gateways with caching, access logging, X-Ray tracing, and pluggable authorisation |
| [DynamoTableFactory](lib/documentation/DynamoTableFactory.md) | DynamoDB tables with customer-managed KMS encryption and point-in-time recovery |
| [CloudFrontDistributionFactory](lib/documentation/CloudFrontDistrubutionFactory.md) | CloudFront distributions for S3 or API Gateway origins with TLS 1.2 and OAC |
| [StaticS3WebsiteFactory](lib/documentation/StaticS3WebsiteFactory.md) | S3 buckets configured for static website hosting |
| [WafFactory](lib/documentation/WafFactory.md) | WAFv2 Web ACLs with managed rule groups, rate limiting, and custom rules |
| [RoleHelper](lib/documentation/RoleHelper.md) | Maps high-level CRUD operations to granular IAM actions for DynamoDB and S3 |
| [ServiceParameters](lib/documentation/ServiceParameters.md) | Centralised accessor for shared infrastructure SSM parameters (hosted zone, ACM cert) |
| [StandardServiceDashboardFactory](lib/documentation/StandardServiceDashboard.md) | CloudWatch Dashboards with standard widgets for APIs, Lambdas, and DynamoDB |

## Quick start

```typescript
import { LambdaFactory, ApiGatewayFactory } from "once-platform-constructs";
import { App, Stack, aws_kms as kms, aws_lambda as lambda } from "aws-cdk-lib";

const app = new App();
const stack = new Stack(app, "MyServiceStack");

const key = new kms.Key(stack, "ServiceKey", { enableKeyRotation: true });

const lambdaFactory = new LambdaFactory(stack, "MyService");
const apiFactory = new ApiGatewayFactory(stack, "MyService");

const route = lambdaFactory.createLambdaWithApiRoute("GetItems", {
  name: "GetItems",
  runtime: lambda.Runtime.NODEJS_22_X,
  handler: "index.handler",
  code: lambda.Code.fromAsset("dist/get-items"),
  duration: 10,
  key,
  path: "/items",
  methods: ["GET"],
});

const api = apiFactory.createApiGatewayRouter("Api", {
  name: "ItemsApi",
  description: "Items service API",
  cacheDurationSeconds: 300,
  key,
});

apiFactory.addRoute(route, api);
```

## Naming providers

All factories use a pluggable naming strategy via the `INamingProvider` interface. The default `ServiceEnvironmentNamingProvider` prefixes resource IDs and names with `{ENVIRONMENT}-{serviceName}-`, where `ENVIRONMENT` comes from the `ENVIRONMENT` or `USER` environment variable.

To disable prefixing, pass the `NullNamingProvider`:

```typescript
import { LambdaFactory, NullNamingProvider } from "once-platform-constructs";

const factory = new LambdaFactory(stack, "MyService", new NullNamingProvider());
```

See the [Naming Providers documentation](lib/documentation/NamingProviders.md) for details.

## Installation

### Prerequisites

- Node.js (see `.nvmrc` for version)
- pnpm
- AWS CDK peer dependencies: `aws-cdk` and `aws-cdk-lib`

### Local setup

1. Ensure your AWS CLI is configured for the correct account and region (gds-cli).

2. Acquire a CodeArtifact token and configure your `.npmrc`:

   ```sh
   aws codeartifact login --tool npm --repository registry-prod-repo --domain registry-prod --domain-owner 904690835784 --region eu-west-2
   ```

3. Install CDK peer dependencies:

   ```sh
   pnpm i --save-dev aws-cdk aws-cdk-lib
   ```

4. Install this package:

   ```sh
   pnpm i once-platform-constructs
   ```

### Pipelines

Use the reusable GitHub Action for CodeArtifact authentication:

https://github.com/govuk-once/platform-actions/tree/main/.github/actions/codeartifact-auth

## Development

```sh
pnpm install        # Install dependencies
pnpm build          # Compile to ESM + CJS
pnpm test           # Run unit tests (vitest)
pnpm test:ci        # Run tests with coverage
pnpm lint           # Lint with ESLint
```

## Security defaults

The constructs apply opinionated security defaults out of the box:

- **Encryption**: Customer-managed KMS keys with automatic rotation for DynamoDB, CloudWatch Logs, and API Gateway access logs
- **TLS**: Minimum TLS 1.2 enforced on CloudFront distributions
- **WAF**: AWS managed rule groups (Common, Known Bad Inputs, SQLi, IP Reputation) applied by default
- **DynamoDB**: Point-in-time recovery enabled, RETAIN removal policy
- **IAM**: Least-privilege permissions via RoleHelper's CRUD operation mapping
- **Logging**: Encrypted log groups with configurable retention (default: 2 weeks)

## Architecture

```
lib/
  constructs/           # Factory implementations and tests
    namingProviders/    # Pluggable naming strategy
  documentation/        # Per-construct documentation
test/                   # Integration test CDK app
iac/                    # Terraform for CodeArtifact registry
ADR/                    # Architecture Decision Records
```
