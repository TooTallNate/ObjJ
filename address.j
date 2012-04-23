@import <Foundation>

@implementation Address : NSObject {
   NSString name;
   NSString city;
}

- (id)initWithName:(NSString)aName city:(NSString)aCity {
  self = [super init];

  name = aName;
  city = aCity;

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

// now we can do stuff for the main file
var a = [[Address alloc] initWithName: @"Greenfield Ave." city: @"San Rafael"];
console.log(a);
