---
layout: post
title: Implementing delayed message support with Apache Kafka
categories:
- aws
- kafka
- distributed-systems
- golang
- redis
---

Apache Kafka is a distributed, horizontally scalable, partitioned, fault-tolerant, replicated commit log service, which works great as a queue/message broker/database for in-order retrieval. But what if you want to put a message in Kafka and do not want to consume it immediately without stopping your consumer or polling and re-pushing again and again?

There are a lot of protocols which support this functionality, for example, [Celery](https://docs.celeryq.dev/en/stable/getting-started/introduction.html) and even natively on brokers example, [RabbitMQ](https://www.rabbitmq.com/blog/2015/04/16/scheduling-messages-with-rabbitmq), but for Kafka there exists no such plugin/protocol.

In this article, we explore how we can build a system that can help us schedule a job at a later time (or delayed by a few seconds/minutes/hours). This can be the use case for retries in a system, backoffs, and many more.

# The building blocks

Let's visualize our use case once more, we want to delay a message `M` by `N` seconds which should be picked by service `S` after `N` seconds with Kafka as the underlying broker.

We need a black box into which you put this message `M` with a delay of `N` seconds and after `N` seconds have elapsed, this black box pushes the message to service `S`'s kafka topic.

![blackbox-image](/images/delayed-blackbox.png)

# Inside the black box

For Blackbox to work we need a scheduler with a backing store that can store jobs and survive restarts. We leverage Redis for this, specifically [Redis Sorted Sets](https://redis.io/glossary/redis-sorted-sets/).

The flow comes out to be, the service `S` pushes the message `M` that it wants to schedule later `t` to a topic of this black box, `TB`, consumed by our black box service `B`. This message is pushed to a sorted set in Redis which is inspected at regular intervals to get messages that are ready to be triggered, and then `B` pushes this `M` to Service's `S` topic `T`, thus achieving our goal. We will go into detail about this Redis key works, and how we poll this in a while, first let's visualize the flow for better understanding.

![blackbox-redis](/images/blackbox-redis.png)

## Message `M`

The service `S` pushes the following message `M` to the black box service's topic `TB`
```json
{
    "topic": "T",
    "message": "<message body>",
    "countdown": 120 // in seconds
}
```

and the following headers for better tracking
```conf
CALLER_SERVICE=S
```

The message body includes the topic `T` where the message with ultimately go. The message contains the body that needs to be sent on the topic `T` after `countdown` seconds.

## Scheduler and zadd

The scheduler is a kafka consumer on the topic `TB` which parses the message `M`. It generates a unique UUID for this message, say `U`.

Then sets a key in Redis,
```redis
SET U '{"topic": "T", "message": "<message body>"}'
```
This will come into the picture when the message is ready to be pushed.

Now comes the most important part, the set we have been talking about for a while.

A quick detour to understand how Redis Sorted Sets work.

<hr/>

### Redis Sorted Sets

> Sorted sets in Redis are a powerful data structure that combines the features of sets and sorted lists. They allow you to store a collection of unique elements while assigning a score or rank to each element. This score is used to determine the order of elements in the set, making sorted sets an excellent choice for applications that require ordered data.

<aside><p>Redis uses a skip list and a hash table to implement sorted sets, ensuring that operations such as insertion, deletion, and range queries are performed in logarithmic time complexity, <b>O(log N)</b>.</p></aside>

```redis
localhost:6379> zadd blackbox-delay-key 2 uuid1
(integer) 1
localhost:6379> zadd blackbox-delay-key 1 uuid2
(integer) 1
localhost:6379> zadd blackbox-delay-key 3 uuid3
(integer) 1
localhost:6379> zrange blackbox-delay-key 0 2 BYSCORE limit 0 10
1) "uuid2"
2) "uuid1"
```

We add a key uuid1 with a score of `2` and similarly all the rest keys. We can then query this set using a range which returns us the desired result.

<hr/>

Now that we understand how redis sets work, let's get back to our service.

We push the message UUID to our global set of this black box, 
```redis
zadd blackbox-delay-key NX time.Now()+countdown U
```

## Cron and zrange

Now that our message is pushed to our "scheduling" queue, we have an in-memory cron in our scheduler which runs every 1 second and polls `blackbox-delay-key`, using 
```redis
zrange delay-key 0 times.Now() BYSCORE limit 0 10
```
this returns all the keys lying in the range.

If you note the range we have specified, we query all keys in range 0 up to the current time, which gives us all keys that are ready to be run.

We fetch all the key data from the data we stored in the earlier step 
```redis
GET U
```
and push the message to Kafka topics set in the message.

At last, to clean up the used keys, we delete from blackbox-delay-key set 
```redis
zrem [keys...]
```

This completes our delayed implementation of kafka messages.

# A few optimizations

1. Over time the keys in Redis might accumulate if not cleared. We can set expiry while setting a message in Redis 
```redis
SET U '{"topic": "T", "message": "<message body>"}' EX coutdown+900
```
(900 is an arbitrary number). This ensures that all keys set will be deleted if not triggered after 15 minutes of the expected trigger point.

2. After we have triggered the task/message, we can explicitly call `DEL U` to remove the key data, thus preventing any orphan keys in Redis.

3. While fetching messages to be scheduled we have given a limit of 10, which can be tweaked according to the use case.

4. Currently our solution polls the Redis at 1-second intervals, which means we support minimum 1-second accuracy, we can easily extend it to a few hundred milliseconds according to the use case.

# References

1. [Redis Sorted Sets](https://redis.io/glossary/redis-sorted-sets/)
2. [zrange](https://redis.io/docs/latest/commands/zrange/)
3. [zrem](https://redis.io/docs/latest/commands/zrem/)
