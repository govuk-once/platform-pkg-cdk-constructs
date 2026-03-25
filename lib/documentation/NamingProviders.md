# Naming Providers

## Description

A suite of functions that provide a method of ensuring that resources are unique within a stack and that global resources are named in a manner that only the stack that created them will reference them. This package is built up from one interface and two default implementations of that interface.

| **Name** | **Type** | **Function** |
| --- | --- | --- |
| INamingProvider | Interface | Defines the contract |
| NullNamingProvider | Class | Provides a naming provide which does not pre-fix an identity or a name |
| ServiceEnvironmentNamingProvider | Class | Creates a standardised pre-fix for object identifiers and names. Construct factories default to using this provider |

## INamingProvider

Defines the contract for any class that wishes to provide Identity and name pre-fixing

## Methods

### getPrefix

Accepts no parameters. Returns a string of the pre-fix that will be applied when calling getResourceId and getResourceName

**Returns**: string

### getResourceId

Accepts one parameter

| **Parameter Name** | **Type** | **Function** |
| --- | --- | --- |
| Id  | String \| undefined | The passed in value will be pre-fixed as defined by the method |

**Returns**: string | undefined

### getResourceName

Accepts one parameter

| **Parameter Name** | **Type** | **Function** |
| --- | --- | --- |
| name | String | The passed in value will be pre-fixed as defined by the method |

## NullNamingProvider

Implements INamingProvider. The values pass to the methods getResourceId and getResourceName return the value that was provided.

## Methods

### getPrefix

Accepts no parameters. Returns an empty string.

**Returns**: string

### getResourceId

Accepts one parameter. Returns the parameter that was passed in the parameter id.

| **Parameter Name** | **Type** | **Function** |
| --- | --- | --- |
| id  | String \| undefined | The passed in value will be pre-fixed as defined by the method |

**Returns**: string | undefined

### getResourceName

Accepts one parameter. Returns the parameter that was passed in the parameter name.

| **Parameter Name** | **Type** | **Function** |
| --- | --- | --- |
| name | String | The passed in value will be pre-fixed as defined by the method |

## Example

Import { NullNamingProvider } from 'once-platform-constructs/namingProviders'

const provider = new NullNamingProvider();

const id = provider.getResourceId('myLambda');

## ServiceEnvironmentNamingProvider

Implements INamingProvider. The values pass to the methods getResourceId and getResourceName return the value that was provided pre fixed by the serviceName and the environment.

## Constructor

Takes one parameter

| **Parameter Name** | **Type** | **Function** |
| --- | --- | --- |
| serviceName | String | The name of the service. If no service name is passed it defaults to 'service name not set' |

**Returns**: INamingProvider

## Methods

### getPrefix

Accepts no parameters. Returns a string built ad follows {environment}-{serviceName} all will be transformed into lowercase letters. Environment is determined from the process env variables ENVIRONMENT if that is not set it will default to USER. If that is not set it will throw an exception

**Returns**: string

### getResourceId

Accepts one parameter. Returns the parameter that was passed in the parameter id pre-fixed with [getPrefix](#_getPrefix).

e.g. getResourceId('myWriteLambda') with service name = "dataService" and running in production will return "production-dataservice-myWriteLambda"

| **Parameter Name** | **Type** | **Function** |
| --- | --- | --- |
| id  | String \| undefined | The passed in value will be pre-fixed as defined by the method. It will return the id pre-fixed with {environment}-{serviceName}. |

**Returns**: string | undefined

### getResourceName

Accepts one parameter. Returns the parameter that was passed in the parameter id pre-fixed with [getPrefix](#_getPrefix).

e.g. getResourceName('myTable') with service name = "dataService" and running in production will return "production-dataservice-myTable"

| **Parameter Name** | **Type** | **Function** |
| --- | --- | --- |
| name | String | The passed in value will be pre-fixed as defined by the method. It will return the id pre-fixed with {environment}-{serviceName}. |

**Returns**: string

## Example

Import { ServiceEnvironmentNamingProvider } from 'once-platform-constructs/namingProviders'

const provider = new ServiceEnvironmentNamingProvider ('myService');

const id = provider.getResourceId('myLambda');

## Known Issues