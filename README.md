# Redux Motive

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
import reducer from './reducers/index';

const store = createStore(
  reducer,
  applyMiddleware(thunk)
)
```

## API

// TODO

## License

Licensed under the MIT License, Copyright © 2017 Lochlan Bunn.

[redux-thunk]: https://github.com/gaearon/redux-thunk
