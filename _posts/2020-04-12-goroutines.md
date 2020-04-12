---
layout: post
title: 'Goroutines: M, P, G orchestration'
categories:
- go
- goroutines
- notes
---

> Goroutines are lightweight; have a small stack (2KB) and a fast context switch.

Goroutines are no doubt one of the best things Go has to offer. They are very lightweight, not like OS threads, but rather hundreds of goroutines can be multiplexed onto an OS Thread with a minimal overhead of context switching!

In this post, I try to describe how the goroutine scheduler works.

A goroutine is a Go structure containing information regarding the running program, such as stack, program counter, or its current OS thread.

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

## References

- [Go: What Does a Goroutine Switch Actually Involve?](https://medium.com/a-journey-with-go/go-what-does-a-goroutine-switch-actually-involve-394c202dddb7)
- [Scalable Go Scheduler Design Doc](https://docs.google.com/document/d/1TTj4T2JO42uD5ID9e89oa0sLKhJYD0Y_kqxDv3I3XMw/edit)
