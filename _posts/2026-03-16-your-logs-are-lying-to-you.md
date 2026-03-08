---
layout: post
title: Your logs are lying to you
toc: true
categories:
- infrastructure
- reliability
- logging
---

<b>Not intentionally</b>.

But when you have hundreds of services writing freeform strings to stdout, the signal gets buried, and you end up debugging the logging system instead of the actual problem.

<hr/>

Every service your team ships generates logs. The auth service logs token validations. The payment service logs charge attempts. The background worker logs job completions. Your API gateway logs every request in and out. By the time you have a handful of services in production, you’re looking at millions of log lines a day, and most of them are noise.

The problem isn’t volume. The problem is that logs were never designed to be queried across a distributed system. They were designed for a world that no longer exists.

## What your system is actually generating

Open any application log in production, and you’ll typically see something like this:

<aside>You might have JSON logs, still the problem remains the same</aside>

```
2025-03-04T11:22:07.341Z INFO  user session resumed uid=u_9f3c ip=10.0.4.17 region=ap-south-1
2025-03-04T11:22:07.389Z debug fetching portfolio snapshot account=ACC_7821 cache=miss
2025-03-04T11:22:07.901Z WARN  holdings query slow duration_ms=1203 rows=4418 threshold_ms=500
2025-03-04T11:22:08.004Z debug pricing feed stale age_ms=8200 feed=nse-eq fallback=last_close
2025-03-04T11:22:08.109Z INFO  response dispatched status=200 bytes=61340 duration_ms=768
2025-03-04T11:22:08.210Z ERROR ledger reconcile failed account=ACC_7821 reason=checksum_mismatch retries=3
2025-03-04T11:23:08.210Z ERROR Memory pressure critical heap_used=1.93GB heap_limit=2.1GB
```

That’s six log lines from a single service, generated within seconds, covering four completely different concerns: a slow query, connection exhaustion, a payment retry, and a memory spike. None of them is correlated. There’s no way to tell whether these events are related to the same user request or a cascade of independent failures. And this is just one service.

Scale that to fifty microservices, each with its own logging style, severity conventions, and field names, some use user_id, others userId, and others uid, and you have a system that generates information without actually communicating it.

## The monolith assumption baked into your logs

Logging, as a concept, was originally designed for monolithic applications. When your entire application lived in a single process, a single log file told the whole story. You could scroll through it chronologically and follow a request from entry to exit. The timestamp was enough to correlate events.

Then we broke the monolith. We distributed our systems across tens and then hundreds of microservices, each running multiple instances, each writing to its own log stream. The timestamp stopped being enough. A request that enters your system might touch eight services before it resolves, and the logs from those eight services are sitting in eight different places, written in eight slightly different formats, with no shared identifier tying them together.

> When something breaks at 2am, you’re not searching for truth — you’re searching for a needle in eight different haystacks.

A single-string search across unstructured logs exacerbates the issue. Grepping for user_id=abc123 across your log aggregator will return results <b>but inconsistently</b>. Services that log userId or uid won’t show up. You’ll build a mental model of the failure that’s actually missing half the picture.

## The volume problem nobody talks about honestly

I worked at Mudrex (a Crypto Platform for all your financial needs), we used to run dozens of internal and public-facing services that together produced a volume of log data that had to be stored for years, not just for debugging, but for regulatory compliance. Our honest account of self-hosted ELK stack experience is instructive: it worked fine until traffic scaled significantly post-2021, at which point we eventually had to rethink our logging provider and our practices.

Teams start with a seemingly adequate log aggregator, only to scale past it and spend months migrating. The migration improves storage and query performance but not the core issue: poorly structured logs that no storage engine can fix.

## What correlation actually requires

APM — Application Performance Monitoring — gets closer to solving the right problem. The key insight is trace IDs: a single identifier generated at the edge of your system that propagates through every service call for the lifetime of a request. Every log line emitted during that request carries the trace ID. Now, instead of grepping across unstructured text, you query by trace ID and get the full story which services were involved, in what order, with what latencies, and where things went wrong.

This is what structured logging is actually trying to do. Not just pretty-printing key-value pairs, but enforcing a shared schema across services so that your observability layer can group events by user, by session, by request, by feature, or whatever logical unit matters to you when something goes wrong.

<aside><b>Cardinality</b> is the number of unique values a field can have. `transaction_id` has high cardinality whereas `http_method` has low cardinality.</aside>

We at Mudrex, achieved by standardizing our logging library which unified what the services were logging, a few low cardinality fields, timestamp format and enforced all services to propagate contexts.

## The cost nobody budgets for

<aside> At a point we were paying ~35% for our logging infrastructure, not metrics, not alerts, JUST logs.</aside>

Here’s the thing that bites teams slowly: log costs don’t scale linearly with traffic. They scale faster. More users mean more requests. More requests mean more services touched per request. More services mean more log lines per event. Add verbose debug logging that someone turned on during an incident and forgot to turn off, and suddenly your Elasticsearch or Datadog or CloudWatch bill has doubled quarter-over-quarter with no obvious culprit.

Ingestion, storage, and retention are all priced separately on most managed platforms. A log line that gets written, shipped to an aggregator, indexed, and retained for 30 days has touched four billing surfaces before anyone has even queried it. At low volume, this is invisible. At scale, it’s a meaningful line item, and unlike compute, it’s hard to right-size because nobody wants to be the person who deleted the logs that would have explained the outage.

