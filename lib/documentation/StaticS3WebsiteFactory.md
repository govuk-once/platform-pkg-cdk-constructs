# StaticS3Website Factory

## Description

The `StaticS3WebsiteFactory` simplifies the creation of S3 buckets configured for static website hosting. It integrates with a naming provider to ensure bucket names are consistent across environments and automatically handles cleanup logic (auto-deletion of objects) based on the provided removal policy.



## Constructor

The constructor initializes the factory with the required scope and naming context.

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| scope | Construct | The stack scope where the S3 bucket will be created | YES |
| serviceName | String | The name of the service used for resource naming | YES |
| namingProvider | INamingProvider | Custom naming strategy for identifiers | NO |

**Returns**: StaticS3WebsiteFactory

---

## Methods

### createS3Website

Creates an S3 bucket configured for website hosting, including index and error document settings and public access configurations.

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| id | String | Unique identifier for the bucket construct | YES |
| props | [IStaticWebsiteProperties](#IStaticWebsiteProperties) | Configuration settings for the website bucket | YES |

**Returns**: s3.Bucket

---

## Interfaces

### IStaticWebsiteProperties

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| siteName | String | The base name for the bucket (will be prefixed by provider) | YES |
| indexDocument | String | The default homepage (Defaults to 'index.html') | NO |
| errorDocument | String | The custom error page (Defaults to 'index.html') | NO |
| publicReadAccess | Boolean | Whether to allow public web access (Defaults to true) | NO |
| removalPolicy | RemovalPolicy | Strategy for bucket deletion (Defaults to DESTROY) | NO |

---

## Security and Cleanup Details

* **Public Access**: When `publicReadAccess` is true, the factory automatically relaxes S3 Block Public Access settings to allow the bucket policy to serve content to the web.
* **SSL**: Note that `enforceSSL` is set to `false` by default to allow standard HTTP website endpoint access. For production sites, it is recommended to front this bucket with CloudFront.
* **Auto-Delete**: If the `removalPolicy` is set to `DESTROY`, the factory enables `autoDeleteObjects`, ensuring the bucket can be removed by CloudFormation even if it contains files.

---

## Example

### Creating a Basic Static Site

```typescript
import { StaticS3WebsiteFactory } from './factories/StaticS3WebsiteFactory';
import * as cdk from 'aws-cdk-lib';

const siteFactory = new StaticS3WebsiteFactory(this, "MarketingApp");

const siteBucket = siteFactory.createS3Website("WebBucket", {
  siteName: "landing-page",
  indexDocument: "index.html",
  removalPolicy: cdk.RemovalPolicy.DESTROY
});
```
## Known Issues
