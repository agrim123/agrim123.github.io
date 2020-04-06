---
layout: post
title: Garbage collection
categories:
- garbage collector
- notes
---

Garbage collection is the process of freeing up memory space that is not being used. 

In other words, the garbage collector sees which objects are out of scope and cannot be referenced in the future and reclaim the resources used by them.

The managed languages maintain the illusion of infinte memory by going behind the programmer’s back and reclaiming memory that the program no longer needs. The component that does this is called a <u>garbage collector</u>.

GC can help in case of 
- **Dangling pointers bugs**, when a piece of memory is freed/deallocated but there exist some pointers to it, and that pointer is dereferenced! This may lead to nil pointer errors or if the memory was assigned to something else, then it may result in unexpected results.
- when a programmer tries to free up memory space that has already been freed
- a program fails to free memory occupied by objects that have become unreachable, which can lead to memory exhaustion

## How does a garbage collector free up memory?

In the most abstract words, a garbage collector periodically scans the program's data structures, marking everything that is in use. It begins by scanning the program's stack, registers, and the static segment. Every time it encounters a pointer, it marks the object that it points to. Then it scans that object for pointers to other heap objects. Once it has marked all reachable heap objects, the objects that haven't been marked are freed. 

## Garbage Collection Algorithms

### Cleanup At The End: aka No GC

One possible way of cleaning up garbage is to wait until a task is done and then dispose of everything at once. This is a useful technique, especially if you have a way of breaking up the task into pieces. 

The Apache web server, for example, creates a small pool of memory per request and throws the entire pool away when the request completes.

### Reference Counting Collector

Another simple solution is to keep a count of how many times a resource is used (an object in memory, in this case) and dispose of it when the count drops to zero. A very useful property of reference counting is that garbage is detected as soon as possible.

Unfortunately, reference counting has a lot of problems. Worst of all, it can’t handle cyclic structures. These are very common, anything with a parent or reverse reference creates a cycle which will leak memory. Reference counting is an amortized algorithm (the overhead is spread over the run-time of the program), but it can’t guarantee response times. 

### Mark-Sweep Collector

Mark-sweep eliminates some of the problems of the reference count. It can easily handle cyclic structures and it has lower overhead since it doesn’t need to maintain counts. It gives up being able to detect garbage immediately.

Mark-sweep requires more implementation consistency than reference counting and is more difficult to retrofit into existing systems. The mark phase requires being able to traverse all live data, even data encapsulated within an object. If an object doesn’t provide traversal, it’s probably too risky to attempt to retrofit mark-sweep into the code. 

The other weakness of mark-sweep is the fact the sweep phase must sweep over all of the memory to find garbage. For systems that do not generate much garbage, this is not an issue, but the modern functional programming style generates enormous amounts of garbage.

### Mark-Compact Collector

In the above algorithms, the objects never move. Once an object is allocated in memory, it stays in the same place. 

Mark-compact disposes of memory, not by just marking it free, but by moving objects down into the free space. Objects always stay in the same memory order, but gaps caused by disposing of objects will be closed up by objects moving down.

The crazy idea of moving objects means that new objects can always just be created at the end of used memory. This is called a “bump” allocator and is as cheap as stack allocation but without the limitations of stack size. 

Another benefit is that when objects are compacted like this, programs have better memory access patterns that are friendly to modern hardware memory caches.

### Copying Collector

It’s a moving collector like mark-compact, but it’s incredibly simple. It uses two memory spaces and simply copies live objects back and forth between them. In practice, there are more than two spaces and the spaces are used for different generations of objects. New objects are created in one space, get copied to another space if they survive, and finally copied to a tenured space if they are very long-lived. If you hear a garbage collector described as generational or ephemeral, it’s usually a multi-space copy collector.

## Why some languages don't have garbage collection?

The hard part of adapting garbage collection to C/C++ is identifying pointers. Since object libraries and DLLs often lack source, you can't examine the source for type information, and you can't recompile. Typically, you don't even have to debug information. The only remaining option is to relink. This isn't as bad as it sounds since relinking lets you redefine whatever functions you like.

Garbage collection requires data structures for tracking allocations and/or reference counting. These create overhead in memory, performance, and the complexity of the language. C++ is designed to be "close to the metal", in other words, it takes the higher performance side of the tradeoff vs convenience features. Other languages make that trade-off differently. Reference counting to manage object lifetime is not the same as garbage collection, but it addresses many of the same kinds of issues and is a better fit with C++'s basic approach. [Reference](https://softwareengineering.stackexchange.com/a/113181)

C does have memory management - but it just works, so people barely notice it. There are static memory, registers, and the stack. Until you start allocating out of the heap, you're fine. It's the heap allocation that messes things up.


## Further Reading

1. [Why doesn't C++ have a garbage collector?](https://stackoverflow.com/a/2326748)
2. [Animated visualizations of several garbage collection algorithms](https://github.com/kenfox/gc-viz)