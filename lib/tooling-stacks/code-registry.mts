// CodeRegistryStack.ts

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as codeartifact from "aws-cdk-lib/aws-codeartifact";

export class CodeRegistryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CodeArtifact domain
    const domain = new codeartifact.CfnDomain(this, "MyDomain", {
      domainName: "once-platform-registry",
      encryptionKey: `arn:aws:kms:${this.region}:${this.account}:alias/aws/codeartifact`,
    });

    // NPM Repository under this domain
    const repository = new codeartifact.CfnRepository(this, "MyNPMRepo", {
      domainName: domain.domainName,
      domainOwner: this.account,
      repositoryName: "once-platform-npm",
      description: "Repository for npm packages",
      externalConnections: ["public:npmjs"], // Allow Pull-Through Caching
    });

    // Temp: IAM role for reading from the repository
    // TODO: should this live here or be applied to worker + staff roles?
    const readRole = new iam.Role(this, "ReadNPMRepoRole", {
      assumedBy: new iam.AnyPrincipal(),
      inlinePolicies: {
        ReadPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["codeartifact:DescribePackageVersion"],
              resources: [`${repository.attrArn}/*`],
            }),
            new iam.PolicyStatement({
              actions: ["codeartifact:GetPackageVersionAssets"],
              resources: [`${repository.attrArn}/*`],
            }),
          ],
        }),
      },
    });

    // Temp: IAM role for writing to the repository
    // TODO: should this live here or be applied to worker + staff roles?
    const writeRole = new iam.Role(this, "WriteNPMRepoRole", {
      assumedBy: new iam.AnyPrincipal(),
      inlinePolicies: {
        WritePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["codeartifact:PublishPackageVersion"],
              resources: [`${repository.attrArn}/*`],
            }),
          ],
        }),
      },
    });

    // Outputs
    new cdk.CfnOutput(this, "RepositoryARN", {
      value: repository.attrArn,
    });

    new cdk.CfnOutput(this, "ReadRoleARN", {
      value: readRole.roleArn,
    });

    new cdk.CfnOutput(this, "WriteRoleARN", {
      value: writeRole.roleArn,
    });
  }
}

// TODO: Paramaterize me and move me somewhere sensible
const app = new cdk.App();
new CodeRegistryStack(app, "RegistryPullThroughStack");
