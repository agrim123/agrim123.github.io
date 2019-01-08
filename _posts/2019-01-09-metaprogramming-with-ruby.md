---
layout: post
title: Metaprogramming 101 with ruby
comments: true
categories:
- ruby
---

> Metaprogramming is writing code that writes code

One of the most impressive aspects of Ruby is its metaprogramming capabilities.

Being a dynamic language, Ruby gives you the freedom to define classes and methods at runtime! Awesome!

Using Metaprogramming, we can reopen and modify classes, catch methods that do not exist, write code that is [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) and many more.

A problem may arise with opening a class at runtime and adding a method when the method created already exists is overwritten by the new definition. This is not intended! This process of editing classes in ruby is called **Monkeypatching**.

> In Ruby, **everything** is an *object*.

## Ruby Object Model

```bash

+---------------+
|               |
|  BasicObject  |
|               |
+---------------+
       ^
       |
       |  Superclass
       |
+---------------+                           +---------------+
|               |          Superclass       |               |
|    Object     | <------------------------ |    Module     |
|               | --------------            |               |
+---------------+               |           +---------------+
        ^                       | Class             ^
        |                       ----------------    |
        | Superclass                            |   | Superclass
        |                                      \ /  |
+---------------+                            +---------------+
|               |          Class             |               |
|    MyClass    | -------------------------> |     Class     |<------
|               |                            |               |      |
----------------+                            +---------------+      |
       ^                                             |              |
       |                                             |______________|
       |  Class                                             Class
       |
+---------------+
|               |
|     obj       |
|               |
+---------------+

```

```ruby
class MyClass
    @a

    def set(a)
        @a = a
    end

    def get
        @a
    end
end

obj = MyClass.new

# Ancestor Chain
p obj.class                              # MyClass
p obj.class.class                        # Class
p obj.class.class.superclass             # Module
p obj.class.class.superclass.superclass  # Object
p obj.class.superclass                   # Object
p obj.class.superclass.superclass        # BasicObject - The absolute parent of every object in Ruby.
```

## Methods

### Dynamically Defining Methods

Consider the following snippet

```ruby
def a
  puts "in a"
end

def b
  puts "in b"
end

def c
  puts "in c"
end

a
b
c

# => in a
# => in b
# => in c
```

We can remove the above redundancy by using Metaprogramming

```ruby
%w(a b c).each do |s|
  define_method(s) do
    puts "in #{s}"
  end
end

a
b
c

# => in a
# => in b
# => in c
```

You can find more about **Module#define_method** [here](https://ruby-doc.org/core-2.2.0/Module.html#method-i-define_method).

The [ActiveRecord](https://guides.rubyonrails.org/active_record_basics.html) code base is a prime example of how you can use metaprogramming to the max.

### Dynamically Calling Methods

Dynamically calling methods or attributes is a form of [reflective](https://en.wikipedia.org/wiki/Reflection_(computer_programming)) property.

An example of how to call a method by either the string or symbol name of that method in ruby:

```ruby
%w(a1 a2 a3).each do |s|
  define_method(s) do
    puts "#{s} was called"
  end
end

(1..3).each { |n| send("a#{n}") }

# => a1 was called
# => a2 was called
# => a3 was called
```

The [Object#send](http://ruby-doc.org/core-2.2.2/Object.html#method-i-send) method is how we can dynamically call methods.

Because every object in Ruby inherits from Object, you can also call send as a method on any object to access one of its other methods or attributes. `Object#send` even allows you to call private methods! Maybe you want to use [Object#public_send](http://ruby-doc.org/core-2.2.2/Object.html#method-i-public_send).

### Ghost Methods

What if I call a method that does not exists? Surely a `NoMethodError` would be thrown. We can avoid this error by using [BasicObject#method_missing ](https://ruby-doc.org/core-2.1.0/BasicObject.html#method-i-method_missing).

```ruby
class A
    def method_missing(method, *args, &block)
        puts "You called: #{method}(#{args.join(', ')})"
    end
end

a = A.new

a.alphabet
a.alphabet('a', 'b') { "foo" }

# => You called: alphabet()
# => You called alphabet(a, b)
# => (You also passed it a block)
```

It takes extra time to hit the method_missing handler because you traverse the Ancestor Chain.

<hr />

A few more powerful concepts that you can add to your ruby arsenal.

## Closures

Scope in ruby shifts at 3 major spots:
- Module Definition
- Class Definition
- Methods

Something like this is impossible

```ruby
v = "Hello"

class A
  # print v here

  def hello
    # and here
  end
end
```

This can be achieved by defining class and methods dynamically.

```ruby
v = "Hello"

my_class = Class.new do
  "#{v} in class definition"

  define_method :hello do
    "#{v} in method definition"
  end
end

puts my_class.new.hello

# => Hello in method definition
```

This seemingly "scopeless" process is called a **Flat Scope**.

## Evals

In ruby, there are 3 main types of evals:

- Instance Eval
- Class Eval
- Eval
