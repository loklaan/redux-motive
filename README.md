# Redux Motive ![stability](https://img.shields.io/badge/stability-%20%20%20%20%20experimental-red.svg)

[![size](https://badgen.net/badgesize/gzip/https://unpkg.com/redux-motive/dist/redux-motive.umd.js)](https://unpkg.com/redux-motive/dist/)
[![NPM](https://badgen.net/npm/v/redux-motive)](https://npmjs.com/package/redux-motive)
[![Travis](https://badgen.net/travis/loklaan/redux-motive)](https://travis-ci.org/loklaan/redux-motive)
[![Codecov](https://badgen.net/codecov/c/github/loklaan/redux-motive)](https://codecov.io/gh/loklaan/redux-motive)

Simplify writing action creators, reducers and effects - without breaking redux.


```js
const { reducer, ...actionCreators } = ReduxMotive({
  config: {},
  sync: {
    // Sync function, combines Action Creator and Reducer
    addTodo (state, todo) {
      return assign({}, state, { todos: [ ...state.todos, todo ] })
    },
  },
  async: {
    // Async function, combines Action Creator and Effect
    async createTodo (motive, text, isDone) {
      const todo = await api('/todo', {text, isDone})
      motive.addTodo(todo)
    }
  },
})
```

## Install

```shell
yarn add redux-motive
```

#### Requirements

Add `redux-thunk` to your store's middleware. _See [`redux-thunk` docs][redux-thunk] for more details._

```shell
yarn add redux-thunk
```

```js
import thunk from 'redux-thunk'
const store = createStore(reducers, applyMiddleware(thunk))
```

## Preamble

In UI development, our **motive**'s for using redux are predictable.

1. **Reduce an Action** to change the state _now_, to rerender the UI _soon_.
2. **Reduce the lifecycle of side effects**, from an Action, to change state _over time_, to rerender the UI as the _side effects progress_.

Redux is great for splitting data-flow concerns into small concepts, but it can introduce indirection to a developers code, and at times this becomes the source of errors.

Motive removes indirection, by combining the purpose of a data-flow function to be both an Action Creator and a Reducer, or an Action Creator and an Effect.

## Comparison

Generate action creators and a reducer with **Motive**.
```js
const { reducer, ...actionCreators } = ReduxMotive({
  sync: {
    // Sync function, combines Action Creator and Reducer
    addTodo (state, todo) {
      return assign({}, state, { todos: [ ...state.todos, todo ] })
    },
  },
  async: {
    // Async function, combines Action Creator and Effect
    async createTodo (motive, text, isDone) {
      const todo = await api('/todo', {text, isDone})
      motive.addTodo(todo)
    }
  },
})
```

Write action types, action creators and reducers with **common redux boilerplate**.
```js
const ADD_TODO = '@@MOTIVE/ADD_TODO'
const CREATE_TODO_START = '@@MOTIVE/CREATE_TODO_START'
const CREATE_TODO_END = '@@MOTIVE/CREATE_TODO_END'
const CREATE_TODO_ERROR = '@@MOTIVE/CREATE_TODO_ERROR'

const reducer = (state, action) => {
  switch (action.type) {
    case ADD_TODO:
      return assign({}, state, { todos: [ ...state.todos, todo ] })
    case CREATE_TODO_START:
      return assign({}, state, { progressing: true })
    case CREATE_TODO_END:
      return assign({}, state, { progressing: false })
    case CREATE_TODO_ERROR:
      return assign({}, state, { error: action.payload, progressing: false })
  }
}

const actionCreators = {
  addTodo (todo) {
    return { type: ADD_TODO, payload: { todo } }
  },

  createTodo (text, isDone) {
    return (dispatch) => {
      dispatch({ type: CREATE_TODO_START })
      api('/todo', {text, isDone})
        .then(todo => {
          dispatch(actionCreators.addTodo(todo))
          dispatch({ type: CREATE_TODO_END })
        })
        .catch(err => {
          dispatch({ type: CREATE_TODO_ERROR, payload: err })
        })
    }
  }
}
```

#### Summary

Inferring common redux patterns into `ReduxMotive` allows for _less_ coding.

* Action Creators often pass their params to Reducers in the Action; `ReduxMotive` always does behind the scenes.
* The progress of an effect's _lifecycle_ in `ReduxMotive` is reduced to state at common stages: _start, end or error_.
* Dispatching actions from the end of effects is guaranteed; `ReduxMotive` provides `dispatch`-bound Action Creators in an effect's first parameter.

## API

### *`ReduxMotive( { config, sync, async } )`*

The returned object can be used to provide a `reducer` to the Redux.

Additionally, every function configured for `sync` and `async` are accessible as dispatchable Action Creators.

```js
const motive = ReduxMotive({
  config: {}
  sync: {
    todo () {},
  },
  async: {
    async fetchTodo () {}
  }
});

console.log(motive);
// {
//   reducer,               Reducer function, wrapping all configured sync fns
//   todo,                  An Action Creator generated from sync.todo
//   fetchTodo              An Action Creator generated from async.fetchTodo
// }
```

#### Configuring

<details>
<summary><strong># <code>config</code></strong></summary>
  <p>

> _Initial state, default handlers for state/end/error, and optional prefix for action types._

```js

ReduxMotive({
  // Default config values
  config: {
    prefix: '',
    initialState: {},
    handlers: {
      start: (state) => assign({}, state, { progressing: true }),
      end: (state) => assign({}, state, { progressing: false }),
      error: (state, error) => assign({}, state, { progressing: false, error })
    },
  }
})
```

  </p>
</details>

<details>
<summary><strong># <code>sync</code></strong></summary>
  <p>


> _A collection of functions that combine the principles of an Action Creator and a **Reducer**._

They should:
1. Always return new state
2. Should not call any "side effects"

```js
const { todo } = ReduxMotive({
  sync: {
    todo (state, isDone) {
      return { ...state, isDone }
    }
  }
})

dispatch( todo(true) )
```

  </p>
</details>

<details>
<summary><strong># <code>async</code></strong></summary>
  <p>

> _Combination of an Action Creator and an **Effect**._

Function that is given a **`motive`** Object and any additional arguments from the generated Action Creator.

Expected to dispatch new Actions from invoke side effects (like server API calls).

Should return a Promise. The `async` function keyword can be used.

**`motive`** Object  
* `dispatch`
* `getState`
* Action Creators returned by `ReduxMotive`, bound to `dispatch`

```js
ReduxMotive({
  // ...

  async: {
    async fetchTodo (motive) {
      const todo = await api();
      motive.todo(todo.isDone)
    }
  }
})
```

**Lifecycles for an Async Function**

Refer to the [Comparison](#comparison) for when 'lifecycle' stages are actioned and reduced.

The stages can be overridden:  
* In the `config`
* Per (asynchronous) function

```js
ReduxMotive({
  config: {
    handlers: { /* ... */ }
  },

  async: {
    fetchTodo: {
      handlers: {
        start (state) { /* ... */ },
        end (state) { /* ... */ },
        error (state) { /* ... */ }
      },
      async effect (motive) {
        const todo = await api();
        motive.todo(todo.isDone)
      }
    }
  }
})
```

  </p>
</details>

#### Action Types

Action types for each Action Creators are available as properties, which is useful when attempting to match the types in a explicit way.

```js
console.log(motive.todo.ACTION_TYPE)
// @@MOTIVE/<PREFIX>/TODO_SYNC

console.log(motive.fetchTodo.ACTION_TYPE_START)
// @@MOTIVE/<PREFIX>/SYNC_TODO_START
console.log(motive.fetchTodo.ACTION_TYPE_END)
// @@MOTIVE/<PREFIX>/SYNC_TODO_END
console.log(motive.fetchTodo.ACTION_TYPE_ERROR)
// @@MOTIVE/<PREFIX>/SYNC_TODO_ERROR
```

> _You don't need to use these if you're dispatching the generated Action Creators._

## Alternatives & inspirations

_Library_                              | _Description_
---                                    | ---
[redux-schemas][redux-schemas]         | Similar redux util library, making different API choices, but with more utility.
[freactal][freactal]                   | Unidirection store for React, with a concise api for async actions and selectors.

## License

Licensed under the MIT License, Copyright © 2017-present Lochlan Bunn.

[redux-thunk]: https://github.com/gaearon/redux-thunk
[freactal]: https://github.com/FormidableLabs/freactal
[redux-schemas]: https://github.com/iamtommcc/redux-schemas
