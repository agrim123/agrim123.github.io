---
layout: post
title: Extensively monitoring spark-jobs with StatsD
comments: true
categories:
- spark
- monitoring
- prometheus
- statsd
---

This post is a continuation with [Monitoring Spark jobs with Prometheus StatsD Exporter and Grafana](/spark/monitoring/prometheus/statsd/2019/12/11/spark-statsd-prometheus-grafana/)

In the previous post, we were just running statsd on the master node. Our aim here is for every node to have its statsd sidecar and prometheus scraping metrics from all of them.

A high-level diagram of what we are trying to do here

```bash
        (Executor 1)                          (Executor 2)
 [Service -> StatsdSink over UDP]    [Service -> StatsdSink over UDP]
             |                                     |
             ▼                                     ▼
 [StatsD Prometheus Exporter]          [StatsD Prometheus Exporter]
             |                                     |
             |                    _________________|
             |                    |
             ▼                    ▼
        +----------------------------+    
        |    Prometheus Scraper      |        +----------+  
        |         using EC2          |-------►|  Grafana |
        |     service discovery      |        +----------+
        +----------------------------+
             ▲                    ▲
             |                    |________________
             |                                     |
             |                                     |
 [StatsD Prometheus Exporter]          [StatsD Prometheus Exporter]
             ▲                                     ▲
             |                                     |
 [Service -> StatsdSink over UDP]    [Service -> StatsdSink over UDP]
        (Executor 3)                          (Executor 4)
```

We need statsd daemon on every executor.
```bash
docker pull prom/statsd-exporter:v0.14.1
docker run -d -p 9102:9102 -p 9125:9125 -p 9125:9125/udp --name statsd prom/statsd-exporter:v0.14.1
```

## metrics.properties

```bash
*.sink.statsd.class=org.apache.spark.metrics.sink.StatsdSink
*.sink.statsd.prefix=spark
*.sink.statsd.host=127.0.0.1
*.sink.statsd.port=9125
```

## prometheus.yml

```yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 15s

scrape_configs:
  - job_name: "my-job"
    metrics_path: /metrics
    params:
      format: ["prometheus"]
    ec2_sd_configs:
      - region: "<aws-region>"
        port: 9102
        refresh_interval: 15m
    relabel_configs:
      - source_labels: [ __meta_ec2_tag_Name ]
        regex: my-job
        action: keep
      - source_labels: [__meta_ec2_tag_Name]
        target_label: instance
```

## EC2 tag-based discovery

EC2 SD configurations allow retrieving scrape targets from AWS EC2 instances.

## References

- [ec2_sd_config](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#ec2_sd_config)
- [Automatic Monitoring for new aws instances](https://medium.com/investing-in-tech/automatic-monitoring-for-all-new-aws-instances-using-prometheus-service-discovery-97d37a5b2ea2)