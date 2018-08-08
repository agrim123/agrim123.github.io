---
layout: post
title: Google Summer of Code 2018 with Bundler
comments: true
categories:
- gsoc
- ruby
- bundler
---

I got selected as a Google Summer of Code student in Bundler for the project [Integrate functionality from bun into Bundler](https://github.com/rubygsoc/rubygsoc/wiki/Ideas-for-Bundler#integrate-functionality-from-bun-into-bundler). Results came out on April 23 09:30 P.M. IST, couldn’t sleep the night out of excitement.

```ruby
class Achievement
  def initialize(name, year, info)
    @name = name
    @year = year
    @info = info
  end

  def display
    "#{@name} #{@year} in #{@info}. Yay!"
  end
end

puts Achievement.new("GSoC", "2018", "Bundler").display
# GSoC 2018 in Bundler. Yay!
```

Here is the mandatory picture :p.

![GSoC](/images/GSoC.png)

## `GSoC.inspect`

> It's Awesome!! <3

Google Summer of Code is a global program focused on bringing more student developers into open source software development. Students work with an open source organization on a 3 month programming project during their break from school.
More details about GSoC [here](https://summerofcode.withgoogle.com/).

## `puts Journey.to(GSoC)`

I am an active member of [SDSLabs](https://sdslabs.co/), a group of really awesome people who are always exploring and building softwares to spread and improve technical culture in our campus.

It all started when I approached my senior for bundler, who was a past GSoC'er at Bundler. Consistency and hunger of knowledge are some of things I learned from him. He guided me throughtout the "selection phase" of GSoC.

Also being a part of [Cognizance](https://cognizance.org.in/), I have been introduced to some really awesome people. From this year's web team three people were selected for GSoC (from a team of 6!). A very good senior and a reliable junior. They were a constant help and I really owe it to them.

Having a little experience in Ruby and having used bundler I knew it's power and this led me to contrinute to bundler. I had been contributing solemnly to Bundler, not that I was sure of selection, but because it was love working on the project and with the team.

## `GSoC.project`

![Bundler](https://avatars0.githubusercontent.com/u/1137638?s=150&v=4)

[Bundler](https://bundler.io/) is no doubt one of the most active open source project used by millions of developers daily. The maintainers are some of the best ruby developers and equally helpful. Bundler has a rich list of [contributors](https://bundler.io/contributors.html) too, developers wanting to improve bundler.

My project is to migrate functionality of [bun](https://github.com/shime/bun) into [Bundler](https://github.com/bundler/bundler). This tool is really powerful when it comes to editing Gemfile from command line and intergrating it into Bundler would make Bundler more powerful. My project also includes adding more functionalities to previous commands to increase flexibilty.

## `next`

I have already started contributing to Bundler. You can check this GitHub [repository](https://github.com/bundler/bundler) for regular updates.

<br/>
Let the journey begin!

```ruby
Journey.new("Bundler").begin
```

See you soon user.
