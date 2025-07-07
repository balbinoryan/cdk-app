## Project Structure

```
cdk-app/
├── lib/
│   └── cdk-app-stack.ts 
├── TestApp/ 
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements.txt
│   └── <django app code>
├── .github/
│   └── workflows/
│       └── deploy.yml
├── cdk.json
├── package.json
└── tsconfig.json
```

---

**TestApp/Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . /app/

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "testapp.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## AWS CDK Infrastructure

**lib/cdk-app-stack.ts**

```ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'TestAppVPC', { maxAzs: 2 });

    const cluster = new ecs.Cluster(this, 'TestAppCluster', {
      vpc,
      clusterName: 'testapp-cluster'
    });

    new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'TestAppService', {
      cluster,
      cpu: 256,
      desiredCount: 1,
      memoryLimitMiB: 512,
      publicLoadBalancer: true,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('<AWS_ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/<ECR_REPOSITORY_NAME>:latest'),
        containerPort: 8000,
      },
    });
  }
}
```

---

## ECR Repository

```bash
aws ecr create-repository --repository-name testapp --region us-east-1
```

---

## GitHub Actions CI/CD Pipeline

**.github/workflows/deploy.yml**

```yaml
name: automated deploy to aws

on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: build, push and deploy
    runs-on: self-hosted

    env:
      AWS_REGION: ${{ secrets.AWS_REGION }}
      ECR_REPOSITORY_NAME: ${{ secrets.ECR_REPOSITORY_NAME }}
      AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}

    steps:
      - name: checkout source code
        uses: actions/checkout@v4

      - name: configure credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: login ecr
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: list files for debug
        run: ls -l

      - name: list TestApp folder for debug
        run: pwd;ls -l ./TestApp/ || echo "Folder TestApp not found"

      - name: build and push docker image
        run: |
          IMAGE_URI=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:latest
          docker build --platform linux/amd64 -t $IMAGE_URI ./TestApp/
          docker push $IMAGE_URI

      - name: Install Node and dependencies
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install CDK and project dependencies
        run: |
          npm install -g aws-cdk
          npm ci

      - name: CDK Deploy
        run: |
          cdk deploy --require-approval never

```

---

## GitHub Secrets Setup

Add these secrets in GitHub → `Settings > Secrets > Actions`:

| Name                     | Description                     |
| ------------------------ | ------------------------------- |
| AWS\_ACCESS\_KEY\_ID     | IAM access key ID               |
| AWS\_SECRET\_ACCESS\_KEY | IAM secret key                  |
| AWS\_REGION              | AWS region (e.g., `us-east-1`)  |
| AWS\_ACCOUNT\_ID         | AWS 12-digit account number     |
| ECR\_REPOSITORY\_NAME    | ECR repo name (e.g., `testapp`) |

---

## Deployment Process

1. Make a commit to the `main` branch.
2. GitHub Actions will:
   - Build a Docker image with the correct platform (`linux/amd64`).
   - Push the image to Amazon ECR.
   - Deploy infrastructure with AWS CDK to ECS Fargate.
3. The app becomes available via the Load Balancer URL.

---

## Public application URL

```
http://cdkapp-testa-8mfew1y76qbf-531564463.us-east-1.elb.amazonaws.com/
```

---

### What principles did you apply?

- **Infrastructure as Code**: Implemented using AWS CDK in TypeScript.
- **Immutable Infrastructure**: Built and deployed a containerized Django application.
- **Automation & CI/CD**: Used GitHub Actions for full automation.
- **Platform Compatibility**: Ensured correct architecture (`linux/amd64`) for ECS compatibility.

### Why did you choose this approach?

- ECS Fargate simplifies container orchestration without managing EC2.
- CDK offers strong type safety and reusable code patterns.
- GitHub Actions allows seamless automation integrated with the repository.
- Amazon ECR securely stores Docker images and integrates with ECS.

### If you had more time, what would you add?

- HTTPS and custom domain via Route 53 and ACM.
- CloudWatch logs and metrics.
- SSM/Secrets Manager for secret handling.
- Auto-scaling and better container health management.

### Recommendations for future improvements

- Add unit tests and security checks to CI.
- Enable blue/green deployments.
- Modularize CDK codebase for reusability.
- Improve monitoring and alerting setup.