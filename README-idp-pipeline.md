# IDP MVP - CI/CD pipeline

Reusable CloudFormation template that gives one app a full CI/CD
pipeline: push to GitHub -> CodeBuild builds the app and pushes a
tagged image to ECR -> CloudFormation updates that app's
`idp-service-stack.yaml` deployment with the new image. This replaces
the manual build/push/deploy steps in `README-idp-service.md`.

Files:
- `idp-pipeline-stack.yaml` - the reusable pipeline template
- `idp-pipeline-params-js-app.json` / `idp-pipeline-params-java-app.json` - one per app
- `apps/js-app/buildspec.yml` / `apps/java-app/buildspec.yml` - what CodeBuild runs

Requires, in order:
1. `idp-environment-stack.yaml` deployed (VPC/cluster/ALB/ECR/roles)
2. `idp-codestar-connection-stack.yaml` deployed **and authorized** in
   the console (status `Available`, not `Pending`) - the pipeline's
   Source stage will fail auth until this is done

## What each pipeline does

1. **Source** - CodeStarSourceConnection pulls from
   `HelloCody1000/idp`, branch `develop`. A `Triggers` block scopes
   each pipeline to only fire when files under that app's directory
   change (`apps/js-app/**` or `apps/java-app/**`), so a push touching
   only one app doesn't rebuild the other.
2. **Build** - CodeBuild runs that app's `buildspec.yml`:
   `npm install` (js-app) or `mvn package` (java-app), then
   `docker build` / tag / push to that app's ECR repo. It also writes
   a `deploy-params.json` artifact containing the freshly pushed image
   URI plus this app's other `idp-service-stack.yaml` parameters.
3. **Deploy** - a native CodePipeline CloudFormation action runs
   `CREATE_UPDATE` on stack `idp-mvp-<app-name>` using
   `idp-service-stack.yaml` + that `deploy-params.json`, under a
   dedicated `CloudFormationDeployRole` scoped to ECS/ALB actions plus
   `iam:PassRole` on the two task roles from the environment stack.

## Deploy a pipeline

This repo is public, so `CodeStarConnectionArn` in the checked-in
params files is left as a placeholder rather than your real ARN
(ARNs embed your AWS account ID). Substitute it into a local,
not-committed copy before deploying:

```bash
CONNECTION_ARN=$(aws cloudformation describe-stacks \
  --stack-name idp-github-connection \
  --query "Stacks[0].Outputs[?OutputKey=='ConnectionArn'].OutputValue" \
  --output text)

sed "s#REPLACE_WITH_CONNECTION_ARN#$CONNECTION_ARN#" \
  idp-pipeline-params-js-app.json > idp-pipeline-params-js-app.local.json

aws cloudformation create-stack \
  --stack-name idp-mvp-js-app-pipeline \
  --template-body file://idp-pipeline-stack.yaml \
  --parameters file://idp-pipeline-params-js-app.local.json \
  --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-create-complete --stack-name idp-mvp-js-app-pipeline
```

The `.local.json` files are gitignored - never commit them.

Same for java-app with `idp-pipeline-params-java-app.json` and stack
name `idp-mvp-java-app-pipeline`.

## Known risk - not yet live-tested

The per-app path filtering (`Triggers.GitConfiguration.Push[].FilePaths`)
requires `PipelineType: V2` and is a newer CodePipeline feature. The
template is syntactically valid per `aws cloudformation validate-template`,
but that command does not deep-validate resource properties - if the
`Triggers` shape is wrong, the actual error will only surface at
`create-stack` time. If that happens, the fallback is to delete the
`Triggers` block entirely (the pipeline will then trigger on every push
to the branch regardless of which app changed, which still works - it's
just less efficient).

## Tear down

```bash
aws cloudformation delete-stack --stack-name idp-mvp-js-app-pipeline
aws cloudformation delete-stack --stack-name idp-mvp-java-app-pipeline
```

The S3 artifact bucket created per pipeline will fail to delete if it
still has objects in it - empty it first if needed:

```bash
aws s3 rm s3://idp-mvp-js-app-pipeline-artifacts-<account-id> --recursive
```
