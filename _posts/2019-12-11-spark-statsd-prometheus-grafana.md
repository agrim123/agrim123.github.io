---
layout: post
title: Monitoring Spark jobs with Prometheus StatsD Exporter and Grafana
comments: true
categories:
- spark
- monitoring
- prometheus
- statsd
---

### Aim

```bash
+-------------+           +-------------+        +--------------+
|  Spark Job  |-- Push --►| StatsD Sink |-------►|   Exporter   |
+-------------+           +-------------+        +--------------+
                                                        ▲
                                                        |
                                        Scrape /metrics |
                                                        |
                                                 +--------------+
                                                 |  Prometheus  |
                                                 +--------------+
                                                        |
                                                        |
                                                        |
                                                        ▼
                                                 +--------------+
                                                 |    Grafana   |
                                                 +--------------+
```

Spark job pushes metrics to [statsD](https://github.com/statsd/statsd) sink (on statsD:9125) and these metrics are available on statsD:9102 for [prometheus](https://prometheus.io/) to scrape. Prometheus then can be added as datasource on [Grafana](https://grafana.com/) for visualization.

### How

Spark has a configurable metrics system that allows it to report metrics to various sinks<sup>[1](#furthur-read)</sup>. The metric system can be configured via a config file, passed to spark-submit via `--files` option.

In this post we are using **StatsD** Sink for reporting our metrics. Since, spark has inbuilt capibilty to report metrics to StatsD, our work is much easier (compared to if we had to push metrics directly to prometheus<sup>[2](#furthur-read)</sup>).

Starting off with the `metrics.properties`<sup>[3](#furthur-read)</sup> file to tell spark that it needs to send metrics to StatsD sink.

```bash
# Sample metrics.properties file

*.sink.statsd.class=org.apache.spark.metrics.sink.StatsdSink
*.sink.statsd.prefix=spark
*.sink.statsd.host=<host>
*.sink.statsd.port=9125
```
> Note the sink class [is](https://github.com/apache/spark/blob/master/core/src/main/scala/org/apache/spark/metrics/sink/StatsdSink.scala#L29) `StatsdSink` and not `StatsDSink`.

Now, before running our spark job we need to set up statsD exporter. Prometheus has an [official](https://github.com/prometheus/statsd_exporter) exporter for this job. We just need the docker image and our work is done!

A sample docker-compose file for exporter, prometheus and grafana.
```yml
version: "3"
services:
  prometheus:
    image: prom/prometheus
    command: --config.file=/etc/prometheus/prometheus.yml
    ports:
      - 9090:9090
    volumes:
      - /path/to/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - 3000:3000
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=*******

  statsd:
    image: prom/statsd-exporter
    command: --statsd.mapping-config=/tmp/statsd_mapping.yml
    ports:
      - 9102:9102
      - 9125:9125
      - 9125:9125/udp
    volumes:
      - /path/to/statsd_mapping.yml:/tmp/statsd_mapping.yml
```
The config files, `prometheus.yml` and `statsd_mapping.yml` can be tuned according to the needs.

Finally running our spark job
```bash
spark-submit \
--deploy-mode cluster \
--master yarn \
--conf spark.metrics.conf=metrics.properties \
--files /path/to/metrics.properties \
--class some.class /path/to/my_app.jar noob
```

The above solution works like a charm, but a small problem arises when you need to monitor multiple jobs. Since, spark pushes metrics that have job name in them, it becomes difficult on Grafana to create different dashboards for every job. A simple solution is to extract the job name and other job related strings from the metric name and convert then to labels, which then can easily used to monitor a specific job and all work would get done in a single dashboard.

### Working with legacy metric names

Since spark job pushes metrics of the format `myapp_driver_metric_name`

Using `metric_relabel_configs`<sup>[4](#furthur-read)</sup> config to extract the label and adjust the metric name, for making a single Grafana dashboard for mutiple spark jobs.

Let's say that we were using a legacy system that produced metrics that looked like:
```bash
spark_noob_driver_DAGScheduler_stage_failedStages
spark_noob_driver_ExecutorAllocationManager_executors_numberAllExecutors
spark_noob_driver_LiveListenerBus_queue_executorManagement_size
spark_noob_driver_jvm_non_heap_init
spark_noob_driver_StreamingMetrics_streaming_retainedCompletedBatches
```
The `spark` keyword is the prefix we passed in the `metrics.properties` file above, `noob` is our app name, `driver` tells that these are spark driver metrics and rest of the string is the **useful metric name common to all jobs, we need to extract this out and put rest of them into labels.

Modifying `prometheus.yml` a little
```yml
global:
    scrape_interval:     15s
    evaluation_interval: 15s

...
  scrape_configs:
    - job_name: 'my_app'
      metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'spark_([^_]+)_(driver)_([^_]+)_(\w+)'
        replacement: '${1}'
        target_label: app_name
      - source_labels: [__name__]
        regex: 'spark_([^_]+)_(driver)_([^_]+)_(\w+)'
        replacement: '${2}'
        target_label: role
      - source_labels: [__name__]
        regex: 'spark_([^_]+)_(driver)_([^_]+)_(\w+)'
        replacement: '${4}'
        # __name__ is the special label which contains the metric name
        target_label: __name__
      honor_labels: true
      static_configs:
        - targets:
          - 127.0.0.1:9102
```

The generated metrics now are:
```bash
DAGScheduler_stage_failedStages{app_name="noob", role="driver"}
ExecutorAllocationManager_executors_numberAllExecutors{app_name="noob", role="driver"}
LiveListenerBus_queue_executorManagement_size{app_name="noob", role="driver"}
jvm_non_heap_init{app_name="noob", role="driver"}
StreamingMetrics_streaming_retainedCompletedBatches{app_name="noob", role="driver"}
```
These can now be easily viewable on a single Grafana dashboard for mutiple jobs!


### Furthur read

1. Various sinks that spark supports can be found [here](https://spark.apache.org/docs/2.3.0/monitoring.html#metrics).
2. Banzai Cloud has done some [great work](https://github.com/banzaicloud/spark-metrics) on pushing metrics directly to prometheus.
3. A more detailed sample metrics.properties file can be found [here](https://github.com/apache/spark/blob/master/conf/metrics.properties.template)
4. `metric_relabel_configs` are applied after the scrape.