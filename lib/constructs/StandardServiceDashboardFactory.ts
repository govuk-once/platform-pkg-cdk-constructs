import { App } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudWatch from "aws-cdk-lib/aws-cloudwatch";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { ITable } from "aws-cdk-lib/aws-dynamodb";

import { FactoryBase } from "./FactoryBase.js";
import { INamingProvider } from "./namingProviders/INamingProvider.js";
import { Duration } from "aws-cdk-lib";

export interface IStandardServiceDashboardProps {
  name: string;
  restApis: RestApi[];
  lambdas: IFunction[];
  tables: ITable[];

  widgetWidth?: number;
  widgetHeight?: number;
}

class DashboardWidgetFactory extends FactoryBase {
  constructor(
    private readonly width: number,
    private readonly height: number,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    super(new App(), serviceName, namingProvider);
  }

  public createApiGatewayWidgets(api: RestApi): cloudWatch.IWidget[] {
    const name = api.restApiName;

    const errors = new cloudWatch.GraphWidget({
      title: `${name} - 4xx / 5xx Errors`,
      width: this.width,
      height: this.height,
      left: [api.metricClientError(), api.metricServerError()],
    });

    const requestLatency = new cloudWatch.GraphWidget({
      title: `${name} - Requests and Latency`,
      width: this.width,
      height: this.height,
      left: [api.metricCount(), api.metricLatency()],
    });

    return [errors, requestLatency];
  }

  public createLambdaWidgets(lambda: IFunction): cloudWatch.IWidget[] {
    const name = lambda.functionName ?? "lambda";

    const errors = new cloudWatch.GraphWidget({
      title: `${name} - Errors and Throttles`,
      width: this.width,
      height: this.height,
      left: [lambda.metricErrors(), lambda.metricThrottles()],
    });

    const invocationDuration = new cloudWatch.GraphWidget({
      title: `${name} - Invocations (sum) and Durations (average ms)`,
      width: this.width,
      height: this.height,
      left: [
        lambda.metricInvocations({ statistic: "Sum" }),
        lambda.metricDuration({
          statistic: "Average",
        }),
      ],
    });

    return [errors, invocationDuration];
  }

  public createDynamoWidgets(table: ITable): cloudWatch.IWidget[] {
    const name = table.tableName ?? "DynamoTable";

    const units = new cloudWatch.GraphWidget({
      title: `${name} - Consumed RCU / WCU`,
      width: this.width,
      height: this.height,
      left: [
        table.metricConsumedReadCapacityUnits(),
        table.metricConsumedWriteCapacityUnits(),
      ],
    });

    const throttles = new cloudWatch.GraphWidget({
      title: `${name} - Throttles`,
      width: this.width,
      height: this.height,
      left: [table.metricThrottledRequestsForOperations()],
    });

    return [units, throttles];
  }
}

export class StandardServiceDashboardFactory extends FactoryBase {
  private readonly widgetFactory: DashboardWidgetFactory;

  constructor(
    scope: Construct,
    serviceName: string,
    private readonly widgetWidth?: number,
    private readonly widgetHeight?: number,
    namingProvider?: INamingProvider,
  ) {
    super(scope, serviceName, namingProvider);
    this.widgetFactory = new DashboardWidgetFactory(
      widgetWidth ?? 12,
      widgetHeight ?? 6,
      serviceName,
      namingProvider,
    );
  }

  public createDashboard(
    id: string,
    props: IStandardServiceDashboardProps,
  ): cloudWatch.Dashboard {
    const dashboard = new cloudWatch.Dashboard(
      this.scope,
      this.getResourceId(id),
      {
        dashboardName: this.getResourceName(props.name),
      },
    );

    (props.lambdas ?? []).forEach((lambda) => {
      const widgets = this.widgetFactory.createLambdaWidgets(lambda);
      widgets.forEach((widget) => dashboard.addWidgets(widget));
    });

    (props.restApis ?? []).forEach((api) => {
      const widgets = this.widgetFactory.createApiGatewayWidgets(api);
      widgets.forEach((widget) => dashboard.addWidgets(widget));
    });

    (props.tables ?? []).forEach((table) => {
      const widgets = this.widgetFactory.createDynamoWidgets(table);
      widgets.forEach((widget) => dashboard.addWidgets(widget));
    });

    return dashboard;
  }
}

export default StandardServiceDashboardFactory;
