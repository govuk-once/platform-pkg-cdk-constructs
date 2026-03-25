# ApiGateway Factory

## Description

Creates a Restful API gateway along with an encrypted log group. Makes use of the default name provider see [NamingProviders.md](NamingProviders.md) that ensures that the resource has an identifier pre-fix helping to create easily identifiable resources for the environment and the service.

The construct provides a number of helper functions to reduce the amount of logic required to add routes and authentications

## Constructor

The constructor has three parameters:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| scope | Construct | Ensure that resource is placed in the required stack | YES |
| serviceName | String | The name of the service which this resource is a part of | YES |
| namingProvider | INamingProvider | Creates a standardised pre-fix for object identifiers and names. Defaults to ServiceEnvironmentNamingProvider | NO  |

**Returns**: ApiGAtewayFactory

## Methods

### createApiGatewayRouter

Returns a restful Apigateway with an associated encrypted log group. The method takes two parameters:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| Id  | String | An identifier that is the suffix of the resource. | YES |
| Props | IApiGatewayRouteProperties | Details how the ApiGateway is to be configured. | YES |

**Returns**: apigateway.RestApi

### Properties

IApiGatewayRouteProperties informs the system how the Restful ApiGateway is to be configured:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| cacheDurationSeconds | Number | Determines the number of seconds the result of a call to a method will be cached for/ | YES |
| description | string | Human readable description of the purpose of the Api is | YES |
| Key | aws_kms key | Used to encrypt the log group | YES |
| name | String | The name of the ApiGateway. This will be prefixed according to the NamingProvider | YES |
| retentionDays | aws-log RetentionDays | Determines how long the logs will be stored for. Defaults to Two weeks | NO  |
| domainName | ApiGateway DomainNameOptions | Allows the ApiGateway to receive a route53 entry | NO  |

### setDefaultAuthorisation

Enables a default authorisation to be applied to all routes. This MUST BE CALLED BEFORE calling addRoute for it to have any effect.

**Returns**: void

Accepts one parameter:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| Authorisation | Apigateway MethodOption | The type of authorisation to be applied to all methods | YES |

### enableIamAuthorisation

