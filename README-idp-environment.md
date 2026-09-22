# IDP MVP - environment stack

Disposable CloudFormation stack for testing the IDP build/deploy flow
(Developer push -> CodeBuild -> ECR -> Proton/ECS Fargate). Creates
the shared platform resources only: VPC, ECS cluster, ALB, ECR repos
for js-app and java-app, IAM roles, and a log group. No per-service
task definitions or target groups yet - those come from the Proton
service template, added later.

Files:
- `idp-environment-stack.yaml` - the CloudFormation template
- `idp-environment-params.json` - default parameter values

## Deploy

```bash
aws cloudformation create-stack \
  --stack-name idp-mvp-environment \
  --template-body file://idp-environment-stack.yaml \
  --parameters file://idp-environment-params.json \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-create-complete --stack-name idp-mvp-environment
```

## Check outputs

```bash
aws cloudformation describe-stacks \
  --stack-name idp-mvp-environment \
  --query 'Stacks[0].Outputs'
```

These outputs (VPC/subnet IDs, cluster name, ALB ARN/DNS, security
group IDs, task role ARNs, ECR repo URIs) are what a Proton
environment/service template - or a hand-written CDK service stack -
would reference to attach a real service and target group to this
shared infra.

## Tear down

```bash
aws cloudformation delete-stack --stack-name idp-mvp-environment
aws cloudformation wait stack-delete-complete --stack-name idp-mvp-environment
```

ECR repos will fail to delete if they still contain images - if you
pushed any test images during the session, delete those first:

```bash
aws ecr delete-repository --repository-name js-app --force
aws ecr delete-repository --repository-name java-app --force
```

(`--force` deletes the repo even if it has images; only needed if
`delete-stack` reports the ECR repos as a deletion failure.)
