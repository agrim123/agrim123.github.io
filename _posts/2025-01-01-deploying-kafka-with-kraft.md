---
layout: post
title: Deploying Apache Kafka with KRaft
categories:
- aws
- kafka
- distributed-systems
---

This blog discusses how we can deploy a basic 3 broker Kafka Cluster with KRaft Protocol on AWS EC2 instances.

This was a personal exercise to learn about KRaft protocol and was only tested on a small scale. On production, went with AWS MSK.

> If you need a primer on Apache Kafka, I recommend reading [Kafka 101](/posts/kafka-kt.html)

Kafka needed Zookeeper until the community decided to implement their own self-managed solution, [KIP-500](https://cwiki.apache.org/confluence/display/KAFKA/KIP-500%3A+Replace+ZooKeeper+with+a+Self-Managed+Metadata+Quorum). The idea was to implement a self-managed metadata Quorum based on Raft protocol.

<hr />

We will discuss the existing Zookeeper model then dive why KRaft was needed and finally move into how to deploy Kafka cluster on AWS EC2.

<hr />

## What is Zookeeper model?

Kafka uses ZooKeeper to store its metadata about partitions and brokers, and to elect a broker to be the Kafka Controller.

## What is KRaft, and Why was it needed?

## Deploying Kafka Cluster with KRaft on AWS EC2 using ASGs

In short we need 2 ASGs, 1 for controller nodes and 1 for brokers. We need data EBS volumes for mounting to Brokers.



## Closing Notes

## References

- [KIP-500: Replace ZooKeeper with a Self-Managed Metadata Quorum](https://cwiki.apache.org/confluence/display/KAFKA/KIP-500%3A+Replace+ZooKeeper+with+a+Self-Managed+Metadata+Quorum)
- [KIP-833: Mark KRaft as Production Ready](https://cwiki.apache.org/confluence/display/KAFKA/KIP-833%3A+Mark+KRaft+as+Production+Ready)
- [KIP-866 ZooKeeper to KRaft Migration](https://cwiki.apache.org/confluence/display/KAFKA/KIP-866+ZooKeeper+to+KRaft+Migration)
- [KIP-778: KRaft to KRaft Upgrades](https://cwiki.apache.org/confluence/display/KAFKA/KIP-778%3A+KRaft+to+KRaft+Upgrades)