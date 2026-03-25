---
parent: Once Platform Shared Tooling Architectural Decisions
nav_order: 1
---
# Create a centralized space for deployment of shared CDK constructs

## Context and Problem Statement

It is a goal of the Once Platform team to provide reusable CDK helpers, utilities and constructs 
to move some of the mental 'ops' load involved in setting up serverless projects away from dev
teams.

## Considered Options

* NPM
* GitHub Package Registry (PAT Token Authentication)
* GitHub Git Repo (HTTP/SSH Authentication)
* AWS CodeArtifact

## Decision Outcome

Pending/AWS CodeArtifact

### Consequences

Pending ("What will we need to do/build/create")

### Confirmation

Pending ("How will we verify this is done successfully")

## Pros and Cons of the Options

All options provide the common functionality of having private/public options, package namespaces,
and a reasonable authentication mechanism at the point of consumption. The following will focus on
specific benefits or challenges. 

### NPM

As an established package manager for JavaScript and TypeScript NPM.

* 😕 Token based authentication for consumers has a medium complexity to set up.
    * May be more hands-on or documentation focussed to assist users
    * Adds risk about committing tokens to repositories
    * Unclear how we'd handle token leakage
* 😕 Trust-policy (OIDC) workflow for publication pipelines has some setup complexity.
* 😕 Procurement/payment involvement for private packages
* 😕 Unclear on how account management would happen for on-boarders/leavers
* 😕 No lateral benefits

### GitHub (SSH)

Using npm's SSH remote referencing feature to point at tags

* 😕 GitHub actions don't have access to a valid SSH key, so deployment tokens might be necessary
* 😕 Potential friction with pre-existing developer authentication mechanisms
* 😕 Somewhat archaic syntax, no command line support.
* 😕 Sidesteps NPM ecosystem generally, no lateral benefits.
* 😊 Local Developers already have access to valid SSH keys as a part of their onboarding, so dX is improved for auth
* 😊 Already procured GitHub as a service.

### GitHub (PAT)

Using GitHub Artifact Registry and having developers acquire personal-access-tokens to use with their development environment

* 😕 GitHub Actions setup would require additional lift to provide runners with the necessary "pull"
roles; either via custom OIDC application or via copying across long-lived PATs.
* 😕 Token based authentication for consumers has a medium complexity to set up.
    * May be more hands-on or documentation focussed to assist users
    * Adds risk about committing tokens to repositories
    * Unclear how we'd handle token leakage
* 😊 Permissions model is easy to add to our existing GitHub onboarding/offboarding processes.
* 😊 Already procured GitHub as a service.

### AWS CodeArtifact

* 😊 Already procured AWS as a service
* 😊 Reasonable pricing model (wide bandwidth under the free tier)
* 😊 "One Liner" to configure a short lived token local build environment setup (provided via the AWS CLI)
    * Fast dev onboarding
    * Better security posture vs long-lived PATs
    * No manual `.npmrc` modifications - less risk of accidentally pushing credentials
* 😊 IAM Policy Across Accounts or Organizational Units and fine-tunable for both pull and push permissions
* 😊 Provides a read-through cache
* 😊 Allows us to blacklist packages
* 😊 Can later extend into other languages (eg Java) we may wish to support with the CDK constructs we create
* 😊 Single entity can be used to host multiple teams deployable repositories centrally

## More Information

TODO