
variable "region" {
  description = "AWS Region"
  type        = string
  default     = "eu-west-2"
}

variable "name_prefix" {
  description = "Prefix for the CodeArtifact domain and repository names"
  type        = string
}

variable "additional_accounts" {
  description = "List of additional AWS account IDs to grant read access, eg [\"123456789012\", \"234567890123\"]"
  type        = list(string)
}

variable "push_roles_arns" {
  description = "List of IAM role ARNs that will have push access"
  type        = list(string)
  default     = []
}
