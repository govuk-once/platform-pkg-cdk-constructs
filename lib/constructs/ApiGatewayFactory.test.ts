import { describe, test, beforeEach, expect } from "vitest";
import { App, Stack, aws_kms } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { ApiGatewayFactory } from "./ApiGatewayFactory.js";
import { ILambdaRoute } from "./types/ILambdaRoute.js";
import { NullNamingProvider } from "./namingProviders/NullNamingProvider.js";

describe("Apigateway factory", () => {
  let localApp: App;
  let apiFactory: ApiGatewayFactory;
  let localStack: Stack;
  let localLogKey: aws_kms.Key;
  let lambdaRoute: ILambdaRoute;

  const serviceName = "ApiService";
  const env = (process.env.ENVIRONMENT ?? process.env.USER ?? "unkown").replace(
    /[^a-zA-Z0-9-]/g,
    "",
  );

  beforeEach(() => {
    // const environment = getEnvironment();
    localApp = new App();
    localStack = new Stack(localApp, "testApi");

    localLogKey = new aws_kms.Key(localStack, "testkey", {});

    const fn = new lambda.Function(localStack, "testfunc", {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: "index.handler",
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok"})',
      ),
    });

    lambdaRoute = {
      path: "/fred/{id}",
      methods: ["GET"],
      lambda: fn,
    };

    apiFactory = new ApiGatewayFactory(localStack, serviceName);
  });

  test("creates a Gateway service naming provider", () => {
    const api = apiFactory.createApiGatewayRouter("myapi", {
      cacheDurationSeconds: 10,
      description: "test",
      key: localLogKey,
      name: "myApi",
    });

    apiFactory.addRoute(lambdaRoute, api);

    const template = Template.fromStack(localStack);

    //the environment is set
    expect(JSON.stringify(template).includes(env)).toBe(true);

    //the service is set
    expect(JSON.stringify(template).includes(serviceName.toLowerCase())).toBe(
      true,
    );
  });

  test("Can override Gateway service naming provider", () => {
    localApp = new App();
    localStack = new Stack(localApp, "testApi");

    localLogKey = new aws_kms.Key(localStack, "testkey", {});

    const localFfn = new lambda.Function(localStack, "testfunc", {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: "index.handler",
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: "ok"})',
      ),
    });

    lambdaRoute = {
      path: "/fred/{id}",
      methods: ["GET"],
      lambda: localFfn,
    };

    const factory = new ApiGatewayFactory(
      localStack,
      serviceName,
      new NullNamingProvider(),
    );

    const api = factory.createApiGatewayRouter("myapi", {
      cacheDurationSeconds: 10,
      description: "test",
      key: localLogKey,
      name: "myApi",
    });

    apiFactory.addRoute(lambdaRoute, api);

    const template = Template.fromStack(localStack);

    //the environment is set
    expect(JSON.stringify(template)).not.toContain(env);

    //the service is set
    expect(JSON.stringify(template)).not.toContain(serviceName.toLowerCase);
  });

  test("can create a RestApi with method", () => {
    const api = apiFactory.createApiGatewayRouter("myapi", {
      cacheDurationSeconds: 10,
      description: "test",
      key: localLogKey,
      name: "myApi",
    });

    apiFactory.addRoute(lambdaRoute, api);

    const template = Template.fromStack(localStack);

    template.resourceCountIs("AWS::ApiGateway::RestApi", 1);
    template.resourceCountIs("AWS::ApiGateway::Method", 1);
    template.hasResource("AWS::ApiGateway::Resource", {
      Properties: {
        PathPart: "fred",
      },
    });
  });

  test("can create a RestApi with default IAM auth", () => {
    const api = apiFactory.createApiGatewayRouter("myapi", {
      cacheDurationSeconds: 10,
      description: "test",
      key: localLogKey,
      name: "myApi",
    });

    apiFactory.enableIamAuthorisation();
    apiFactory.addRoute(lambdaRoute, api);

    const template = Template.fromStack(localStack);

    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "GET",
      AuthorizationType: "AWS_IAM",
    });
  });

  test("can allow per route authorisation overrieds", () => {
    const api = apiFactory.createApiGatewayRouter("myapi", {
      cacheDurationSeconds: 10,
      description: "test",
      key: localLogKey,
      name: "myApi",
    });

    apiFactory.enableIamAuthorisation();

    lambdaRoute.auth = { authorizationType: apigateway.AuthorizationType.NONE };

    apiFactory.addRoute(lambdaRoute, api);

    const template = Template.fromStack(localStack);

    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "GET",
      AuthorizationType: "NONE",
    });
  });

  test("can create a RestApi with default Cognito auth", () => {
    const api = apiFactory.createApiGatewayRouter("myapi", {
      cacheDurationSeconds: 10,
      description: "test",
      key: localLogKey,
      name: "myApi",
    });

    const auth = apiFactory.createAuthorisor(
      "CognitoAuthorisor",
      {
        type: "cognito",
        userPools: [new cognito.UserPool(localStack, "UserPool")],
      },
      api,
    );

    apiFactory.enableCognitoAuthorisation(auth);

    apiFactory.addRoute(lambdaRoute, api);

    const template = Template.fromStack(localStack);

    template.resourceCountIs("AWS::ApiGateway::Authorizer", 1);

    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "GET",
      AuthorizationType: "COGNITO_USER_POOLS",
      AuthorizerId: Match.anyValue(),
    });
  });
});
