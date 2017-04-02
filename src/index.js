const isAsyncFunc = require('is-async-func');

const PROGRESS_STATE_PROP = 'progressing';
const INTENT_PREFIX = '@@INTENT';
const META_INTENT_ASYNC = '@@intentasync';
const META_INTENT_ARGS = '@@intentargs';
const META_INTENT_STATE = '@@intentstate';
const HANDLER_SUFFIXES = {
  START: 'START',
  END: 'END',
  ERROR: 'ERROR'
}
const DEFAULT_HANDLERS = {
  start (state) {
    return Object.assign({}, state, { [PROGRESS_STATE_PROP]: true });
  },
  end (intentState) {
    return Object.assign({}, intentState, { [PROGRESS_STATE_PROP]: false });
  },
  error (state, error) {
    return Object.assign(
      {},
      state,
      { [PROGRESS_STATE_PROP]: false, error }
    );
  },
}

/**
 * Motive is an abstraction of Redux action creators and reducers, comprised of
 * data-flow functions called Intents.
 *
 * An 'Intent' fulfills the roles of an action creator and a reducer; it is
 * a pattern to encapsulate concerns of both into a single function that
 * takes free-form parameters to return a new state tree.
 *
 * Async intents are given further utility, by wrapping their invocation
 * lifecycle with start, end, and error handlers. These can be easily overridden
 * to suit the state shape of the Motive.
 *
 * A Motive will generate an object comprised of action creators, with the name
 * of intents, and a function named reducer.
 *
 * Async Intents use redux-thunk, making it a required middleware in the same
 * redux store configured with a Motive's reducer.
 *
 * @param {{config: {initialState,prefix,handlers}}} configuration
 * @constructor
 * @return {Object}
 */
function ReduxMotive (configuration) {
  if (!(this instanceof ReduxMotive)) {
    return new ReduxMotive(configuration);
  }

  const memoizedBoundMotives = memoizeFirst(bindDispatchToMotive);
  const config = configuration.config;
  const motive = {};
  const reducers = {};
  const PREFIX = intentPrefix(config.prefix || '');
  const defaultHandlers = (config && config.handlers) || DEFAULT_HANDLERS;

  const IGNORED_KEYS = [ 'config' ];
  Object.keys(configuration).forEach(intentName => {
    if (IGNORED_KEYS.includes(intentName)) return;

    const ACTION_TYPE = `${PREFIX}/${snakeCase(intentName)}`;
    let intent = configuration[intentName];
    let intentsHandlers = defaultHandlers;
    if (intent.intent) {
      intentsHandlers = intent.handlers || intentsHandlers;
      intent = intent.intent;
    }

    if (!isAsyncFunc(intent)) {
      // Synchronous Intents
      motive[intentName] = (...args) =>
        createAction(ACTION_TYPE, undefined, {
          [META_INTENT_ARGS]: args
        })
      motive[intentName].ACTION_TYPE = ACTION_TYPE;

      reducers[ACTION_TYPE] = (state, action) =>
        intent(state, ...(action.meta[META_INTENT_ARGS]));
    }
    else {
      // Asynchronous Intents
      const TYPE_START = `${ACTION_TYPE}/${HANDLER_SUFFIXES.START}`;
      const TYPE_END = `${ACTION_TYPE}/${HANDLER_SUFFIXES.END}`;
      const TYPE_ERROR = `${ACTION_TYPE}/${HANDLER_SUFFIXES.ERROR}`;

      motive[intentName] = (...args) => (dispatch, getState) => {
        dispatch(createAsyncAction(TYPE_START, undefined, {
          [META_INTENT_ARGS]: args
        }));

        const boundMotive = memoizedBoundMotives(motive, dispatch, getState)
        intent(boundMotive, ...args)
          .then(reducer => {
            const intentState = reducer(getState());
            dispatch(createAsyncAction(TYPE_END, undefined, {
              [META_INTENT_STATE]: intentState,
              [META_INTENT_ARGS]: args
            }));
          })
          .catch(err => {
            dispatch(createAsyncAction(TYPE_ERROR, err, {
              [META_INTENT_ARGS]: args
            }));
          })
      }
      motive[intentName].ACTION_TYPE_START = TYPE_START;
      motive[intentName].ACTION_TYPE_END = TYPE_END;
      motive[intentName].ACTION_TYPE_ERROR = TYPE_ERROR;

      reducers[TYPE_START] = (state, action) => {
        return intentsHandlers.start(
          state,
          ...(action.meta[META_INTENT_ARGS] || [])
        );
      }
      reducers[TYPE_END] = (state, action) => {
        return intentsHandlers.end(
          action.meta[META_INTENT_STATE],
          ...(action.meta[META_INTENT_ARGS] || [])
        );
      }
      reducers[TYPE_ERROR] = (state, action) => {
        return intentsHandlers.error(
          state,
          action.payload,
          ...(action.meta[META_INTENT_ARGS] || [])
        );
      }
    }
  });

  Object.defineProperty(motive, 'reducer', {
    writable: false,
    enumerable: false,
    value: (state = config.initialState, action) => {
      return reducers[action.type]
        ? reducers[action.type](state, action)
        : state;
    }
  });

  return motive;
}

module.exports = ReduxMotive;

function snakeCase (str) {
  return str
    .replace(/\W/g, '_')
    .replace(/(?!^.)[A-Z]/g, c => '_' + c.toUpperCase())
    .replace(/\w/g, c => c.toUpperCase())
}

function intentPrefix (name) {
  return `${INTENT_PREFIX}${name ? '/' : ''}${snakeCase(name)}`;
}

function createAction (type, payload, meta) {
  return {
    type,
    payload,
    meta,
    error: Error.isPrototypeOf(payload)
  };
}

function createAsyncAction (...args) {
  const action = createAction(...args);
  action.meta = action.meta || {};
  action.meta[META_INTENT_ASYNC] = true;
  return action;
}

function memoizeFirst (func) {
  const cache = new WeakMap();
  return function (arg) {
    if (!cache.has(arg)) {
      cache.set(arg, func.apply(null, arguments));
    }
    return cache.get(arg);
  }
}

function bindDispatchToIntent (intent, dispatch) {
  return function () {
    return dispatch(intent.apply(null, arguments));
  };
}

function bindDispatchToMotive (motive, dispatch, getState) {
  const bound = {};
  Object.defineProperty(bound, 'dispatch', { value: dispatch });
  Object.defineProperty(bound, 'getState', { value: getState });
  return Object.keys(motive).reduce((bound, name) => {
    const intent = motive[name].intent || motive[name];
    bound[name] = bindDispatchToIntent(intent);
    return bound;
  }, bound);
}
