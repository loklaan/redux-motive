import isAsyncFunction from '../is-async-function';

describe('isAsyncFunc', () => {
  it('should work on async anon function', () => {
    expect(isAsyncFunction(async function () {})).toBeTruthy();
  });
  it('should work on async fat arrow', () => {
    expect(isAsyncFunction(async () => {})).toBeTruthy();
  });
  it('should work on async obj prop anon function', () => {
    const foo = {
      async bar () {}
    }
    expect(isAsyncFunction(foo.bar)).toBeTruthy();
  });
  it('should work on async obj prop fat arrow function', () => {
    const foo = {
      baz: async () => {}
    }
    expect(isAsyncFunction(foo.baz)).toBeTruthy();
  });
  it('should work on async class method', () => {
    class Foo {
      async foo () {}
    }
    const baz = new Foo();
    expect(isAsyncFunction(baz.foo)).toBeTruthy();
  });

  it('should not work on generator anon function', () => {
    expect(isAsyncFunction(function* () {})).toBeFalsy();
  });
  it('should not work on generator obj prop anon function', () => {
    const foo = {
      *bar () {}
    }
    expect(isAsyncFunction(foo.bar)).toBeFalsy();
  });
  it('should not work on generator obj prop fat arrow function', () => {
    const foo = {
      baz: function* () {}
    }
    expect(isAsyncFunction(foo.baz)).toBeFalsy();
  });
  it('should not work on generator class method', () => {
    class Foo {
      *foo () {}
    }
    const baz = new Foo();
    expect(isAsyncFunction(baz.foo)).toBeFalsy();
  });
});