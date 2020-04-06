---
layout: post
title: Diving Deep into JavaScript (Part 2)
categories:
- javascript
---

This post is in continuation of the previous post [Diving Deep into JavaScript (Part 1)](/javascript/2018/01/29/diving-deep-into-javascript/)

Continuing on my journey into the world of JavaScript, I came across some more intriguing concepts.

Topics covered in this post:

- Promises
- Async/Await


## Promises

> A promise is object that may produce a value some time in future, either resolved or, a reason that it's not resolved.

A Promise is a proxy for a value not necessarily known when the promise is created. It allows you to associate handlers with an asynchronous action's eventual success value or failure reason. This lets asynchronous methods return values like synchronous methods: instead of immediately returning the final value, the asynchronous method returns a promise to supply the value at some point in the future.

In more simpler words,

> A promise is an object which can be returned synchronously from an asynchronous function.

Syntax for a promise object

```js
let promise = new Promise((resolve, reject) => {
    // executor code
})
```

> Promises are eager, meaning that a promise will start doing whatever task you give it as soon as the promise constructor is invoked.

The resulting `promise` object has internal properties:
- `state` - initially **pending**, then changes to either **fulfilled** or **rejected**,
- `result` - an arbitrary value of your choosing, initially **undefined**.

When the executor finishes the job, it should call one of the functions that it gets as arguments:

- `resolve(value)` - to indicate that the job finished successfully:
    - sets state to **fulfilled**,
    - sets result to value.
- `reject(error)` - to indicate that an error occurred:
    - sets state to **rejected**,
    - sets result to error.

![MDN Promises](/images/promise.png)

A Promise object serves as a link between the executor and the consuming functions (then and catch), which will receive the result or error.

```js
promise
  .then(result => {})
  .catch(error => {})
```

## Async/Await

The async/await syntax in JavaScript ES7 makes it easier to coordinate asynchronous promises.

If you want to asynchronously fetch data from mutiple databases or APIs in a certain order, you can end up with complicated code using promises and callbacks. The `async/await` construct allows us to express such logic with more readablility and maintainable code.

### Async Functions

An async function is a shortcut for defining a function which returns a promise.

```js
function f() {
    return Promise.resolve('testing')
}

// asyncF is equivalent to f!
async function asyncF() {
    return 'testing'
}
```

The above definitions are equivalent.

### Await

It can only be used with `async` functions and helps us to wait for promise synchronously.

For example,

```js
const rp = require('request-promise')

// With Promises
const call1 = rp('http://api.example.com/')

call1.then(result => {
    // Executes after the first request has finished
    console.log(result)

    const call2 = rp('http://api.example.com/')
    const call3 = rp('http://api.example.com/')

    return Promise.all([call2, call3])
}).then(arr => {
    // Executes after both promises have finished
    console.log(arr[0])
    console.log(arr[1])
})

// With async/await
async function sol() {
    // Wait for the first HTTP call
    // and print the result
    console.log(await rp('http://api.example.com/'))

    // Spawn the HTTP calls without waiting for them - run them concurrently
    const call2 = rp('http://api.example.com/')  // Does not wait!
    const call3 = rp('http://api.example.com/')  // Does not wait!

    // After they are both spawn - wait for both of them
    const response2 = await call2
    const response3 = await call3

    console.log(response2)
    console.log(response3)
}

// Call the async function
sol().then(() => console.log('Finished'))
```

In the above snippet, we encapsulate the `sol` in an async function. This allows us to directly await for the promises, thus avoiding the need for then callbacks.

Under the hood, await/await actually translate to promises and then callbacks. In other words, it’s syntactic sugar for working with promises. Every time we use await, the interpreter spawns a promise, and puts the rest of the operations from the async function in a then callback.


