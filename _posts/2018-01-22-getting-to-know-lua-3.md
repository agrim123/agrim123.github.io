---
layout: post
title: Getting to know Lua (Part 3)
categories:
- lua
---

This post is in continuation of previous post [Getting to know Lua (Part 2)](/lua/2018/01/21/getting-to-know-lua-2)

## Session 3: Functions

> Functions are the main mechanism for abstraction of statements and expressions in Lua

```lua
print "Hello World"    <-->   print("Hello World")
```

### Mutiple returns

```lua
function foo0 () end                  -- returns no results
function foo1 () return 'a' end       -- returns 1 result
function foo2 () return 'a','b' end   -- returns 2 results
```

### Variable Number of Arguments

```lua
function sum (...)
    local s = 0
    local arg = {...}
    for i, v in ipairs(arg) do
        s = s + v
    end

    return s
end

print(sum(13, 5, 3, 1, 5, 7))          -- 34
```

### Named Arguments

> The parameter passing mechanism in Lua is **positional**

One may think that passing naed arguments may be same as passing a number of arguments with names:

```lua
rename(old="old.txt", new="new.txt")   -- invalid syntax
```

Lua has no direct support for this syntax. The idea here is to pack all arguments into a `table` and use that table as the only argument to the function. The special syntax that Lua provides for function calls, with just one table constructor as argument, helps the trick:

```lua
rename{old="old.txt", new="new.txt"}   -- works
```

### More about Functions

> Functions in Lua are first-class citizens with proper lexical scoping.

What does `first-class citizens` mean? It means that a function is a value with the same rights as conventional values like numbers and strings. Functions can be stored in variables, passed as arguments or returned as results.

What does `proper lexical scoping` mean? It means that functions can access variables of its enclosing functions. (It also means that Lua contains the lambda calculus properly.)

> A function that gets another function as an argument, is called a **higher-order function**.

Taking an example from the [book](https://www.lua.org/pil/6.html)
```lua
network = {
    {name = "grauna",  IP = "210.26.30.34"},
    {name = "arraial", IP = "210.26.30.23"},
    {name = "lua",     IP = "210.26.23.12"},
    {name = "derain",  IP = "210.26.23.20"},
}

table.sort(network, 
    function (a,b)
        return (a.name > b.name)
    end
)
```

Higher-order functions are a powerful programming mechanism and the use of anonymous functions to create their function arguments is a great source of flexibility. But remember that higher-order functions have no special rights; they are a simple consequence of the ability of Lua to handle functions as first-class values.

#### Closures

A function written within a function has full access to local variables of the parent function; this feature is called lexical scoping.  

> Lexical scoping, plus first-class functions, is a powerful concept in a programming language, but few languages support that concept.

Consider the following example:

```lua
function newCounter ()
    local i = 0
    print(i, "As")
    return function ()   -- anonymous function
             i = i + 1
             return i
           end
end

c = newCounter()
print(c())  --> 1
print(c())  --> 2
```

Now this is interesting! 

Now, the anonymous function uses an upvalue, i, to keep its counter. However, by the time we call the anonymous function, i is already out of scope, because the function that created that variable (newCounter) has returned. Nevertheless, Lua handles that situation correctly, using the concept of closure. Simply put, a closure is a function plus all it needs to access its upvalues correctly.  
Technically speaking, what is a value in Lua is the closure, not the function.

> Function itself is just a prototype for closures.

Closures provide a valuable tool in many contexts. Closures are valuable for functions that build other functions too, like the newCounter example; this mechanism allows Lua programs to incorporate fancy programming techniques from the functional world. Closures are useful for callback functions, too.

> Because functions are stored in regular variables, we can easily redefine functions in Lua, even predefined functions. 

#### Non-Global functions

Beacuse functions are first-class, we can not only store functions in global variables but also in table fields and in local variables.

```lua
Math = {
    sum = function (x, y) return x + y end,
    sub = function (x, y) return x - y end
}
```

Some abnormalities arise while defining recursive local functions.

```lua
local fact = function (n)
    if n == 0 then return 1
    else return n*fact(n-1)     -- buggy
    end
end
```

When Lua compiles the call fact(n-1), in the function body, the local fact is not yet defined. Therefore, that expression calls a global fact, not the local one. To solve that problem, we must first define the local variable and then define the function:

```lua
local fact
fact = function (n)
    if n == 0 then return 1
    else return n*fact(n-1)
    end
end
```

#### Proper Tail Calls

> A tail call is a kind of goto dressed as a call

It happens when a function calls another function as its last action, and has nothing else to do.

```lua
function f (x)
    return g(x)      -- call to g is a tail call
end
```

In such situations, the program does not need to return to the calling function when the called function ends. Therefore, after the tail call, the program does not need to keep any information about the calling function in the stack.

> Because a proper tail call uses no stack space, there is no limit on the number of "nested" tail calls that a program can make.

```lua
function foo (n)
    if n > 0 then 
        return foo(n - 1)     -- will never overflow the stack
    end
end
```

The following implementation is not a tail call,

```lua
function f(x)
    g(x)
    return
end
```

The problem is that after calling g, f has to discard occasional results from g before returning.

```lua
return g(x) + 1     -- must do the addition, so not a tail call
```


