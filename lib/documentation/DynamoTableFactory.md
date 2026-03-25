# DynamoTable Factory

## Description

Creates a DynamoDB table with integrated encryption and security best practices. It utilizes a naming provider to ensure the table and its associated encryption key follow standardized naming conventions. The factory automatically handles customer-managed encryption (KMS) and Point-in-Time Recovery (PITR) by default.

## Constructor

The constructor has four parameters:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| scope | Construct | Ensure that resource is placed in the required stack | YES |
| region | String | The AWS region where the resource is deployed | YES |
| serviceName | String | The name of the service which this resource is a part of | YES |
| namingProvider | INamingProvider | Creates a standardized pre-fix for object identifiers and names | NO |

**Returns**: DynamoTableFactory

---

## Methods

### createTable

Returns a DynamoDB table configured with customer-managed encryption and standard recovery options.

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| id | String | An identifier that is the suffix of the resource | YES |
| props | [DynamoTableProperties](#DynamoTableProperties) | Details how the DynamoDB table is to be configured | YES |

**Returns**: dynamoDB.Table

---

## Properties

### DynamoTableProperties

Informs the system how the DynamoDB table and its secondary indexes should be configured:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| tableName | String | The name of the table (will be prefixed by naming provider) | YES |
| partitionKey | Attribute | The attribute that builds the partition key | YES |
| sortKey | Attribute | The attribute that builds the sort key | YES |
| billingMode | BillingMode | Defaults to PAY_PER_REQUEST | NO |
| removalPolicy | RemovalPolicy | Defaults to RETAIN | NO |
| pointInTimeRecoverySpecification | PITR Property | Configures backup recovery. Defaults to Enabled | NO |
| key | kms.IKey | Custom KMS key for encryption. Creates new if not provided | NO |
| timeToLiveAttribute | String | Attribute name for TTL. Defaults to 'TTL' | NO |
| stream | StreamViewType | Determines if/how the table sends changes to a stream | NO |
| globalSecondaryIndexes | Array | Configuration for Global Secondary Indexes (GSI) | NO |
| localSecondaryIndexes | Array | Configuration for Local Secondary Indexes (LSI) | NO |

---

## Example

### Create a Table with a Global Secondary Index

```typescript
import { App, Stack, aws_dynamodb as dynamoDB } from "aws-cdk-lib";
import { DynamoTableFactory } from "./factories/DynamoTableFactory";

const app = new App();
const stack = new Stack(app, "DatabaseStack");
const factory = new DynamoTableFactory(stack, "us-east-1", "ProductService");

const table = factory.createTable("ProductTable", {
  tableName: "Products",
  partitionKey: { name: "pk", type: dynamoDB.AttributeType.STRING },
  sortKey: { name: "sk", type: dynamoDB.AttributeType.STRING },
  globalSecondaryIndexes: [
    {
      indexName: "GSI1",
      partitionKey: { name: "GSI1_pk", type: dynamoDB.AttributeType.STRING },
      projectionType: dynamoDB.ProjectionType.ALL
    }
  ]
});
```

## Known Issues