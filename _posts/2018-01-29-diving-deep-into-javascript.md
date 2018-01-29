---
layout: post
title: Diving Deep into JavaScript (Part 1)
comments: true
categories:
- javascript
---

I recently got acquainted with some advanced concepts in JavaScript and believe me understanding these are vital if you are developing a large scale application on JavaScript. So, this post discusses some of those concepts in detail.

> The strength of JavaScript is that you can do anything.  
The weakness is that you will.                  
    - *Reg Braithwaite*

Topics covered in this post:

- Closures
- Scopes
- Hoisting

This is going to be a long post! So, stretch your neck and let the journey begin!

## Closures

> A closure is the combination of a function and the lexical environment within which that function was declared.

Before diving into closures we need to know what is a lexical environment.

### What is lexical scoping?

Consider a function

```js
function myFunc() {
    var myVar = 'Yay!'   // myVar is a local variable

    function myInnerFunc() {
        console.log(myVar)
    }

    myInnerFunc()
}

myFunc()      // Yay!
```

`myFunc` creates a local variable `myVar` and a function `myInnerFunc`. Both of these are only accessible inside the block of `myFunc`. However, `myInnerFunc` can access `myVar`!

This concept is called `lexical scoping`, which describes how a parser resolves variable names when functions are nested. Nested functions have access to variables declared in their outer scope.

### What is a closure?

Let's modify the above example a bit

```js
function myFunc() {
    var myVar = 'Yay!'   // myVar is a local variable

    function myInnerFunc() {
        console.log(myVar)
    }

    return myInnerFunc
}

let a = myFunc()

console.log(a)   // ƒ myInnerFunc() { console.log(myVar) }

a()             // Yay!
```

Here, a reference to the function is returned to `a`. 

In JavaScript, using a function inside another function is *closure*. Local variables of outer function remain accessible to the inner functions even after the parent function has returned.

