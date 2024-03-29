---
layout: post
title: Goroutines vs Threads
categories:
- golang
- goroutines
- threads
- os
- notes
---

Go uses `goroutines` while languages like Java use `threads`.

A goroutine is a Go structure containing information regarding the running program, such as _stack_, _program counter_, or its _current OS thread_.

The creation of a goroutine does not require much memory, **only 2kB of stack space**. They grow by allocating and freeing heap storage as required. Whereas threads start at a much larger space, along with a region of memory called a guard page that acts as a guard between one thread’s memory and another.

Goroutines are easily created and destroyed at runtime, but threads have a large setup and teardown costs it has to request resources from the OS and return it once it's done.
<aside name="program-counter">
    <p><a href="https://en.wikipedia.org/wiki/Program_counter" target="_blank">Program Counter</a> allows the thread to keep track of the next instruction to execute.</p>
</aside>
When a thread blocks, another has to be scheduled in its place. Threads are _scheduled preemptively_, and during a thread switch, the scheduler needs to save/restore ALL registers, that is, 16 general-purpose registers,<span> PC (Program Counter) </span>, SP ([Stack Pointer](https://en.wikipedia.org/wiki/Stack_register)), segment registers, 16 XMM registers, FP coprocessor state, 16 AVX registers, all MSRs, etc. This is quite significant when there is rapid switching between threads.

Goroutines are scheduled cooperatively and when a switch occurs, only 3 registers need to be saved/restored - Program Counter, Stack Pointer, and DX.

Since the number of goroutines is generally much higher, it doesn't make difference in switching time as only runnable goroutines are considered, blocked ones aren’t and also, modern schedulers are O(1) complexity, meaning switching time is not affected by the number of choices (threads or goroutines).

Goroutines as application-level threads and they are similar to OS Threads in many ways. Just as OS Threads are context-switched on and off a core, Goroutines are context-switched on and off an `M` (an OS Thread).

_The runtime is allocated a few threads on which all the goroutines are multiplexed. At any point in time, each thread will be executing one goroutine. If that goroutine is blocked (function call, network call, etc.), then it will be swapped out for another goroutine that will execute on that thread instead._
