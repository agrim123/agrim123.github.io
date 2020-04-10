---
layout: post
title: Getting to know Lua (Part 2)
categories:
- lua
---

This post is in continuation of previous post [Getting to know Lua (Part 1)](/posts/getting-to-know-lua-1.html)

## Session 2: Diving into Expressions

### Relational Operators

```lua
<   >   <=  >=  ==  ~=
```

Comparing values with different types? Careful!! 
```lua
"9" == 9        -- false
```
Moreover, 
```lua
4 < 20          -- true
"4" < "20"      -- false (alphabetical order) 
```
To avoid inconsistent results, Lua raises an error when you mix strings and numbers in an order comparison, such as `4 < "20"`.

### Logical Operators

The family consists of `and`, `or` and `not`.

```lua
print(4 and 2)               -- true
print(false and 1)           -- false
print(false or true)         -- true
print(nil and 15)            -- false
print(not nil)               -- true
print(not 4)                 -- false
```

### Table Constructors

```lua
mylist = {"item1", "item2", "item3", "item4"}
print(mylist[4])         -- "item4"  (the first element has always index 1, not 0)
```

### Assignment

```lua
a = 210                         -- a gets 210
a, b = 4, 3                     -- a gets 4 and b 3
x, y = y, x                     -- swap x and y
a, b, c = 0                     -- a get 0 and b and c gets nil
a, b, c = 0, 0, 0               -- a, b, c get 0 each

function f()
    return 0, 1
end

a, b = f()                       -- a gets 0 and b 1 
```

### Local variables and blocks

```lua
a = 10                          -- global variable
local b = 20                    -- local variable
```

Local variable have scope limited to the block where they are declared.

```lua
b = 2              -- global variable

function a()
    local i = 1
    print(i)       -- local to scope of a()
end

print(i)           -- nil (as not available outside function block)
```

### Control Structures

`if`, `else` for conditionals

`where`, `for`, `repeat` for iteration

All control structures have an explicit terminator: `end` terminates the `if`, `for` and `while` structures; and `until` terminates the `repeat` structure.

```lua
if x > 0 then
    return x
else
    return -1
end
```

```lua
local i = 0
while i < 10 do
    print(i)
    i = i + 1
end
```

```lua
-- print the first non-empty line
repeat
    line = os.read()
until line ~= ""
print(line)
```

```lua
for i=1,10 do 
    print(i)
end
```
