---
layout: post
title: 'Goroutines: M, P, G orchestration'
categories:
- go
- goroutines
- notes
---

> Goroutines are lightweight; have a small stack (2KB) and a fast context switch.

Goroutines are no doubt one of the best things Go has to offer. They are very lightweight, not like OS threads, but rather hundreds of goroutines can be multiplexed onto an OS Thread (Go has its own runtime scheduler for this) with a minimal overhead of context switching! In simple terms, goroutines are a _lightweight abstraction_ over threads.

<span class="font16">You can refer here for [Goroutines vs Threads](/posts/goroutines-vs-threads.html).</span>

In this post, I try to describe how the goroutine scheduler works.

There are only a few universal truths, 

> Concurrency is not parallelism! ([Talk](https://blog.golang.org/waza-talk))

## M, P, G orchestration

Go has its scheduler to distribute goroutines over the threads, this scheduler defines three main concepts, as explained [here](https://golang.org/src/runtime/proc.go) in the source code itself.

> The scheduler's job is to distribute ready-to-run goroutines over worker threads.

**G** - goroutine  
**M** - worker thread, or machine.  
**P** - processor, a resource that is required to execute the Go code. M must have an associated P to execute Go code

A basic diagram of `P`, `M`, `G` model
```bash
# P, M, G diagram

P0 --- M0 --- G ---- running code  P2 --- M2 --- G ---- running code

P2 --- M2 --- G ---- running code  P4 --- M4 --- G ---- running code
```

> Each goroutine(G) runs on an OS thread(M) that is assigned to logical CPU(P).

Now let's see how Go manages these,

Go will first create the different `P` based on the number of logical CPUs of the machine and store them in a list of idle `P`.

```bash
# P initialization

P0 --- M0 --- G ---- main()

+--------+
| idle P |   P1 ---► P2 ---► P3
+--------+
```

When a new goroutine is ready to run, it will wake up a `P` to distribute the work better. This `P` will create a `M` with the associated OS thread.

```bash
# OS thread creation

P0 --- M0 --- G ---- main()
    
       ------ os thread
       |
P3 --- M3 --- G1
▲
|
|____________________________
                             |
                             |
+--------+                   |
| idle P |   P1 ---► P2      P3
+--------+
```

However, like a `P`, a `M` with no work i.e. no goroutine waiting to run, or returning from a syscall, or even forced to be stopped by the garbage collector, goes to an idle list.

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

During the bootstrap of the program, Go already creates some OS thread and associated M.

## What happens if goroutine makes a syscall?

Go optimizes the system calls (whether it is blocking or not), by wrapping them up in the runtime. This wrapper will automatically disconnect the `P` from the thread `M` and allow another thread to run on it.

```bash
# Syscall handoffs P

P0 ---- M0 ---- G ---- os.Open() --- syscall()

P0      M0 ---- G
|
|___________________________________
                                    |
+--------+                          ▼
| idle P |  P1 ---► P2 ---► P3 ---► P0
+--------+
```

`P0` is now on the idle list. Once the syscall exits, the following rules are applied until one can be satisfied:
- try to acquire the same `P0` and resume the execution
- try to acquire a `P` in the idle list and resume the execution
- put the goroutine in the global queue and put the associated `M` back to the idle list

## Parking the goroutine

When an `M` creates a new `G`, it must ensure that there is another `M` to execute the `G` (if not all `M’s` are already busy). Similarly, when an `M` enters syscall, it must ensure that there is another `M` to execute the Go code.

### Network poller

Go also handles the case when the resource is not ready yet in case of non-blocking I/O such as http call. In this case, the first syscall, will not succeed since the resource is not yet ready, forcing Go to use the network poller and _park the goroutine_. Example:

```bash
func main() {
    http.Get("http://example.com")
}
```

Once the first syscall is done and explicitly says the resource is not yet ready, the goroutine will park until the network poller notifies it that the resource is now ready. In this case, the thread `M` will not be blocked:

```bash
# Network poller waiting for the resource

P0     M0 ---- G     syscall()

P0 --- M0 ---- G     syscall exit

P0 --- M0      G -------► G 
                     Network poller
```

The goroutine will run again when the Go scheduler looks for work. The scheduler will then ask the network poller if a goroutine is waiting to be run after successfully getting the information it was waiting for. If more than one goroutines are ready, then extra ones go the global runnable queue and will be scheduled later. 

## A thread can be re-used when its goroutine is blocking

When system calls are used, Go does not limit the number of OS threads that can be blocked, as explained in code:

> The GOMAXPROCS variable limits the number of operating system threads that can execute user-level Go code simultaneously. There is no limit to the number of threads that can be blocked in system calls on behalf of Go code; those do not count against the GOMAXPROCS limit. This package’s GOMAXPROCS function queries and changes the limit.

The default value of `GOMAXPROCS` is the number of logical CPUs.

## Go's runtime scheduler

The Go Runtime manages scheduling, garbage collection, and the runtime environment for goroutines among other things.
Go programs are compiled into machine code by the Go compiler infrastructure. Since Go provides high level constructs such as goroutines, channels and garbage collection, a runtime infrastructure is required to support these features. This runtime is C code that is statically linked to the compiled user code during the linking phase. Thus, a Go program appears as a standalone executable in the user space to the operating system.

```bash
                                  Go Executable
        +-------------------------------------------------------------------+
        | +---------------------------------------------------------------+ |
        | |                                                               | |
        | |                           Go Program                          | |
        | |                                                               | |
        | +---------------------------------------------------------------+ |
        |              ▲               ▲               ▲                    |
        |              |               |               |                    |
        |            memory         channel       creation of               |
        |           allocation    communication    goroutines               |
        |              |               |               |                    |
        |              ▼               ▼               ▼                    |
        | +---------------------------------------------------------------+ |
        | |                                                               | |
        | |                           Runtime                             | |
        | |                                                               | |
        | +---------------------------------------------------------------+ |
        +-----------------|--------------------------------|----------------+
                          |                                |
                       syscalls                      thread creation
                           |                               |
                           ▼                               ▼
    +----------------------------------------------------------------------------+
    |                                                                            |
    |                                 OS Kernel                                  |
    |                                                                            |
    +----------------------------------------------------------------------------+

```

Arguably, one of the more important aspects of the Go runtime is the goroutine scheduler. The runtime keeps track of each goroutine, and will schedule them to run in turn on a pool of threads belonging to the process. Goroutines are separate from threads but rely upon them to run, and scheduling goroutines onto threads effectively is crucial for the efficient performance of Go programs. The idea behind goroutines is that they are capable of running concurrently, like threads, but are also extremely lightweight in comparison. So, while there might be multiple threads created for a process running a Go program, the ratio of goroutines to threads should be much higher than 1-to-1. Multiple threads are often necessary to ensure that goroutines are not unnecessarily blocked. When one goroutine makes a blocking call, the thread running it must block. Therefore, at least one more thread should be created by the runtime to continue the execution of other goroutines that are not in blocking calls. Multiple threads are allowed to run in parallel up to a programmer defined maximum, which is stored in the variable GOMAXPROCS.

It is important to keep in mind that all the OS sees is a single user level process requesting and running multiple threads. The concept of scheduling goroutines onto these threads is merely a construct in the virtual environment of the runtime.

- [Analysis of the Go runtime scheduler](http://www1.cs.columbia.edu/~aho/cs6998/reports/12-12-11_DeshpandeSponslerWeiss_GO.pdf)

Another universal truth

> Do not communicate by sharing memory; instead, share memory by communicating. ([Refer](https://blog.golang.org/codelab-share))

## References

- [Go: What Does a Goroutine Switch Actually Involve?](https://medium.com/a-journey-with-go/go-what-does-a-goroutine-switch-actually-involve-394c202dddb7)
- [Scalable Go Scheduler Design Doc](https://docs.google.com/document/d/1TTj4T2JO42uD5ID9e89oa0sLKhJYD0Y_kqxDv3I3XMw/edit)
- [from Go source code](https://github.com/golang/go/blob/master/src/runtime/HACKING.md)
