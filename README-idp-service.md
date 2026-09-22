# IDP MVP - service stack

Reusable CloudFormation template that deploys one app (task definition,
target group, ALB listener rule, ECS service) onto the shared
`idp-environment-stack.yaml` infrastructure. This is the piece a build
pipeline / UI would eventually trigger automatically after pushing a new
image - for now it's run by hand to prove the flow works.

Files:
- `idp-service-stack.yaml` - the reusable CloudFormation template
- `idp-service-params-js-app.json` - params for the js-app service
- `idp-service-params-java-app.json` - params for the java-app service
- `apps/js-app/` - hello-world Node app + Dockerfile
- `apps/java-app/` - hello-world Java app + Dockerfile

Requires `idp-environment-stack.yaml` to already be deployed (see
`README-idp-environment.md`) - this template imports that stack's
exported outputs (VPC, subnets, cluster, ALB listener, IAM roles, log
group) by name, using the `EnvironmentName` parameter (must match the
`ProjectName` used for the environment stack, default `idp-mvp`).

## 1. Build and push an image

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)

aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

docker build -t js-app apps/js-app
docker tag js-app:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/js-app:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/js-app:latest
```

Repeat with `apps/java-app` / `java-app` for the Java service.

## 2. Fill in ImageUri and deploy

Edit `idp-service-params-js-app.json` and set `ImageUri` to the pushed
image URI above, then:

```bash
aws cloudformation create-stack \
  --stack-name idp-mvp-js-app \
  --template-body file://idp-service-stack.yaml \
  --parameters file://idp-service-params-js-app.json

aws cloudformation wait stack-create-complete --stack-name idp-mvp-js-app
```

Same for java-app with `idp-service-params-java-app.json` and stack
name `idp-mvp-java-app`. Each service gets its own `ListenerPriority`
and `ListenerPathPattern` so both can share the one ALB.

## 3. Check it's live

```bash
aws cloudformation describe-stacks --stack-name idp-mvp-js-app \
  --query 'Stacks[0].Outputs'
```

Take the `AlbDnsName` output and hit it at the service's path pattern
(minus the trailing `*`), e.g. `http://<alb-dns>/js-app`.

## Updating after a new image push

Re-push the image (new tag or `:latest`), then update the stack with
the same command as create but `update-stack` instead of `create-stack`
- CloudFormation will register a new task definition revision and roll
the ECS service to it.

## Tear down

```bash
aws cloudformation delete-stack --stack-name idp-mvp-js-app
aws cloudformation delete-stack --stack-name idp-mvp-java-app
```

Delete service stacks before deleting the environment stack, since they
import its exports.
