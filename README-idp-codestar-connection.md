# IDP MVP - GitHub CodeStar Connection

Creates the AWS CodeStar Connection that CodeBuild/CodePipeline will use
to authenticate to `https://github.com/HelloCody1000/idp.git`.

## 1. Create the connection

```bash
aws cloudformation create-stack \
  --stack-name idp-github-connection \
  --template-body file://idp-codestar-connection-stack.yaml

aws cloudformation wait stack-create-complete --stack-name idp-github-connection
```

## 2. Complete the manual authorization (required, one-time)

AWS cannot complete the GitHub OAuth handshake via the CLI - the
connection is created in `PENDING` status and must be finished in the
console:

1. Go to the AWS Console -> Developer Tools -> Settings -> Connections
   (or CodePipeline -> Settings -> Connections).
2. Find `idp-github-connection`, status `Pending`.
3. Click **Update pending connection**, choose "GitHub", and authorize
   the AWS Connector for GitHub app for the `HelloCody1000/idp`
   repository.
4. Status should flip to `Available`.

Check status from the CLI:

```bash
aws cloudformation describe-stacks --stack-name idp-github-connection \
  --query 'Stacks[0].Outputs'
```

## 3. Using it

Once `Available`, the `ConnectionArn` output is what a CodeBuild
project or CodePipeline GitHub source stage references to pull from
this repo. That CodeBuild project (the "Developer push -> CodeBuild ->
ECR" piece from `README-idp-environment.md`) doesn't exist yet - this
connection is the prerequisite for building it next.

## Tear down

```bash
aws cloudformation delete-stack --stack-name idp-github-connection
```
