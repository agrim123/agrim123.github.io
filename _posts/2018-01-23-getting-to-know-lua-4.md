---
layout: post
title: Getting to know Lua (Part 4)
categories:
- lua
---

This post is in continuation of previous post [Getting to know Lua (Part 3)](/lua/2018/01/22/getting-to-know-lua-3)

## Session 4: Coroutines

A coroutines is like thread, with its own stack, its own local variables, and its own instruction pointer; but shares most globals and mostly anything else with other coroutines. 

The main difference between coroutines and threads is that, a program with threads runs several threads concurrently whereas coroutines are collaborative.
A program with coroutines is, at any given time, running only one of its coroutines and this running coroutine only suspends its execution when it explicitly requests to be suspended.

### Basics

> Lua offers all its coroutine functions packed in the coroutine table

```lua
co = coroutine.create(function ()
       print("Hello from the coroutine")
     end)

print(co)                 -- thread: 0xa57670
```

A coroutine table provides many methods. We can list all methods using,
```lua
for k, v in pairs(coroutine) do
    print(tostring(k))
end
```

```bash
running
create
resume
status
isyieldable
wrap
yield
```

### Onto rough waters

We can create a coroutine using `create` function which only creates a new coroutine and returns a handle to it but doesnot start the coroutine.

A coroutine can be in any of the three different states:
- Suspended
- Running
- Dead

When we create a coroutine, it starts in the suspended state. The status of a coroutine can be checked by using `status` function,

```lua
print(coroutine.status(co))     -- suspended
```

We can execute a coroutine by calling a `resume` function and passing a first argument as thread returned by the `create` function.  
The function `resume` starts coroutine execution,

```lua
coroutine.resume(co)            -- "Hello from the coroutine"
```

In this state coroutine executes and leaves it in dead state

```lua
print(coroutine.status(co))    -- dead
```

Until now, coroutines look like nothing more than a complicated way to call functions. The real power of coroutines stems from the `yield` function, which allows a **running coroutine to suspend its execution so that it can be resumed later**.

```lua
co = coroutine.create(function ()
       for i=1,5 do
         print("co ", i)
         coroutine.yield()
       end
     end)

coroutine.resume(co)           -- co 1
print(coroutine.status(co))    -- suspended
coroutine.resume(co)           -- co   2
...
coroutine.resume(co)           -- co   5
coroutine.resume(co)           -- prints nothing

print(coroutine.resume(co))    -- false   cannot resume dead coroutine
```

When a coroutine yields, the corresponding `resume` returns immediately, even if the yield happens inside nested function calls (that is, not in the main function, but in a function directly or indirectly called by the main function). It can be demonstrated as

```lua
function foo ()
    print("in foo")
    coroutine.yield("foo coroutine yield")
    print "done"
end

co = coroutine.create(function ()
       foo()
       print("in co body")
     end)

print("main", coroutine.resume(co))
print("main", coroutine.resume(co))
```

This outputs

```lua
in foo
main    true    foo coroutine yield
done    --[[
            This print after we call the second resume because yield returned the function at an early stage
        ]]--
in co body
main    true
```

> Resume runs in protected mode. Therefore, if there is any error inside a coroutine, Lua will not show the error message, but instead will return it to the resume call.

We can also pass extra arguments `resume` that are supplied to the coroutine main function.   

A more cool example can be taken from [Lua Manual](http://www.lua.org/manual/5.2/manual.html#2.6),

```lua
function foo (a)
    print("foo", a)
    return coroutine.yield(2*a)
end

co = coroutine.create(function (a,b)
        print("co-body", a, b)
        local r = foo(a+1)
       print("co-body", r)
       local r, s = coroutine.yield(a+b, a-b)
       print("co-body", r, s)
       return b, "end"
    end)

print("main", coroutine.resume(co, 1, 10))
print("main", coroutine.resume(co, "r"))
print("main", coroutine.resume(co, "x", "y"))
print("main", coroutine.resume(co, "x", "y"))
```

The output of this program is rather interesting and illustrates the above discussion in more detailed manner,

```lua
co-body 1       10
foo     2
main    true    4
co-body r
main    true    11      -9
co-body x       y
main    true    10      end
main    false   cannot resume dead coroutine
```

A coroutine can terminate its execution in two ways: if the main funtion returns or if there is an unexpected error. In first case, `resume` returns `true` plus the values returned by main function and in second case it return `false` along with an error message.

A simple example

```lua
function foo (a)
    print("in foo")
    return coroutine.yield(2*x)
end

co = coroutine.create(function ()
        print("in co-body")
        local r = foo(1)
        print(r)
    end)

print("main", coroutine.resume(co))
print("main", coroutine.resume(co))
```

Outputs

```bash
in co-body
in foo
main    false   a.lua:3: attempt to perform arithmetic on a nil value (global 'x')
main    false   cannot resume dead coroutine
```

There is another function same as `create`, known by the name `wrap`. It also creates a coroutine, but instead of returning the coroutine, it returns a function that, when called, resumes the coroutine. Any arguments passed to this function are passed as extra arguments to `resume`. `wrap` returns all the values returned by `resume`, except the first one (the boolean error code). Unlike `resume`, `wrap` does not catch errors; any error is propagated to the caller.

```lua
co = coroutine.wrap(function ()
        coroutine.yield("Yay!")
    end)

print("main", co())      -- main    Yay!
print("main", co())      -- main
```

Roberto writes in book,

<pre style="text-align: justify; word-break: normal;">
Lua offers what I call <b>asymmetric coroutines</b>. That means that it has a function to suspend the execution of a coroutine and a different function to resume a suspended coroutine. Some other languages offer symmetric coroutines, where there is only one function to transfer control from any coroutine to another.
</pre>

> Coroutines are a kind of collaborative multithreading

## References

- [Lua Manual](http://www.lua.org/manual/5.2/manual.html)
- [Programming in Lua](https://www.lua.org/pil)
