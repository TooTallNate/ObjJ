Objective-J
===========
### [Objective-J][wikipedia] compiler for NodObjC

## This is a work in progress!!!

This is a fork of the Cappuccino Objective-J preprocessor that outputs valid
[NodObjC][] syntax. The major difference is that you specify regular official
Cocoa classes like `NSString`.

Installation
------------

Install with `npm`:

``` bash
$ npm install -g objj
```


Examples
--------

``` objj
@import <Foundation>

// creating a new Class, inheriting from NSObject
@implementation Person : NSObject {
  NSString *name;
}
- (id)initWithName: (NSString *) aName {
  self = [super init];
  [self setName: name];
  return self;
}

- (void) setName: (NSString *) aName {
  name = aName;
}

- (NSString *) name {
  return name;
}

+ (id) allocWithName: (NSString *)aName {
  return [[self alloc] initWithName: aName];
}
@end

// create an NSAutoreleasePool instance
var pool = [[NSAutoreleasePool alloc] init];

// create one of our Person instances
var person = [Person allocWithName: @"Nathan"];
console.log([person name]);
// "Nathan"
```


License
-------

Preprocessor.js
Objective-J

Originally created by Francisco Tolmasky.
Copyright 2008-2010, 280 North, Inc.

Modified to output NodObjC syntax by Nathan Rajlich
Copyright 2012

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General
Public License along with this library; if not, write to the Free
Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA

[wikipedia]: http://wikipedia.org/wiki/Objective-J
[tutorial]: http://cappuccino.org/learn/tutorials/objective-j-tutorial.php
[NodObjC]: https://github.com/TooTallNate/NodObjC