Sets the default authorisation to use Iam authorisation see [setDefaultAuthorisation](#_setDefaultAuthorisation). Does not accept any parameters. This MUST BE CALLED BEFORE calling addRoute for it to have any effect.

**Returns**: void

### enableCognitoAuthorisation

Sets the default authorisation to use Cognito authorisation scopes see [setDefaultAuthorisation](#_setDefaultAuthorisation). This MUST BE CALLED BEFORE calling addRoute for it to have any effect.

Accepts two parameters:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| authoriser | Apigateway IAuthorizer | The object that provide the authorisation | YES |
| scopes | An array of strings | An array of scope names | NO  |

**Returns**: void

### enableCognitoAuthorisation

Sets the default authorisation to use Cognito authorisation scopes see [setDefaultAuthorisation](#_setDefaultAuthorisation). This MUST BE CALLED BEFORE calling addRoute for it to have any effect.

Accepts two parameters:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| authoriser | Apigateway IAuthorizer | The object that provide the authorisation | YES |
| scopes | An array of strings | An array of scope names | NO  |

**Returns**: void

### enableCustomAuthorisation

Sets the default authorisation to use a custom authorisation This MUST BE CALLED BEFORE calling addRoute for it to have any effect.

Accepts one parameters:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| authoriser | Apigateway IAuthorizer | The object that provide the authorisation | YES |

**Returns**: void

### createAuthorisation

A helper method to create an IAuthorizer based on the configuration that it is passed.

Flow for use if creating default Cognito authorisation: createAuthorisation-> [enableCognitoAuthorisation](#_enableCognitoAuthorisation)\-> addRoute

If the config.type equals "cognito" then a cognito authoriser is created otherwise a TokenAuthorizer is created.

Accepts three parameters:

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| Id  | string | The resource identifier | YES |
| Config | [AuthoriserConfig](#_Config_Parameters) | Details of how the authorise should be built | YES |
| Api | apiGateway RestApi | The Restful Apigateway to be associated with the authorisation | YES |

**Returns**: apigateway. IAuthorizer

### Config Parameters

Configuration is a union of two types:

#### Cognito configuration

<div class="joplin-table-wrapper"><table><tbody><tr><th><p><strong>Parameter Name</strong></p></th><th><p><strong>Type</strong></p></th><th><p><strong>Function</strong></p></th><th><p><strong>Required</strong></p></th></tr><tr><td><p>Type</p></td><td><p>string</p></td><td><p>Determine which authorizer to be built:</p><ul><li>cognito: builds a cognito authorizer</li><li>lambda: build a lambdaToken authoriser<br></li></ul></td><td><p>YES</p></td></tr><tr><td><p>userPools</p></td><td><p>An array of Cognito.IUserPool</p></td><td><p>Details of the users pools associated with the authorizer</p></td><td><p>YES</p></td></tr><tr><td><p>identitySource</p></td><td><p>String</p></td><td><p>Where the token is located in the request. If not ser defaults to Authorization header</p></td><td><p>NO</p></td></tr><tr><td><p>resultsCacheTtlSeconds</p></td><td><p>Number</p></td><td><p>How many second the result of the authorisation is cached for.</p></td><td><p>NO</p></td></tr></tbody></table></div>

#### Lambda configuration

<div class="joplin-table-wrapper"><table><tbody><tr><th><p><strong>Parameter Name</strong></p></th><th><p><strong>Type</strong></p></th><th><p><strong>Function</strong></p></th><th><p><strong>Required</strong></p></th></tr><tr><td><p>Type</p></td><td><p>string</p></td><td><p>Determine which authorizer to be built:</p><ul><li>cognito: builds a cognito authorizer</li><li>lambda: build a lambdaToken authoriser<br></li></ul></td><td><p>YES</p></td></tr><tr><td><p>Lambda</p></td><td><p>Lambda.IFunction</p></td><td><p>The lambda function that provide the custom functionality</p></td><td><p>YES</p></td></tr><tr><td><p>identitySource</p></td><td><p>String</p></td><td><p>Where the token is located in the request. If not ser defaults to Authorization header</p></td><td><p>NO</p></td></tr><tr><td><p>resultsCacheTtlSeconds</p></td><td><p>Number</p></td><td><p>How many second the result of the authorisation is cached for.</p></td><td><p>NO</p></td></tr><tr><td><p>validationRegex</p></td><td><p>string</p></td><td><p>A regular expression to validate the identity</p></td><td><p>NO</p></td></tr></tbody></table></div>

### addRoute

Adds a route the Restful Apigateway and associates it with the supplied Lambda Function.

Accepts two parameters

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| Route | [ILambdaRoute](#_ILambdaRoute) | Provides details of the route and the lambda | YES |
| Api | Apigateway.RestApi | The api gateway to assign the route | YES |

**Returns**: void

### ILambdaRoute

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| Path | String | The path section of an URL e.g.<br><br>Customers/{customerId}/{dataType} | YES |
| Methods | An array of strings | The HTTP verbs for the routing e.g:  <br>\["get","delete"\] | YES |
| Lambda | Lambda.IFunction | The lambda function that will process the request | YES |
| Auth? | Apigateway.MethodOptions | The authorisation object that will override the authorisation for this method | NO  |
| skipCheckovRule | String | The CheckovRule which can be ignored. E.g. @CKV_AWS_59 | NO  |

### addRoutes

Helper method to add multiple routes to a single Api Gateway.

Accepts two parameters

| **Parameter Name** | **Type** | **Function** | **Required** |
| --- | --- | --- | --- |
| Routes | An array of [ILambdaRoute](#_ILambdaRoute) | Provides details of the route and the lambda | YES |
| Api | Apigateway.RestApi | The api gateway to assign the route | YES |

**Returns**: void

## Example

### Create simple Apigateway with one lambda

import { App, Stack, aws_kms } from "aws-cdk-lib";

import \* as lambda from "aws-cdk-lib/aws-lambda" ;

import { ApiGatewayFactory } from "once-platform-constructs"

const serviceName = "SampleApp";

const app = new App();

const stack = new stack(app, "myStack");

const ApiFactory = new ApiGatewayFactory(stack, serviceName);

const fn = new lambda.Function(stack,"sampleFunction",{

runtime: lambda.Runtime.NODEJS_LATEST,

handler: "index.handler",

code: lambda.Code.fromInLine(

'exports.handler =async () => ({ statusCode:200, body:"ok"})',

),

});

const lambdaRoute = {

path: 'customers/{id},

methods: \['GET'\],

lambda: fn

};

const api = apiFactory.createApiGatewayRouter('myApi', {

cacheDurationSeconds: 10,

description: 'demo api',

key: logKey,

name: 'myApi'

});

apiFactory.addRoute(lambdaRoute, api);

## Known Issues