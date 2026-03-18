# CloudFrontDistribution Factory

## Description

Creates CloudFront distributions for S3 buckets or API Gateways. It leverages a naming provider to ensure resources have standardized identifier prefixes for easy identification across environments and services. 

The factory simplifies the creation of distributions by pre-configuring security best practices, such as TLS protocols, IPv6 enablement, and secure viewer protocol policies.

## Constructor

The constructor has three parameters:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| scope | Construct | Ensure that resource is placed in the required stack | YES |
| serviceName | String | The name of the service which this resource is a part of | YES |
| namingProvider | INamingProvider | Creates a standardized pre-fix for object identifiers and names | NO |

**Returns**: CloudFrontDistributionFactory

---

## Methods

### createS3Distribution

Creates a CloudFront distribution specifically optimized for an S3 bucket origin. It automatically handles Origin Access Control (OAC) to ensure the bucket remains private.

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| id | String | An identifier that is the suffix of the resource | YES |
| props | [ICloudFrontDistributionS3Properties](#ICloudFrontDistributionS3Properties) | Configuration details for the S3 distribution | YES |

**Returns**: cloudfront.Distribution

### createApigatewayDistribution

Creates a CloudFront distribution optimized for a RestApi origin. It automatically handles stage paths and sets the protocol policy to HTTPS only.

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| id | String | An identifier that is the suffix of the resource | YES |
| props | [ICloudFrontDistributionApigatewayProperties](#ICloudFrontDistributionApigatewayProperties) | Configuration details for the API Gateway distribution | YES |

**Returns**: cloudfront.Distribution

---

## Properties

### ICloudFrontDistributionProperties (Base)

These properties are shared by both S3 and API Gateway distribution methods:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| domainNames | string[] | Custom domains for the distribution | NO |
| certificate | acm.Certificate | Certificate for custom domains | NO |
| webAclId | string | ID of a WAF web ACL to associate | NO |
| enableStandardLoggingToS3 | Object | Configures S3 bucket and prefix for access logs | NO |
| Behavior | Partial<BehaviorOptions> | Overrides for the default Behavior | NO |
| distribution | Omit<DistributionProps> | Overrides for the distribution level properties | NO |

### ICloudFrontDistributionS3Properties

Inherits from [Base Properties](#ICloudFrontDistributionProperties-Base).

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| bucket | s3.IBucket | The source S3 bucket | YES |
| originPath | string | Specific path within the bucket | NO |
| originAccessControl | cloudfront.S3OriginAccessControl | Existing OAC to use (defaults to creating new) | NO |
| defaultRootObject | string | Defaults to 'index.html' | NO |
| errorResponses | cloudfront.ErrorResponse[] | Custom error pages (e.g., for SPAs) | NO |
| comment | string | Description for the distribution | NO |

### ICloudFrontDistributionApigatewayProperties

Inherits from [Base Properties](#ICloudFrontDistributionProperties-Base).

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| api | apigateway.RestApi | The API Gateway to be used as the origin | YES |

---

## Example

### Create a Distribution for an S3 Website

```typescript
import { App, Stack } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { CloudFrontDistributionFactory } from "./factories/CloudFrontDistributionFactory";

const app = new App();
const stack = new Stack(app, "WebStack");
const factory = new CloudFrontDistributionFactory(stack, "MyService");

const websiteBucket = s3.Bucket.fromBucketName(stack, "SourceBucket", "my-web-assets");

const distribution = factory.createS3Distribution("MainDist", {
  bucket: websiteBucket,
  defaultRootObject: "index.html",
  comment: "Production Website Distribution"
});
```
## Known Issues