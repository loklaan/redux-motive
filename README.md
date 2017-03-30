# Redux Motive

Redux util for encapsulating action creators and reducers, with async conveniences.

```js
// weather.js
import ReduxMotive from 'redux-motive'

export default ReduxMotive({
  // Initial state, motive name & default handlers
  config: {
    state: {
      loading: false,
      error: null,
      location: null,
      today: null,
      tomorrow: null,
      weatherWarnings: null,
      warningsLoading: false,
      warningsError: null,
      showWeatherWarnings: true
    },
    prefix: 'weather',
    handlers: {
      start: (state) => ({ ...state, loading: true }),
      end: (intentState) => ({ ...intentState, loading: true }),
      error: (state) => ({ ...state, error: error, loading: false }),
    }
  },


  // Intents
  // These will be converted into Action Creators and a single Reducer.

  // Synchronous Intent - immediately return a new state tree.
  hideWarnings (state) {
    return {
      ...state,
      showWarnings: false
    }
  },

  // Asynchronous Intent - eventually return a new state tree via a final thunk.
  // An async Intent has three internal intents firing off during the lifecycle
  // of the promises. They are defined in the model, or overridden intent.
  async fetchForecasts (motive, lat, lng) {
    motive.fetchWarnings();
    const todaysCast = await forecastApi(lat, lng)
    const tomorrowsCast = await forecastApi(lat, lng)

    return state => ({
      ...state,
      today: todaysCast,
      tomorrow: tomorrowsCast
    })
  },

  // Asynchronous Intent with overridden handlers.
  fetchWarnings: {
    intent: async function fetchWarnings (motive, lat, lng) {
      const weatherWarnings = await warningsApi(lat, lng)

      return state => {
        const hasChanged = state.weatherWarnings !== weatherWarnings
        return !hasChanged ? state : {
          ...state,
          weatherWarnings,
          showWarnings: true
        }
      }
    },
    handlers: {
      start: (state) => ({ ...state, warningsLoading: true }),
      end: (intentState) => ({ ...intentState, warningsLoading: false }),
      error: (state, error) =>
        ({ ...state, warningsError: error, warningsLoading: false }),
    }
  }
})

// store.js
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import weatherMotive from './weather'

const store = createStore(
  weatherMotive.reducer,
  applyMiddleware(thunk)
)

store.dispatch(weatherMotive.hideWarnings())
store.dispatch(weatherMotive.fetchForecasts(42, 42))
```

## Huh?

Motive is an abstraction of Redux action creators and reducers, comprised of
data-flow functions called Intents.

An 'Intent' fulfills the roles of an action creator and a reducer; it is
a pattern to encapsulate concerns of both into a single function that
takes free-form parameters to return a new state tree.

Async intents are given further utility, by wrapping their invocation
lifecycle with start, end, and error handlers. These can be easily overridden
to suit the state shape of the Motive.

A Motive will generate an object comprised of action creators, with the name
of intents, and a function named reducer.

Async Intents use redux-thunk, making it a required middleware in the same
redux store configured with a Motive's reducer.

## License

MIT
