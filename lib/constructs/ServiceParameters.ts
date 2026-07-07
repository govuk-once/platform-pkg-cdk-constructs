import * as cdk from 'aws-cdk-lib';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export class ServiceParameters {
  private hostedZoneNamecache: cdk.aws_ssm.IStringParameter | undefined;
  private hostedZoneIdcache: cdk.aws_ssm.IStringParameter | undefined;
  private hostedZonecache: cdk.aws_route53.IHostedZone | undefined;
  private acmCertArnCache: cdk.aws_ssm.IStringParameter | undefined;
  private certificateCache: ICertificate | undefined;

  constructor(private readonly scope: Construct) {}

  public hostedZoneName(): string {
    if (!this.hostedZoneNamecache) {
      this.hostedZoneNamecache =
        cdk.aws_ssm.StringParameter.fromStringParameterName(
          this.scope,
          `HostedZoneName`,
          '/infra/dns/hostedzonename',
        );
    }
    return this.hostedZoneNamecache.stringValue;
  }

  public hostedZoneId(): string {
    if (!this.hostedZoneIdcache) {
      this.hostedZoneIdcache =
        cdk.aws_ssm.StringParameter.fromStringParameterName(
          this.scope,
          `HostedZoneId`,
          '/infra/dns/hostedzoneid',
        );
    }

    return this.hostedZoneIdcache.stringValue;
  }

  public acmCertArn(): cdk.aws_ssm.IStringParameter {
    if (!this.acmCertArnCache) {
      this.acmCertArnCache =
        cdk.aws_ssm.StringParameter.fromStringParameterName(
          this.scope,
          'acmCertArn',
          '/infra/acm/certificatearnregional',
        );
    }
    return this.acmCertArnCache;
  }

  // store reference to local infra resources
  public zone(): cdk.aws_route53.IHostedZone {
    if (!this.hostedZonecache) {
      this.hostedZonecache =
        cdk.aws_route53.HostedZone.fromHostedZoneAttributes(
          this.scope,
          'HostedZone',
          {
            zoneName: this.hostedZoneName(),
            hostedZoneId: this.hostedZoneId(),
          },
        );
    }
    return this.hostedZonecache;
  }

  public certificate(): ICertificate {
    if (!this.certificateCache) {
      this.certificateCache =
        cdk.aws_certificatemanager.Certificate.fromCertificateArn(
          this.scope,
          'AcmCertificate',
          this.acmCertArn().stringValue,
        );
    }
    return this.certificateCache;
  }
}
