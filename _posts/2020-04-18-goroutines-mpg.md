---
layout: post
title: 'Goroutines: M, P, G orchestration'
categories:
- golang
- goroutines
- notes
- scheduler
---

> Goroutines are lightweight; have a small stack (2KB, from v1.4) and a fast context switch.

<aside name="goroutines-vs-threads">
    Refer <a href="/posts/goroutines-vs-threads.html">here</a> for how Goroutines are different from Threads.
</aside>

Goroutines are no doubt one of the best things Go has to offer. They are very lightweight, not like OS threads, but rather hundreds of goroutines can be multiplexed onto an OS Thread (Go has its runtime scheduler for this) with a minimal overhead of context switching! In simple terms, goroutines are a _lightweight abstraction_ over threads.


In this post, I try to describe how this goroutine scheduler works. 

## Scheduler

The goroutine scheduler keeps track of each goroutine and will schedule them to run in turn on a pool of threads belonging to the process. Multiple threads are often necessary to ensure that goroutines are not unnecessarily blocked. When one goroutine makes a blocking call, _the thread running it must block_. Therefore, at least one more thread should be created by the runtime to continue the execution of other goroutines that are not in blocking calls. 

Let's see how this is done!

## M, P, G orchestration

Go schedules an arbitrary number of goroutines onto an arbitrary number of OS threads. This gives us quick context switches and advantage of all the cores in our system. The main disadvantage of this approach is the complexity it adds to the scheduler.

<aside><p>Explained in the source code <a href="https://golang.org/src/runtime/proc.go">itself</a>.</p></aside>
> The scheduler's job is to distribute ready-to-run goroutines over worker threads.

Let's see how does the scheduler do this. 

The scheduler defines three main concepts:

**G** - _goroutine_  
**M** - _worker thread, or machine._  
**P** - _logical processor, a resource that is required to execute the Go code._ <i><u>M must have an associated P to execute Go code</u></i>

<aside><p>In <a href="https://en.wikipedia.org/wiki/Hyper-threading">Hyper Threading</a>, one core can have multiple hardware threads.</p></aside>
When a Go program boots up, it is given a `P` for every virtual core on the host machine.

A basic diagram of `P`, `M`, `G` model
```bash
# P, M, G diagram

P0 --- M0 --- G ---- running code  P2 --- M2 --- G ---- running code

P2 --- M2 --- G ---- running code  P4 --- M4 --- G ---- running code
```

> Each goroutine(G) runs on an OS thread(M) that is assigned to logical CPU(P).

Now let's see how Go manages these,

Go will first create the different `P` based on the number of logical CPUs of the machine and store them in a list of idle `P`. (say, we have total 4 cores available, as visible to Go program)

```bash
# P initialization

P0 --- M0 --- G ---- main()

+--------+
| idle P |   P1 ---► P2 ---► P3
+--------+
```

Our main func is also a goroutine, and is assigned a `P` and `M`.

When a new goroutine is ready to run, it will wake up a `P` to distribute the work better. This `P` will create a `M` with the associated OS thread.

```bash
# OS thread creation

P0 --- M0 --- G ---- main()
    
       ------ os thread
       |
P3 --- M3 --- G1
▲
|
|_____________________________
                              |
                              |
+--------+                    |
| idle P |   P1 ---► P2 --/-► P3
+--------+
```

When `G1` has done its work, like a `P`, a `M` with no work i.e. no goroutine waiting to run, or returning from a syscall, or even forced to be stopped by the garbage collector, goes to an idle list.

```bash
# M and P idle list

P0 --- M0 --- G ---- main()
    
P3 --- M3
|      |
|      |_________________________
|___________________________     |
                            |    |
+--------+                  ▼    | 
| idle P |  P1 ---► P2 ---► P3   |
+--------+                       |
                                 |                
    +--------+                   ▼    
    | idle M |   M1 ---► M2 ---► M3
    +--------+
```

During the bootstrap of the program, Go already creates some OS threads and associated `M`.

## Blocking

In Go, **every I/O is blocking**. The idea is to write against a blocking interface and then handle concurrency through goroutines and channels rather than callbacks and futures.

### What happens if goroutine makes a syscall?

So, what will happen if a goroutine makes a syscall? we know that syscall is blocking, does this mean that the `P` will be blocked for the entire duration? No!

Go gets around this problem by using the asynchronous interfaces that the OS provides, but blocking the goroutines that are performing I/O. It optimizes the syscalls (whether it is blocking or not), by wrapping them up in the runtime. This wrapper will automatically disconnect the `P` from the thread `M` and allow another thread to run on it. But `M` is still blocked here as the goroutine is blocking.

Say, for example, we instruct the program to open a file (a syscall),

```bash
# Syscall releases P

P0 ---- M0 ---- G ---- os.Open() --- syscall()

P0      M0 ---- G
|
|___________________________________
                                    |
+--------+                          ▼
| idle P |  P1 ---► P2 ---► P3 ---► P0
+--------+
```

