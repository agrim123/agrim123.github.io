---
layout: post
title: Performing cryptographic operations using AWS Nitro Enclaves
categories:
- aws
- nitro-enclave
- ecs
---

> AWS Nitro Enclaves enables customers to create isolated compute environments to further protect and securely process highly sensitive data such as personally identifiable information (PII), healthcare, financial, and intellectual property data within their Amazon EC2 instances. - [Official Docs](https://aws.amazon.com/ec2/nitro/nitro-enclaves/)

When dealing with highly sensitive computation, since we are always working in a shared-tenancy environment by default, the risk of information leaks arises. AWS offers Nitro Enclaves to protect these computations by abstracting out them to an isolated environment which reduces the attack surface area for most sensitive data processing applications, for example, signing a crypto transaction in which we have to load the private key of the wallet into the memory and then perform sign computation.

We will limit the scope of this blog to deploying such an environment in which we can safely run sensitive operations and not talk about the said operations. For example, we will talk about how to setup enclaves for doing cryptographic signing but not about how the actual signing works.

Let's first talk about what AWS offers with Nitro Enclaves:

### Security Guarantees by AWS

Enclaves are fully isolated virtual machines, hardened, and highly constrained. They have no persistent storage, no interactive access, and no external networking. Communication between your instance and your enclave is done using a secure local channel. Even a root user or an admin user on the instance will not be able to access or SSH into the enclave.

### Attestation

Attestation allows you to verify the enclave’s identity and that only authorized code is running in your enclave. The attestation process is accomplished through the Nitro Hypervisor, which produces a signed attestation document for the enclave to prove its identity to another party or service. This can be done using AWS KMS integration.

<hr />

Now let's dive into how to set up Nitro enclave and run application code inside of it.

## What is an enclave?

An enclave is a virtual machine with its kernel, memory, and CPUs. It is created by partitioning memory and vCPUs from a Nitro-based parent instance.

### How is the application code run inside of Enclave?

Nitro Enclaves introduces `eif` (enclave image files) format files from Application Code Docker Image, which is then supplied to Enclave to be run inside of the Nitro Enclave. We will see how to create this file and how to run it in upcoming sections.

### Enclave Connectivity

Enclave is not reachable from anywhere not even from the same instance, but **only** via a single local channel which. An enclave can not talk to the outside world, expect another outgoing channel, specifically configured for a particular endpoint, for example, KMS.

<hr />

## Architecture of deploying application code to Enclave
> You can run up to 4 enclaves on a single EC2 instance but no two enclaves can communicate directly, they have to go via the host vsock tunnel.


We will be deploying this application on AWS ECS backed by EC2 and AutoScaling Groups for easy scaling.

We will delegate the EIF file creation and Nitro Enclave management to the parent container of the service.

### Getting the application Docker image to AWS ECS

Application code is pushed to VCS, which is picked by CI/CD, builds the docker image, pushes to AWS ECR and then triggers ECS deployment (a very basic and normal flow). Till now there is nothing much going on. The main part starts after the deployment is triggered on AWS ECS.

### Building EIF on the parent instance

![Build EIF](/images/build-eif.png)

Let's go through the prerequisites before diving into how to build the image.

#### Nitro-Cli - Swiss knife for enclave management

You will need to [install](https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave-cli-install.html#install-cli) `nitro-cli` on the parent instance.

If you have followed the above installation steps in the link, you would have noticed that we need to configure something called `allocator service`. This is required and needs to be done before actually launching an enclave.

#### CPU and Memory Requirements for an Enclave

When choosing an instance for running Enclave, choose the one with enough CPU and memory to distribute for enclaves and the parent instance, for example, c6x.large (2 vCPU and 4GiB Memory).

Now back to building and launching an enclave.

We have the application docker image stored in ECR, which was fetched when deployment got triggered.

#### Dockerfile which powers the Enclave creation

```dockerfile
########################################
## Build Stage
########################################
FROM golang:1.20-alpine as builder

# Add a label to clean up later
LABEL stage=intermediate

ENV GO111MODULE=on

# install dependencies
ADD ./go.sum ./go.sum
ADD ./go.mod ./go.mod
RUN go mod download

# Add source code
ADD . .

# build the source
RUN CGO_ENABLED=0 GOOS=linux go build -o app

########################################
## Production Stage
########################################
FROM amazonlinux:2

RUN amazon-linux-extras install aws-nitro-enclaves-cli && \
    yum update -y && yum install aws-nitro-enclaves-cli-devel docker sudo shadow-utils -y  && yum -y clean all  && rm -rf /var/cache

ARG USERNAME=ec2-user
ARG USER_UID=1001
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME

RUN echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

RUN sudo usermod -aG ne $USERNAME
RUN sudo usermod -aG docker $USERNAME
RUN newgrp

USER $USERNAME

# set working directory
WORKDIR /home/$USERNAME

# Copy required files from the builder
COPY --from=builder /go/src/github.com/app ./app

CMD ["/home/ec2-user/app"]
```

The above Dockerfile has two stages
1. Building our Go service which just boils down to a binary and copied to our production stage.
2. Installing dependencies on the `amazonlinux` base.

The second step allows the running of docker and nitro-cli commands from inside this container.

##### Volumes for docker container

The running parent container requires some volumes to be mounted from the host to be able to perform, docker image building, eif building and running a nitro enclave. The following volumes are mounted to the container:
1. `/var/log/nitro_enclaves:/var/log/nitro_enclaves` - For viewing logs from the host container
2. `/etc/nitro_enclaves:/etc/nitro_enclaves` - For nitro enclave configs
3. `/dev/hugepages:/dev/hugepages` - For allocating memory for enclaves
4. `/var/run/docker.sock:/var/run/docker.sock` - For mounting docker sock for running sibling containers/or building images.

#### Running the parent container

When the parent container is deployed by the ECS agent a nitro-enabled machine, the following steps are kicked in which are run from our Go program.
1. Since the image for our enclave is the same as the parent container, (we are only changing the entry point), we get the docker image tag using `ECS_CONTAINER_METADATA_URI`.
2. Then we build the EIF file using this command `nitro-cli build-enclave --docker-uri <docker-image-from-step-1> --output-file output.eif`
<aside>measurements - means CPU and Memory requirements of the EIF file generated.</aside>
3. Then we describe this built `output.eif` file to get measurements.
4. Then we launch this eif from inside the container, making the parent container the *ONLY* one which can access this enclave. `"nitro-cli run-enclave--cpu-count 2 --memory 2634 --eif-path output.eif --enclave-cid enclave.cid`.

This runs the enclave within the parent container's context.

We can SSH into the parent container, and then run `nitro-cli console --enclave-name <name>`, which will open logs for the container running inside of the nitro enclave.

### Connecting to enclave via parent container

Since, we want to perform cryptographic operations inside the enclave, and we want to invoke AWS KMS functions we need a bit more addition to the current setup.

As mentioned earlier, no one can reach the enclave and the enclave can reach no one, hence, we need special provisions in place to make both of the aforementioned things happen.

#### API call from parent container to enclave

We run a [`socat`](https://hub.docker.com/r/alpine/socat/) sidecar which can connect from the parent container on port 8888 to the enclave's CID. The entry point of this sidecar will be `tcp-listen:8888,fork,reuseaddr vsock-connect:16:8888`.

#### Invoking AWS KMS operation from the enclave

AWS restricts KMS operations which can be invoked from inside of an enclave as mentioned [here](https://docs.aws.amazon.com/kms/latest/developerguide/services-nitro-enclaves.html).

For the enclave to invoke the, say Decrypt function of KMS, we need a _proxy_, which relays the request to KMS endpoints. 
Fortunately, nitro cli helper packages which we installed in Dockerfile come with a [`vsock-proxy`](https://github.com/aws/aws-nitro-enclaves-cli/blob/main/vsock_proxy/README.md) binary, which allows this communication.

We run a sidecar with the following entry point, `vsock-proxy 8000 kms.us-east-1.amazonaws.com 443`. This opens a vsock connection on the host and all the requests on the 8000 port from the enclave are forwarded to the 443 port of the public AWS KMS endpoint in the us-east-1 region.

### Closing Points

We have seen how to set up a simple enclave that interacts with AWS KMS and is deployed on AWS ECS.

What we have not discussed and can be improved in the current setup are:
1. How can we attest to the docker image that is being deployed in the enclave?
2. IAM roles are given to enclave to be able to interact with AWS KMS.

These questions are currently out of the scope of this article and will be explored in future articles.
