import { ILambdaRoute } from './types/ILambdaRoute';
import { FactoryBase } from './FactoryBase';
import { INamingProvider } from './namingProviders/INamingProvider';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';

class constants {
  static readonly RETENTIONDAYS: logs.RetentionDays.TWO_WEEKS;
}

export type AuthoriserConfig =
  | {
      type: 'cognito';
      userPools: cognito.IUserPool[];
      identitySource?: string;
      resultsCacheTtlSeconds?: number;
    }
  | {
      type: 'lambda';
      lambda: lambda.IFunction;
      identitySource?: string;
      validationRegex?: string;
      resultsCacheTtlSeconds?: number;
    };

/**
 * Defines the parameters that are used to defind the restFul Apiateway
 * @param description - a human readably summary the api's funcation
 * @param name - the name of the apigateway which is
 */
export interface IApiGatewayRouterProperties {
  cacheDurationSeconds: number;
  description: string;
  key: cdk.aws_kms.Key;
  name: string;
  retentionDays?: logs.RetentionDays;
  domainName?: apigateway.DomainNameOptions;
}

/**
 * Create a restFul apigateway which allows for multiple routs and lambdas
 *
 * @param scope - the stack scope which is assoicated with the building of the gateway

 */
export class ApiGatewayFactory extends FactoryBase {
  private defaultAuthorisation?: cdk.aws_apigateway.MethodOptions;

  constructor(
    private readonly scope: Construct,
    serviceName: string,
    namingProvider?: INamingProvider,
  ) {
    super(serviceName, namingProvider);
  }

  /**
   *
   * @param id - a unique identifier for the lambda with in the cdk scope
   * @param props - configuration setting for the lambda see {!IApiGatewayRouterProperties}
   * @returns an apigateway rest
   */
  public createApiGatewayRouter(
    id: string,
    props: IApiGatewayRouterProperties,
  ): apigateway.RestApi {
    const log = new logs.LogGroup(
      this.scope,
      `${this.getResourceId(id)}-AccesssLogs`,
      {
        encryptionKey: props.key,
        retention: props.retentionDays
          ? props.retentionDays
          : constants.RETENTIONDAYS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const apiProps = {
      description: props.description ? props.description : undefined,
      restApiName: this.getResourceName(props.name),
      domainName: props.domainName ? props.domainName : undefined,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(log),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        tracingEnabled: true,
        cacheClusterEnabled: true,
        cacheClusterSize: '0.5',
        methodOptions: {
          '/*/*': {
            cachingEnabled: true,
            cacheTtl: cdk.Duration.seconds(props.cacheDurationSeconds),
            cacheDataEncypted: true,
          },
        },
      },
    };

    return new apigateway.RestApi(this.scope, this.getResourceId(id), apiProps);
  }

  /**
   *
   * @param authorisation the type of authorsation that will be applied to all added routes
   */
  public setDefaultAuthorisation(
    authorisation: apigateway.MethodOptions,
  ): void {
    this.defaultAuthorisation = authorisation;
  }

  /**
   * Configures system to use IAM as it authorisor
   */
  public enableIamAuthorisation(): void {
    this.setDefaultAuthorisation({
      authorizationType: apigateway.AuthorizationType.IAM,
    });
  }

  /**
   *
   * @param authorisor a cogniteo authorisor
   * @param scopes the scope which are allowed
   */
  public enableCognitoAuthorisation(
    authorisor: apigateway.IAuthorizer,
    scopes?: string[],
  ): void {
    this.setDefaultAuthorisation({
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: authorisor,
      authorizationScopes: scopes,
    });
  }

  /**
   *
   * @param authorisor the customer authorisor to use
   */
  public enableCustomAuthoriser(authorisor: apigateway.IAuthorizer): void {
    this.setDefaultAuthorisation({
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: authorisor,
    });
  }

  /**
   *
   * @param id unique id for the scop of the stack
   * @param config an AuthoriserConfig detailing how the authorisation will. be preformed
   * @param api the api rest gateway to have the authorisation applied
   * @returns an authorisor based on the config
   */
  public createAuthorisor(
    id: string,
    config: AuthoriserConfig,
    api: apigateway.RestApi,
  ): apigateway.IAuthorizer {
    if (config.type === 'cognito') {
      return new apigateway.CognitoUserPoolsAuthorizer(
        api,
        this.getResourceId(id),
        {
          cognitoUserPools: config.userPools,
          identitySource:
            config.identitySource ?? 'method.request.header.Authorization',
          resultsCacheTtl:
            typeof config.resultsCacheTtlSeconds === 'number'
              ? cdk.Duration.seconds(config.resultsCacheTtlSeconds)
              : undefined,
        },
      );
    }

    return new apigateway.TokenAuthorizer(api, this.getResourceId(id), {
      handler: config.lambda,
      identitySource:
        config.identitySource ?? 'method.request.header.Authorization',
      validationRegex: config.validationRegex,
      resultsCacheTtl:
        typeof config.resultsCacheTtlSeconds === 'number'
          ? cdk.Duration.seconds(config.resultsCacheTtlSeconds)
          : undefined,
    });
  }

  /**
   *
   * @param route adds a route to the apigateway see {!ILambdaRoute} for details of the route
   * @param api the apigateway to add the rout too
   */
  public addRoute(route: ILambdaRoute, api: apigateway.RestApi): void {
    const resource = this.getResource(route.path, api);

    const integration = new apigateway.LambdaIntegration(route.lambda, {
      proxy: true,
    });

    route.methods.forEach((method) => {
      const methodOptions = route.auth ?? this.defaultAuthorisation;
      const methodConstruct = resource.addMethod(
        method,
        integration,
        methodOptions,
      );

      if (route.skipCheckovRule) {
        const cfnMethod = methodConstruct.node
          .defaultChild as apigateway.CfnMethod;

        cfnMethod.addMetadata('checkov', {
          skip: [
            {
              id: route.skipCheckovRule,
              comment:
                'Authorization is handled externally / API method is intentionally unauthenticated.',
            },
          ],
        });
      }
    });
  }

  /**
   *
   * @param routes adds multiple routes to the apigateway see {!ILambdaRoute} for details of the route
   * @param api the apigatway to have the routs added too
   */
  public addRoutes(routes: ILambdaRoute[], api: apigateway.RestApi): void {
    routes.forEach((route) => this.addRoute(route, api));
  }

  private getResource(
    path: string,
    api: apigateway.RestApi,
  ): apigateway.IResource {
    const parts = path.replace(/^\//, '').split('/').filter(Boolean);

    let current: apigateway.IResource = api.root;

    parts.forEach((part) => {
      current = current.getResource(part) ?? current.addResource(part);
    });

    return current;
  }
}