> Every log line you write is a bet that someone will read it. Most of them lose.

## Metrics are cheap. Logs are not.

A metric is a number with a timestamp and a few labels. `http_request_duration_ms{service="payments", status="500"} 847`. That’s it. Prometheus scrapes it, stores it as a time series, and you can graph it, alert on it, and aggregate it across thousands of instances for almost nothing. Metrics are pre-aggregated by design, you’re not storing individual events, you’re storing summaries of them.

A log line is the opposite. It’s a raw individual event, stored in full, indexed so you can search it, and retained so you can audit it. Useful but expensive per unit of information.

When you log every database query duration as a string in an application log, you’re paying log prices for what is fundamentally metric data.

Convert it.

Emit a histogram.

Let your APM or metrics layer aggregate it. The query duration becomes a P95 latency graph at a fraction of the cost, and it’s more useful than the raw log anyway because you can see trends instead of individual events.

This is the practical framing: if you find yourself logging something that you’d want to graph or alert on, for example, error rates, latency distributions, queue depths, cache hit ratios, etc, that’s a metric, not a log. Treat it like one. Your observability costs will reflect the distinction.

> If a log line contains a number that you’d ever want to aggregate across time or instances, it should be a metric. If it contains context you’d only need when investigating a specific event, it belongs in a log, only that context, nothing else.

## OpenTelemetry should solve my problem

Uh…no!

OpenTelemetry is a protocol. It standardizes how telemetry data (logs, traces, metrics) is collected and exported. You can send that data to 10 different platforms using the OTel protocol, and it behaves the same everywhere; that is what the power of OpenTelemetry is.

But here’s what OpenTelemetry does <b>NOT</b> do:

1. It can’t add business context to your log.
2. It can’t decide what to log, when to log.

<b>You</b> have to tell it.

## So what should you actually log?

Not less. Wider.

The pattern that scales well is called <b>wide events</b>: one structured log entry per logical unit of work, i.e., per request, per job, per transaction, that accumulates context as execution progresses and is emitted once at the end. Instead of ten thin log lines scattered across a request lifecycle, you get one rich record with everything attached: the user, the trace ID, the services touched, the durations, the outcome, and any errors. It’s queryable, it’s correlated, and it’s a fraction of the line count.

This is what APM tools are nudging you toward when they talk about spans and traces. A span isn’t just a performance measurement, it’s a structured context carrier. When you emit your wide event with a trace ID that links it to the APM trace, you get the best of both worlds: the rich detail of a log with the correlation model of distributed tracing.

> The shift is less about logging less and more about logging deliberately.

Each log line should answer a question you’d actually ask during an incident. If you can’t name the question, the line probably shouldn’t exist.

## You don’t need every log. You need the right ones.

There’s a middle path between logging everything and logging nothing: sampling. The idea is simple yet beautiful, for high-frequency, low-signal events, you don’t record every occurrence. You record one in every hundred, or one in every thousand, and you treat that sample as representative of the whole.

Think about a healthy API endpoint that handles ten thousand requests a minute. The successful ones are boring, having same path, same latency band, same response shape. Storing all ten thousand log lines per minute tells you nothing that storing a hundred of them wouldn’t. But the moment something goes wrong: an error, a timeout, an anomalous latency, you want the full record. That’s where head-based and tail-based sampling diverge.

Head-based sampling makes the decision at the start of a request: this one gets recorded, that one doesn’t. It’s cheap and easy to implement, but it’s random - a sampled 1% might miss the one request that caused the outage. Tail-based sampling flips this: every request is tracked in memory, and the decision to keep or discard the trace is made after it completes, based on what actually happened. Errors are always kept. Slow requests get kept. The boring majority gets dropped. You pay more in memory, but your retained logs are almost entirely signal.

The practical implication is that sampling isn’t just a cost lever but an observability design decision. A team that samples well retains fewer logs but finds incidents faster, because the noise-to-signal ratio of what they kept is far lower. A team that logs everything uniformly drowns in volume and ends up grep-searching through millions of lines that were never going to tell them anything.

> If you’re on OpenTelemetry, tail-based sampling is configurable in the Collector. Start by always keeping errors and traces above your P95 latency threshold. Drop everything else at 90–95%. Revisit after a month. Your storage bill and your on-call experience will both improve.

## Where this leaves you

The observability stack for a distributed system has three layers, and logs are only one of them.
- Metrics:  handle the quantitative signal. what’s happening and how often.
- Traces: handle correlation. which path did this request take, and where did it slow down?
- Logs: handle the qualitative detail. what was the state of the world when this specific thing went wrong?

Getting the balance right means fewer logs, not more but richer ones, emitted at the right boundaries, carrying trace IDs that tie them to the other two layers. The teams that nail this aren’t the ones with the most comprehensive logging. They’re the ones who know, before they even open their tooling, exactly which layer has the answer to the question they’re asking.

## References

* [Logging sucks](https://loggingsucks.com/)
* [Logging at Zerodha](https://zerodha.tech/blog/logging-at-zerodha/)
* [Building a cost-effective logging platform using Clickhouse for petabyte scale](https://www.zomato.com/blog/building-a-cost-effective-logging-platform-using-clickhouse-for-petabyte-scale/)
