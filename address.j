@import <Foundation>

@implementation Address : NSObject {
   NSString name;
   NSString city;
}

- (id)initWithName:(NSString)aName city:(NSString)aCity {
  console.log('before');
  if (self = [super init]) {
    console.log('after');
    name = aName;
    city = aCity;
  }

  return self;
}

- (void)setName:(NSString)aName {
  name = aName;
}

- (NSString)name {
  return name;
}

+ (id)newAddressWithName:(NSString)aName city:(NSString)aCity {
  return [[self alloc] initWithName:aName city:aCity];
}

@end

var pool = [[NSAutoreleasePool alloc] init];

console.log(Address.methods());

// now we can do stuff for the main file
var a = [[Address alloc] initWithName: @"Greenfield Ave." city: @"San Rafael"];
console.log(a.methods());
console.log(a('class'));
console.log(a.ivars(Infinity));
a
