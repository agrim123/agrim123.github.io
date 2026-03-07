---
layout: post
title: Deploying self-managed highly available, scalable, and resilient TimescaleDB cluster on AWS
categories:
- aws
- postgresql
- reliability
- timescaledb
---

Original Article Posted [here](https://www.linkedin.com/pulse/accelerating-time-series-data-performance-deploying-timescaledb-yzgvc/).

Mudrex is a global crypto investment platform and since asset prices are key to every investment platform, the problem statement is to reliably store and serve real-time and historical prices. This article talks about how we solved this problem and managed to get our p99 latencies from 2-3sec down to 90ms.

A little background on how and what data we store:
```
        time         |   open   |   high   |   low    |  close   |  volume

---------------------+----------+----------+----------+----------+----------

2022-08-17 04:01:00 | 24010.78 | 24020.64 | 24008.04 | 24013.01 | 69.44189

2022-08-17 04:02:00 | 24014.11 | 24019.94 | 24010.91 | 24018.27 | 44.59802

2022-08-17 04:03:00 | 24017.24 | 24020.19 |    24010 | 24016.92 |   48.663

2022-08-17 04:04:00 | 24018.27 | 24025.42 | 24016.45 | 24025.09 |  47.9079       
```

We store data per minute TOHLCV (timestamp, open, high, low, close, volume).

We have been running self-managed MongoDB (for over 2 years) as the data store, but have been facing scaling, storage, and many other issues, leading to higher downtimes and lower predictability of real-time prices.

On exploring options, we found [TimescaleDB](https://www.tigerdata.com/) suited our needs. Other considered options were InfluxDB and Managed MongoDB.

As you can infer from the sample data above, we have time series data, which makes TimescaleDB best for our use case.

In the early stages of our PoC, we explored Managed Timescale, but the costs were too high (including the running cost and data transfer). And thus we started exploring self-managed solutions.

# What is TimescaleDB?

> Engineered to efficiently handle resource-intensive workloads, like time series, event, and analytics data.

TimescaleDB is just an extension on top of native PostgreSQL. So it is very easy to enable and start using it. A simple command enables Timescale on a PostgreSQL instance __(provided you have [installed](https://www.tigerdata.com/docs/self-hosted/latest/install/installation-linux) Timescale dependencies)__.

Now let's dive into how we deployed a 3-node TimescaleDB cluster in our system.

## Benefits of TimescaleDB (improvements that we observed)

1. On-the-fly and real-time aggregated data.
2. Seconds to ~90ms p99 write latencies.
3. Seconds to ~30ms p99 read latencies.

## Why a 3-node cluster?

A minimum of 3 nodes are required to maintain a quorum and reach the leader election. It helps in disaster recovery and thus ensures high availability and is fault tolerant.

<hr />

# TimescaleDB Infrastructure

We have deployed the cluster on AWS EC2 using Auto Scaling Groups, AWS CloudMap, and AWS Lambda.

Here is the entire infrastructure diagram, we will dive into each component one by one:
![timescale-architecture.png](/images/timescale-architecture.png)

There are two major components in this system:

1. TimescaleDB PostgreSQL instances.
2. Proxy to query Timescale instances to protect them from excessive load.

## TimescaleDB Architecture
A typical TimescaleDB instance contains Patroni, Watchdog, and PostgreSQL with a TimescaleDB extension installed on it.
- etcd
- Patroni
- Watchdog
- TimescaleDB

### etcd
> etcd is a strongly consistent, distributed key-value store that provides a reliable way to store data that needs to be accessed by a distributed system or cluster of machines. It gracefully handles leader elections during network partitions and can tolerate machine failure, even in the leader node.

etcd is [deployed](https://etcd.io/docs/v3.3/platforms/aws/) on AWS ECS and follows a pretty standard procedure for deploying a 3-node cluster. etcd is heavily used by Patroni for managing the cluster and is the most critical part of this entire infrastructure.

### Patroni

> an automatic failover system for PostgreSQL. It provides automatic or manual failover and keeps all of the vital data stored in a distributed configuration store (DCS), we use etcd as DCS.

We use Patroni to manage the Timescale cluster. Patroni offers support for failovers, switchovers, pause or resume cluster members, and manages replications between timescale nodes.

Patroni stores cluster config in etcd. All new instances that want to join the cluster, query etcd, and discover the master for replication.

A typical Patroni config looks like this:

```yml
scope: timescaledbcluster # cluster name
name: -HOSTNAME-

# REST API
# api is used by HAProxy to route read/write traffic
restapi:
  listen: 0.0.0.0:8008
  connect_address: -PRIVATE_IP-:8008

# etcd (dcs)
# instructs patroni to use etcd as config store
etcd:
  host: -ETCD_DNS-:2379
  protocol: http

# PostgreSQL
postgresql:
  listen: 0.0.0.0:5432
  connect_address: -PRIVATE_IP-:5432
  ...

# watchdog
watchdog:
  mode: required
  device: /dev/watchdog
  safety_margin: 10
```

### Watchdog

> Helpful in split brain scenarios i.e. when Patroni itself becomes unresponsive.

Having multiple PostgreSQL servers running as master can result in transaction loss due to diverging timelines. This situation is also called a split-brain problem.

To avoid split-brain Patroni needs to ensure PostgreSQL will not accept any transaction commits after the leader key expires in etcd. Under normal circumstances, Patroni will try to achieve this by stopping PostgreSQL when the leader lock update fails for any reason. However, this may fail to happen due to various reasons:
- Patroni has crashed due to a bug, out-of-memory condition, or by being accidentally killed by a system administrator.
- Shutting down PostgreSQL is too slow.
- Patroni does not get to run due to high load on the system, the VM is paused by the hypervisor or other infrastructure issues.

To guarantee correct behavior under these conditions Patroni supports watchdog devices. Watchdog devices are software or hardware mechanisms that reset the whole system when they do not get a keepalive heartbeat within a specified timeframe. This adds a layer of fail-safe in case usual Patroni split-brain protection mechanisms fail.

[Patroni support for watchdog.](https://patroni.readthedocs.io/en/latest/watchdog.html)

### TimescaleDB

> TimescaleDB is the open-source relational database for time series and analytics. It is Postgres but for time series.

We install raw [PostgreSQL](https://www.devart.com/dbforge/postgresql/how-to-install-postgresql-on-linux/) and then manually enable the [TimescaleDB](https://www.tigerdata.com/docs/self-hosted/latest/install/installation-linux) extension after setup.

We set the installation script in the [user data script](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html).

(User Data Script is configured in the launch template and fed to AutoScalingGroup and is run on the instance startup before anything else.)

![timescale-instance.png](/images/timescale-instance.png)

### Timescale Proxy Architecture

The timescale proxy instance has two major components running on it to provide an effective proxy and load balancing for Timescale.

1. HAProxy
2. PgBouncer
3. Network Load Balancer

We have a proxy instance (containing PgBouncer and HAProxy) behind an [AWS Network Load Balance (NLB)](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html).

![timescale-proxy.png](/images/timescale-proxy.png)

#### Why do we need a proxy in front of TimescaleDB?

Generally, databases have limitations on how many concurrent connections they can support (this is not the same as their capacity to process concurrent queries), hence to protect the database instances from getting overloaded from clients, we put up a proxy setup in front of these databases.

The proxy setup that we are using consists of PgBouncer and HAProxy. PgBouncer is a connection pooler i.e. for every n connection from clients it makes only m connections to the database (n >> m), this way the database never gets overwhelmed, and greedy clients get stopped at PgBouncer.

The next problem is how PgBouncer effectively balances between read traffic. The answer is, that it doesn't. This is where HAProxy comes into play. As we already know we have _a single master and an even number of replicas_ PgBouncer can forward write queries to the leader node but cannot effectively balance read queries to replicas. HAProxy provides a lightweight load balancing on these replicas. The entire setup boils down to:
- Clients connect to PgBouncer, which in turn maintains a pool of connections with the database via HAProxy.
- Read and write traffic gets split at the PgBouncer level.

Now, since we have kept the proxy setup in front of databases, we can horizontally scale this setup independently from DB, and thus we keep this proxy setup behind another managed load balancer, i.e. AWS NLB which provides load balancing at OSI layer 4 (network layer).

### HAProxy

> HAProxy is a free, very fast, and reliable reverse proxy offering high availability, load balancing, and proxying for TCP and HTTP-based applications.

```yml
# Reference https://www.haproxy.com/blog/dns-service-discovery-haproxy/
# This dynamically uses Multivalue answer from A record to populate the servers
resolvers our_local
    nameserver our_local -RESOLVER-:53
    accepted_payload_size 8192

listen Standby
    bind *:5001
    balance roundrobin
    option httpchk OPTIONS /replica
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server-template timescale 3 -TIMESCALE_DNS-:5432 check resolvers our_local init-addr none maxconn 100 check port 8008

listen Primary
    bind *:5000
    option httpchk OPTIONS /master
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server-template timescale 3 -TIMESCALE_DNS-:5432 check resolvers our_local init-addr none maxconn 100 check port 8008        
```

The Standby and Primary blocks govern the read/write traffic split by querying Patroni's API to check whether an instance is a leader or a read replica.

### PgBouncer

> PgBouncer is a lightweight connection pooler for PostgreSQL.

```yml
[databases]
read=host=haproxy port=5000 dbname=<dbname> user=<user>
write=host=haproxy port=5001 dbname=<dbname> user=<user>

[users]
# ... users list from /etc/pgbouncer/userlist.txt

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction
server_check_query = select 1
server_lifetime = 360
max_client_conn = 16384
default_pool_size = 64
min_pool_size = 32
reserve_pool_size = 10
```

<br />

### Monitoring

Monitoring is a critical part of this system. Having visibility of every component is important to be able to debug any incidents.

We are also monitoring all the above components using Prometheus and Grafana Stack.

#### etcd
etcd exposes its metrics for Prometheus to scrape and these are then made available on Grafana.

#### Timescale Proxy
PgBouncer and HAProxy are monitored using sidecar containers running exporters for these components.

#### Timescale
Postgres exporter is running which ships the health of the Postgres instance.

A cron is also running on all Timescale instances which sends updates to slack channel about the cluster state. This cron runs on all replicas as well but only sends alerts from the master, so even if a leader goes down, we get alerts from the newly elected leader.

Example slack alert:
```
Environment: staging
IAM: ip1 (master)
+ Cluster: timescaledbcluster ---------+---------+----+-----------+
| Member        | Host       | Role    | State   | TL | Lag in MB |
+---------------+------------+---------+---------+----+-----------+
| ip1           | ip1        | Leader  | running |  8 |           |
| ip2           | ip2        | Replica | running |  8 |         0 |
| ip3           | ip2        | Replica | running |  8 |         0 |
+---------------+------------+---------+---------+----+-----------+
Uptime: 168 days
```
<br/>
This completes our HA setup of TimescaleDB.
<br/>

## Towards a more resilient infrastructure

In the current system (what we have talked about till now), we have successfully deployed a 3-node PostgreSQL cluster on EC2 and 3 Proxy instances behind NLB.

A few questions arise:
- What if the master goes down? (reliability, failover)
- What if I have to add a new node to the cluster? (horizontally scalable)
- What if 1 node goes down? How does the new node come up fast? (resilience)
- How do the dead nodes get removed from the system and DNS as ASG don't support direct DNS record update on CloudMap? (resilience)

We answer each of these questions below:

### What if the master goes down? (reliability, failover)
If the master goes down (becomes unresponsive) due to any reason, Patroni elects a new master and the cluster operates normally.

### What if I have to add a new node to the cluster? (horizontally scalable)
On adding a new node to the cluster, the Patroni on the new node fetches cluster config from etcd and starts replicating data from the master.

### What if 1 node goes down? How does the new node come up fast? (resilience)
We don't use root EBS for storing data, instead, we use a separate EBS disk (aka data disk) for storing data.

Root EBS is merely 10GB which houses the OS, config files, etc. On the other hand, the data EBS can grow up to 1TB as per the data requirement.

Since Data EBS doesn’t have any node-specific data, it allows us to attach it to any upcoming replica or even leader, to prevent replication from 0, this saves us a lot of time and network bandwidth.

![ebs-lifecycle.png](/images/ebs-lifecycle.png)

From the above image, say Replica 1 gets terminated, the Root EBS also gets destroyed, but the Data EBS Disk 2 is kept and now becomes available. When a new replica comes up, it looks up if any of the Data EBSs are available, if yes it mounts it (already having some data), else creates a new one.

We have a bash script in the User Data script which checks if such a disk is available in the pool, if yes it attaches that to itself, else spawns a new disk of a fixed size and attaches that.

### How do the dead nodes get removed from the system and DNS as ASG don't support direct DNS record update on CloudMap? (resilience)
To make the timescale infra more resilient, we need to deregister bad/terminated instances from the AWS CloudMap (service discovery). This is achieved by autoscaling the group's lifecycle policies which invokes a Lambda, which in turn has the responsibility to invoke the DeregisterInstance function for the given CloudMap service.

![dns-de-registration.png](/images/dns-de-registration.png)

## References

- [TimescaleDB](https://www.tigerdata.com/)
- [HAProxy](https://www.haproxy.org/)
- [PgBouncer](https://www.pgbouncer.org/config.html)
- [etcd](https://etcd.io/)
- [Patorni](https://patroni.readthedocs.io/en/latest/)
- [PostgreSQL 13 Cookbook](https://www.flipkart.com/postgresql-13-cookbook/p/itm2930cc92ff793)
- [Performance isolation in a multi-tenant database environment](https://blog.cloudflare.com/performance-isolation-in-a-multi-tenant-database-environment/)
- [Open sourcing our fork of PgBouncer](https://blog.cloudflare.com/open-sourcing-our-fork-of-pgbouncer/)
- [When Boring is Awesome: Building a Scalable Time-Series Database on PostgreSQL](https://www.tigerdata.com/blog/when-boring-is-awesome-building-a-scalable-time-series-database-on-postgresql-2900ea453ee2)