Another [definition](https://stackoverflow.com/a/111111/6116724) of closures may be

> A closure is a stack frame which is allocated when a function starts its execution, and not freed after the function returns.


In JavaScript, a function reference also has a secret reference to the closure it was created in.

A misconception may arise here, that the local variables are copied, **they are not**, instead, they are stored by reference.

```js
function myFunc() {
    var myVar = 1   // myVar is a local variable

    function myInnerFunc() {
        console.log(myVar)
    }

    myVar++

    return myInnerFunc
}

myFunc()()        // 2
```

> A closure in JavaScript is like keeping a copy of all the local variables, just as they were when the function exited.

So, before `myFunc` function exited, `myVar` was incremented and its value was stored as `2`.


### Global functions and closures

```js
var increment, get, set   // global variables

function myFunc() {
    var myVar = 0     // local variable

    // The three global functions have access to same closure.
    increment = function() { myVar++ }
    get = function() { console.log(myVar) }
    set = function(newVar) { myVar = newVar }
}

myFunc()

get()         // 0
increment()
get()         // 1
set(4)
get()         // 4
increment()
get()         // 5

/* Again calling myFunc creates a new closure and 
old variables are overwritten by new functions with new closures
*/
myFunc()

get()        // 0
```

> In JavaScript, whenever you declare a function inside another function, the inside function(s) is/are recreated again each time the outside function is called.

We can extend the above example to private methods,

```js
let c = (function() {
    // Private variables
    let _privateVar = 0
    function _changeBy(x) {
        _privateVar += x
    }

    // Public variables
    return {
        increment: function() {
            _changeBy(1)
        },
        decrement: function() {
            _changeBy(-1)
        },
        get: function() {
            return _privateVar
        },
        set: function(x) {
            _privateVar = x
        }
    }
})()            // Immediately invoked function

console.log(c)  // {increment: ƒ, decrement: ƒ, get: ƒ, set: ƒ}

c.get()        // 0
c.set(1)
c.get()        // 1
c.increment()
c.get()        // 2
c.decrement()
c.get()        // 1 
```

Using closures in this way is known as the **module pattern**.
We have created a single lexical environment that is shared by four functions: 
`increment`, `decrement`, `get` and `set`. Neither of `_privateVar` nor `_changeBy` is accessible to the world.

## Scopes

### Global Scope

```js
let a = 'Tyrion'
let a = 'Cerci'  // Uncaught SyntaxError: Identifier 'a' has already been declared

var b = 'Boltons'
var b = 'Starks'  // Be careful!
console.log(b)   // Starks
```
### Local Scope

Variables that are usable only in a specific part of the code are considered to be in a local scope. These variables are also called *local variables*.

#### Block Scope

```js
{
    const a = 'Var 1'
}

console.log(a)      // Uncaught ReferenceError: a is not defined
```

#### Function Scope

```js
function a() {
    const b = 'Winterfell'

    console.log(b)
}

a()                 // Winterfell

console.log(b)      // Uncaught ReferenceError: b is not defined
````

Functions do not have access to each other's scopes!

```js
function first() {
    const a = 'Heat'
}

function second() {
    first()

    console.log(a) // Uncaught ReferenceError: a is not defined
}
```

## Hoisting

> Hoisting is a mechanism where variables and function declarations are moved to the top of their scope before code execution.

This means no matter where we declare functions or variables, they are moved to the top of their scope!

Hoisting mechanism only moves the declaration. The **assignments** are left in place.

### A slight heads up

```js
console.log(typeof a) // undefined

console.log(a)        // ReferenceError: a is not defined
```

> Undeclared variable is assigned undefined at execution and is also of type undefined.

> ReferenceError is thrown when trying to access a previously undeclared variable.

### Hoisting variables

```js
var a

console.log(a)    // 1
a = 1
```

OR

```js
var a, b

add(1, 2)     // 3

function add(a, b) {
    console.log(a + b)
}
```

All variable and function declarations are hoisted to the top of their scope. Also variable declarations are processed before any code is executed. However, undeclared variables do not exist until code assigning them is executed. 

> All undeclared variables are global variables.

Let's consider a tricky example:

```js
function trick() {
    a = 1
    var b = 2
}

trick()

console.log(a)   // 1
console.log(b)   // ReferenceError: b is not defined
```

Both `a` and `b` are hoisted to the top of their scopes. `b` is declared inside `trick` so it is not accessible outside its scope but because `a` is **not** declared inside `trick` so it is available to global scope!

#### ES5 way

The scope of a variable declared with `var` is its *current execution context*.

##### Case of global scope

```js
console.log(a)  // undefined

var a = 'Yay!'
```

We expected `ReferenceError` but got `undefined`! This happens as JavaScript has hoisted the variables `a`. This is what the code above looks like to the interpreter:

```js
var a

console.log(a)  // undefined

a = 'Yay!'
```

Because of this, a variable can be used before declaring it. However, we have to be careful because the hoisted variable is initialized with a value of `undefined`. This can introduce unintended behavior in the program and difficult to trace!


#### Case of function scope

Similar concept can be extended to function scopes:

```js
function myFunc() {
    console.log(a)
    var a = 'Yay!'
}

myFunc()      // undefined
```

To avoid this we should declare and initialize the variable before using it.

#### The `"use strict"` enforcement

By enabling [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode), we opt into a restricted variant of JavaScript that does not allow the usage of variables before they are declared.

```js
'use strict'

console.log(a)   // ReferenceError: a is not defined
a = 'Yay!' 
```

#### ES6 way

ES6 introduced `let` and `const`. 

> Variables declared with `let` are block scoped not function scoped. 

It means that the variable's scope is bound to the block in which it is declared and not the function in which it is declared.

Let's analyse `let`'s behaviour:

```js
console.log(a)  // ReferenceError: a is not defined

let a = 'Yay!'
```

**This ensures that we always declare our variables first.**

However, we still need to be careful:

```js
let a

console.log(a)  // undefined
a = 'Yay!'
```

Hence, we should declare then assign our variables before using them.

The `const` keyword allows **immutable** variables(one those **cannot** be modified once assigned). With `const` also, the variable is hoisted to top the block.

```js
const a = 0

a = 1    // TypeError: Assignment to constant variable.
```

`const` behaves same as `let`

```js
console.log(a)  // ReferenceError: a is not defined

const a = 'Yay!'
```

An interesting error arises if we try to do something like this:

```js
const a

console.log(a) // SyntaxError: Missing initializer in const declaration
a = 0
```

Therefore, we need to both declare and initialize a constant variable before use.

### Hoisting Functions

JavaScript functions can be loosely classified as the following:

- Function declarations
- Function expressions

> JavaScript hoists function declarations, but not function expressions.

#### Function Declaration

If a function is declared but isn’t assigned to a variable, it will be hoisted to the top of its scope.

```js
myFunc()     // Joy!

function myFunc() {
  console.log('Joy!')
}
```

#### Function Expression

A function expression, **will not** be hoisted.

```js
myFunc()    // TypeError: myFunc is not a function

var myFunc = function () { 
  console.log('Sad!') 
}
```

<hr />

The journey continues! I will talk about some more advanced concepts in JavaScript in future posts. 


> JavaScript is the only language that I’m aware of that people feel they don’t need to learn before they start using it.  
             - *Douglas Crockford*

À bientôt.

