# StandardServiceDashboard Factory

## Description

The `StandardServiceDashboardFactory` automates the creation of AWS CloudWatch Dashboards for your services. It provides a standardized view of system health by automatically generating telemetry widgets for API Gateways, Lambda Functions, and DynamoDB Tables.

The factory ensures consistent layout and naming across environments by utilizing a naming provider and a specialized internal widget factory.

[Image of AWS CloudWatch Dashboard with Lambda and DynamoDB metrics]

## Constructor

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| scope | Construct | The stack scope where the dashboard will be created | YES |
| serviceName | String | The name of the service used for resource naming | YES |
| widgetWidth | Number | The horizontal size of generated widgets (Defaults to 12) | NO |
| widgetHeight | Number | The vertical size of generated widgets (Defaults to 6) | NO |
| namingProvider | INamingProvider | Custom naming strategy for identifiers | NO |

**Returns**: StandardServiceDashboardFactory

---

## Methods

### createDashboard

Creates a full CloudWatch Dashboard populated with performance and error metrics for all provided resources.

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| id | String | Unique identifier for the dashboard construct | YES |
| props | [IStandardServiceDashboardProps](#IStandardServiceDashboardProps) | List of resources to include in the dashboard | YES |

**Returns**: cloudWatch.Dashboard

---

## Interfaces

### IStandardServiceDashboardProps

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| name | String | The display name for the dashboard | YES |
| restApis | RestApi[] | API Gateways to monitor (4xx/5xx, Latency, Count) | YES |
| lambdas | IFunction[] | Lambda functions to monitor (Errors, Throttles, Duration) | YES |
| tables | ITable[] | DynamoDB tables to monitor (RCU/WCU, Throttles) | YES |
| widgetWidth | Number | Override for the default widget width | NO |
| widgetHeight | Number | Override for the default widget height | NO |

---

## Automatically Generated Widgets

The factory generates the following pairs of metrics for each resource type:

| Resource | Widget 1 | Widget 2 |
| --- | --- | --- |
| **API Gateway** | Client (4xx) & Server (5xx) Errors | Request Count & Latency |
| **Lambda** | Errors & Throttles | Invocations & Average Duration |
| **DynamoDB** | Consumed RCU & WCU | Throttled Requests |

---

## Example

### Creating a Service Monitoring Dashboard

```typescript
import { StandardServiceDashboardFactory } from './factories/StandardServiceDashboardFactory';

const dashboardFactory = new StandardServiceDashboardFactory(this, "OrderService");

dashboardFactory.createDashboard("ServiceHealth", {
  name: "OrderProcessingOverview",
  lambdas: [processOrderLambda, notifyUserLambda],
  restApis: [ordersApi],
  tables: [ordersTable]
});
```
## Known Issues