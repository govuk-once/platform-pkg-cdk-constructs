data "aws_caller_identity" "current" {}

resource "aws_kms_key" "this" {
  description             = "Symmetric key to encrypt codearfifact data"
  enable_key_rotation     = true
  deletion_window_in_days = 20
}

resource "aws_kms_key_policy" "codeartifact_kms_policy" {
  key_id = aws_kms_key.this.arn

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        },
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow administration of the key"
        Effect = "Allow"
        Principal = {
          AWS = var.push_roles_arns
        },
        Action = [
          "kms:ReplicateKey",
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Principal = {
          AWS = ["*"]
        },
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:Re_encrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_codeartifact_domain" "this" {
  domain         = "${var.name_prefix}"
  encryption_key = aws_kms_key.this.arn
}

resource "aws_codeartifact_repository" "this" {
  domain      = aws_codeartifact_domain.this.domain
  repository  = "${var.name_prefix}-repo"
  description = "GDS Once ${var.name_prefix} NPM Repository"

  external_connections {
    external_connection_name = "public:npmjs"
  }


}
data "aws_iam_policy_document" "this" {
  statement {
    effect    = "Allow"
    actions   = ["codeartifact:DescribePackageVersion",
                "codeartifact:DescribeRepository",
                "codeartifact:GetPackageVersionReadme",
                "codeartifact:GetRepositoryEndpoint",
                "codeartifact:ListPackages",
                "codeartifact:ListPackageVersions",
                "codeartifact:ListPackageVersionAssets",
                "codeartifact:ListPackageVersionDependencies",
                "codeartifact:ReadFromRepository"]
    resources = [aws_codeartifact_repository.this.arn]

    principals {
      type        = "AWS"
      identifiers = [for account in var.additional_accounts : "arn:aws:iam::${account}:root"]
    }
  }

  statement {
    effect    = "Allow"
    actions   = ["codeartifact:WriteToRepository"]
    resources = [aws_codeartifact_repository.this.arn]

    principals {
      type        = "AWS"
      identifiers = var.push_roles_arns
    }
  }
}

resource "aws_codeartifact_repository_permissions_policy" "this" {
  repository      = aws_codeartifact_repository.this.repository
  domain          = aws_codeartifact_domain.this.domain
  policy_document = data.aws_iam_policy_document.this.json
}