So when `G` makes a blocking syscall, 
- The `M0` and the `G` that made the blocking call are detached from the `P0` and this `P0` now has no `M`. (goes back to idle `P` list)
- The Go scheduler creates a new `M`, and attaches it to the `P0`. The remaining goroutines that were attached to the `P0`, now continue to run.
- The detached goroutine and the `M` it is associated with continue to block, waiting for the syscall to return.
- Once the syscall exits, the following rules are applied until one can be satisfied:
    - try to acquire the same `P0` and resume the execution
    - try to acquire a `P` in the idle list and resume the execution
    - put the goroutine in the global queue and put the associated `M` back to the idle list
- The `M0` is "put aside for future use"

### What if a goroutine make a network call?

Network calls are handled slightly different from syscalls, the goroutine is detached from the `P`, and is moved to **network poller**, this is called _parking the goroutine_.

#### Netpoller

The part that converts asynchronous I/O into blocking I/O is called the _netpoller_. It sits in its own thread, receiving events from goroutines wanting to do network I/O.

For example, the below code makes a network call

```bash
func main() {
    HTTP.Get("http://example.com")
}
```

When we open or accept a connection in Go, the file descriptor that backs it is set to non-blocking mode. This means that if we try to do I/O on it and the file descriptor isn't ready yet, it will return an error code saying so. 

Whenever a goroutine tries to read or write to a connection, the networking code will do the operation until it receives such an error, then call into the netpoller, telling it to notify the goroutine when it is ready to perform I/O again.

The goroutine is then scheduled out of the thread it's running on and another goroutine is run in its place.

In this case, the thread `M` **will not be blocked** (as opposed to the case of syscall):
```bash
# Network poller waiting for the resource
# frees up M

P0     M0 ---- G     syscall()

P0 --- M0 ---- G     syscall exit

P0 --- M0      G -------► G 
                     Network poller
```

When the netpoller receives notification from the OS that it can perform I/O on a file descriptor, it will look for goroutines that are blocked on that file and notify them. The goroutine can then retry the I/O operation that caused it to block and succeed in doing so. If more than one goroutines are ready, then extra ones go the global runnable queue and will be scheduled later. 

## GOMAXPROCS

> At any time, `M` goroutines need to be scheduled on `N` OS threads that runs on at most `GOMAXPROCS` numbers of processors.

When system calls are used, Go does not limit the number of OS threads that can be blocked, as explained in code:

> The GOMAXPROCS variable limits the number of operating system threads that can execute user-level Go code simultaneously. There is no limit to the number of threads that can be blocked in system calls on behalf of Go code; those do not count against the GOMAXPROCS limit. This package’s GOMAXPROCS function queries and changes the limit.

The default value of `GOMAXPROCS` is the number of logical CPUs.

## Work stealing in Go Scheduler

<aside><p><a href="https://docs.google.com/document/d/1TTj4T2JO42uD5ID9e89oa0sLKhJYD0Y_kqxDv3I3XMw/edit">Scalable Go Scheduler Design Doc</a> by Dmitry Vyukov</p></aside>
Go has a work-stealing scheduler since 1.1, contributed by Dmitry Vyukov.

### Goroutines queues

<aside><p>Each local queue has a maximum capacity of 256, and any new incoming goroutine is pushed to the global queue after that.</p></aside>
Go manages goroutines at two levels, _local queues_ and _global queues_. Local queues are attached to each `P` while global queue is common.

Goroutines do not go in the global queue only when the local queue is full, they are also pushed in it when Go injects a list of goroutines to the scheduler, e.g. from the network poller or goroutines asleep during the garbage collection.

### Work-stealing

When a `P` does not have any work it applies the following rules until one can be satisfied:
- pull work from local queue
- pull work from global queue
- pull work from network poller
- steal work from the other P’s local queues

Since a processor can pull work from the global queue when it is running out of task, the first available P will run the goroutine. This behavior explains why a goroutine runs on different P and shows how Go optimizes the system call with letting other goroutines running when a resource is free.

## References

- [Go: What Does a Goroutine Switch Actually Involve?](https://medium.com/a-journey-with-go/go-what-does-a-goroutine-switch-actually-involve-394c202dddb7)
- [Scalable Go Scheduler Design Doc](https://docs.google.com/document/d/1TTj4T2JO42uD5ID9e89oa0sLKhJYD0Y_kqxDv3I3XMw/edit)
- [from Go source code](https://github.com/golang/go/blob/master/src/runtime/HACKING.md)
- [Analysis of the Go runtime scheduler](http://www1.cs.columbia.edu/~aho/cs6998/reports/12-12-11_DeshpandeSponslerWeiss_GO.pdf)
- [The Go netpoller](https://morsmachine.dk/netpoller)
- [The Go scheduler](http://morsmachine.dk/go-scheduler)
- [Go's work-stealing scheduler](https://rakyll.org/scheduler/)
