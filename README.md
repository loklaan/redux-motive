# Redux Motive ![stability](https://img.shields.io/badge/stability-%20%20%20%20%20experimental-red.svg)

![size](https://img.shields.io/badge/gzip%20size-2.3%20kB-grey.svg)
![coverage](https://img.shields.io/badge/coverage-81%25-yellowgreen.svg)

Simplify writing action creators, reducers and effects - without breaking redux.

```js
const { reducer, ...actionCreators } = ReduxMotive({
  addTodo (state, todo) {
    return [ ...state, todo ]
  },

  async createTodo (motive, text, isDone) {
    const todo = await api('/todo', {text, isDone})
    return state => motive.addTodo(todo)
  }
})
```

## Preamble

In UI development, our **motive**'s for using redux are predictable.

1. Reduce an Action to change the state _now_, to rerender the UI _soon_.
2. Reduce the lifecycle of side effects, from an Action, to change state _over time_, to rerender the UI as the _effects progress_.

In both cases, we carry **intent** to change the state from the moment an Action is dispatched. Redux is great for splitting data-flow concerns into small concepts, but it can introduce indirection over our intent, and at times this becomes the source of errors.

## Ok so

**With Motive, we write our intents as single functions, to then generate Action Creators and a Reducer.**

```js
function concatToTodos (todo, state) {
  return Object.assign({}, state, {
    todos: state.todos.concat(todo)
  })
}

const { reducer, ...actionCreators } = ReduxMotive({
  addTodo (state, text) {
    const newTodo = { text, done: false }
    return concatToTodos(newTodo, state)
  }
})

const store = createStore(reducer, applyMiddleware(thunk))
store.subscribe((action) => console.log(
  action.type,
  store.getState()
))

store.dispatch(
  actionCreators.addTodo('Cook dinner')
)

// '@@INTENT/ADD_TODO'
// {
//   todos: { text: 'Cook dinner', done: false }
// }
```

---

**Motive reduces the state during the lifecycle of async functions, in three potential steps; start, end, error.**

> Async functions terminate in a reducer function, which will be merged with the _end_ lifecycle handler.

```js
//...
  async createTodo (state, text) {
    const todo = await api('/todo', {text})
    return state => {
      return concatToTodos(todo)
    }
  }
//...

store.dispatch(
  actionCreators.createTodo('Cook dinner')
)

// '@@INTENT/CREATE_TODO_START'
// {
//   progressing: true
// }

//...

// '@@INTENT/CREATE_TODO_END'
// {
//   progressing: false,
//   todos: { text: 'Cook dinner', done: false }
// }

//... (or if the api request failed)

// '@@INTENT/CREATE_TODO_ERROR'
// {
//   progressing: false,
//   error: Error
// }
```

## Install

Get started by installing Motive, and it's requirement `redux-thunk`.

```shell
npm install --save redux-motive redux-thunk
# yarn add redux-motive redux-thunk
```

Add the `redux-thunk` middleware to your store. _See [`redux-thunk` docs][redux-thunk] for more details._

```js
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import reducer from './reducers/index'

const store = createStore(
  reducer,
  applyMiddleware(thunk)
)
```

## API

### `ReduxMotive( configuration )`

#### `configuration` parameter

An object comprising a config object and intent functions.

##### `config`

Initial state, default handlers for state/end/error, and optional prefix for action types.

```js
ReduxMotive({
  config: {
    initialState: {},
    handlers: DEFAULT_HANDLERS,
    prefix: ''
  }
})
```

##### `intent` - _Sync_ function
> _Combination of a Reducer and an Action Creator._

Function that takes the state, with any additional arguments, and returns new state.

```js
ReduxMotive({
  someIntent (state, additional, args) {
    return state
  }
})
```

##### `intent` - _Async_ function
> _Combination of a Reducer, Effects, and an Action Creator._

Function that performs side effects before (optionally) returning a Reducer.

```js
ReduxMotive({
  async someIntent (motive, additional, args) {
    const response = await api(additional, args)
    return (state) => ({
      ...state,
      response
    })
  },
  
  async anotherIntent (motive) {
    motive.someIntent('additional', 'args')
  }
})
```

###### `motive` parameter

The first param in an async intent,`motive`, is similar to the return object with key differences:

* All generated action creators are bound to `dispatch`
* `dispatch` and `getState` are available as non-enumerable properties

###### Reducing async lifecycle

State is reduced several times, around the lifecycle of an async intent:

1. When first called, `start` reducer handler is called.
2. When the Reducer is returned from the async function, `end` reducer handler is called.
3. If an error threw during the async function, `error` reducer handler is called.

###### Lifecycle handlers per async intent

Turn an async intent function into an object, with the following props

* `intent` - The async intent function
* `handlers` - An object comprised of the `start`/`end`/`error` reducers

```js
ReduxMotive({
  something: {
    intent: async function (motive, additional, args) {
      const response = await api(additional, args)
      return (state) => ({
        ...state,
        response
      })
    },
    handlers: {
      start: (state) => { /* ... */ return newState },
      end: (intentState) => { /* ... */ return newState },
      error: (state, error) => { /* ... */ return newState }
    }
  }
})
```

#### Return

Calling `ReduxMotive` returns an object comprising Action Creators, generated from config and intents, with a single Reducer to handle the Actions of all intents.

```js
const motive = ReduxMotive({
  config: { /* ... */ },
  
  intentSync (state, foo, bar) {
    // ...
    return newState
  },
  
  async intentAsync (motive, baz, boo) {
    // effects ...
    return state => { /* ... */ return newState }
  }
})

console.log(motive)
// {
//   reducer: function (state, action) { ... },
//
//   intentSync: function (foo, bar) {
//     return { type: '@@INTENT/INTENT_SYNC', ... }
//   },
//
//   intentAsync: function (baz, boo) {
//     return { type: '@@INTENT/INTENT_ASYNC', ... }
//   }
// }
```

#### Action Types

Action Types are exposed for every intent, and intent lifecycle reducers.

For using and reducing intents in normal Redux code surface.

```js
console.log(motive.intentSync.ACTION_TYPE)
// @@INTENT/<PREFIX>/INTENT_SYNC

console.log(motive.intentAsync.ACTION_TYPE_START)
// @@INTENT/<PREFIX>/INTENT_ASYNC_START
console.log(motive.intentAsync.ACTION_TYPE_END)
// @@INTENT/<PREFIX>/INTENT_ASYNC_END
console.log(motive.intentAsync.ACTION_TYPE_ERROR)
// @@INTENT/<PREFIX>/INTENT_ASYNC_ERROR
```

#### Default Handlers

The default lifecycle handlers in Motive simply toggle a `progressing` prop on the state, and attaches an `error` when encounted. Override in the `config.handlers` of a new Motive, or per async intent.

```js
export default {
  start: (state) => ({ ...state, progressing: true }),
  end: (state) => ({ ...state, progressing: false }),
  error: (state, error) => ({ ...state, error, progressing: false }),
}
```

## License

Licensed under the MIT License, Copyright © 2017 Lochlan Bunn.

[redux-thunk]: https://github.com/gaearon/redux-thunk
