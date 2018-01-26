---
layout: post
title: Getting to know Lua (Part 1)
comments: true
categories:
- lua
---

I recently approached the `luarocks` community for GSoC'18 and they directed me to learn Lua and build some project to get acquainted with lua. This post describes my journey into the mystical world of lua.

## First Encounter

I visited the official [Lua](https://www.lua.org/about.html) website and there it was:

> Lua is a powerful, efficient, lightweight, **embeddable scripting language**. It supports **procedural programming**, object-oriented programming, functional programming, **data-driven programming**, and data description.

All those heavy words made me read this paragraph for about three times.  
Like a good friend [duckduckgo](https://duckduckgo.com) again helped me know about these big words,

- Embeddable Scripting Language
- [Procedural Programming](https://en.wikipedia.org/wiki/Procedural_programming)
- [Data-driven programming](https://en.wikipedia.org/wiki/Data-driven_programming)

> Lua combines simple procedural syntax with powerful data description constructs based on associative arrays and extensible semantics.

> Lua is dynamically typed.

> Lua is a proven, robust language.

These all features convinced me to move forward. So, I took upon the [Programming in Lua](https://www.lua.org/pil/) book.

## Session 1

As all languages start with a greeting

```lua
print("Hello World")
```

No semicolons! Phew... (although optional)

First recursion function that comes to mind when starting a new language is Fibonacci Series
```lua
function fib(n)
  if n < 2 then
    return n
  end

  return fib(n-2) + fib(n-1)
end
```

This clarified a lot of things:
- No brackets :P
- Declarative syntax

Uninitialized variables return `nil`

```lua
print(z)  -- nil
```

### Types in lua

```lua
print(type("Hello World"))  -- string
print(type(10))             -- number
print(type(print))          -- function
print(type(true))           -- boolean
print(type(nil))            -- nil
print(type(type(X)))        -- string
```

> Variables have no predefined types; any variable may contain values of any type

#### Mysterious Strings

> Lua is eight-bit clean and so strings may contain characters with any numeric value, including embedded zeros. That means that you can store any binary data into a string.

> Strings in Lua are immutable values

Concatenate thou strings: 

```lua
print("Hello" .. " World")   -- Hello World
print(50 .. 100)             -- 50100
```

Converting those numbers to string can be really easy using `..`

```lua
print(11 .. "")              -- "11"
```

#### Boolean

`False` and `True`

Conditionals in lua consider `false` and `nil` as `false` and rest all `true`

#### Tables

> Table type implements **associative arrays**

Now, some of you might wonder what are **[associative arrays](https://en.wikipedia.org/wiki/Associative_array)**, just a fancy name for dictionary (for Python users), objects (for JS users). Example:

```json
{
    "One": 1,
    "Two": 2
}
```

> Tables have dynamic size. Yay!

> Tables in Lua are neither values nor variables; they are objects

You may think of a table as a dynamically allocated object; your program only manipulates references (or pointers) to them. There are no hidden copies or creation of new tables behind the scenes. Moreover, you do not have to declare a table in Lua; in fact, there is no way to declare one. You create tables by means of a constructor expression, which in its simplest form is written as {}.

```lua
a = {}              --[[ 
                      create a table and store its reference in `a`
                    ]]--
print(a["y"])       -- nil (non existent key)
p = "x"
a[p] = 0            -- new entry with key="x" and value=0
print(a["x"])       -- 0
print(a.x)          -- 0  (much cooler!)
```

A table is always anonymous. There is no fixed relationship between a variable that holds a table and the table itself:

```lua
x = {}
x["a"] = 10
y = a          -- `y' refers to the same table as `x`
print(y["a"])  -- 10
y["a"] = 20
print(x["a"])  -- 20
x = nil        -- now only `y` still refers to the table
y = nil        -- now there are no references left to the table
```

> When a program has no references to a table left, Lua memory management will eventually delete the table and reuse its memory.

Using `a.x` may arise some confusion,

```lua
a = {}
x = "y"
a[x] = 10
print(a[x])      -- 10
print(a["x"])    -- nil (or print(a.x)) (undefined)
print(a["y"])    -- 10  (or print(a.y))
```

#### Functions

> Functions are first-class citizens in Lua

It means that a function is a value with the same rights as conventional values like numbers and strings. Functions can be stored in variables, passed as arguments or returned as results.

```lua
function a(f)        -- can be passed as arguments
    return f         -- can be returned as results
end

c = function()       -- can be stored in a variable
        return 3
    end

print(a(c()))        -- 3
```
