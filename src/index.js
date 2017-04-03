const isAsyncFunc = require('is-async-func');

const PROGRESS_STATE_PROP = 'progressing';
const MOTIVE_PREFIX = '@@MOTIVE';
const FUNCOBJ_EFFECT_KEY = 'effect';
const META_MOTIVE_ASYNC = '@@motiveasync';
const META_MOTIVE_ARGS = '@@motiveargs';
const HANDLER_SUFFIXES = {
  START: 'START',
  END: 'END',
  ERROR: 'ERROR'
}
const DEFAULT_HANDLERS = {
  start: (state) =>
    Object.assign({}, state, { [PROGRESS_STATE_PROP]: true }),
  end: (state) =>
    Object.assign({}, state, { [PROGRESS_STATE_PROP]: false }),
  error: (state, error) =>
    Object.assign({}, state, { [PROGRESS_STATE_PROP]: false, error })
}

/**
 * ReduxMotive generates Action Creators and a Reducer, from sync or async
 * functions.
 *
 * redux-thunk is required in the redux store.
 *
 * @constructor
 * @param {Object<>} configuration
 * @return {Object<>}
 */
function ReduxMotive (configuration) {
  if (!(this instanceof ReduxMotive)) {
    return new ReduxMotive(configuration);
  }

  const config = configuration.config;
  const actionCreators = {};
  const reducersMap = {};
  const PREFIX = intentPrefix(config.prefix || '');
  const defaultHandlers = (config && config.handlers) || DEFAULT_HANDLERS;
  const bindAsMotive = memoizeFirst(constructEffectMotive);

  const IGNORED_KEYS = [ 'config' ];
  function loopMotiveConfiguration (funcName) {
    if (IGNORED_KEYS.includes(funcName)) return;

    const ACTION_TYPE = `${PREFIX}/${snakeCase(funcName)}`;
    let func = configuration[funcName];
    let ourHandlers = defaultHandlers;
    const hitAsyncConfig = !!func[FUNCOBJ_EFFECT_KEY];
    if (hitAsyncConfig) {
      ourHandlers = func.handlers || ourHandlers;
      func = func[FUNCOBJ_EFFECT_KEY];
    }

    if (hitAsyncConfig || isAsyncFunc(func)) {
      const TYPE_START = `${ACTION_TYPE}/${HANDLER_SUFFIXES.START}`;
      const TYPE_END = `${ACTION_TYPE}/${HANDLER_SUFFIXES.END}`;
      const TYPE_ERROR = `${ACTION_TYPE}/${HANDLER_SUFFIXES.ERROR}`;

      function asyncMotiveActionCreator () {
        const args = [...arguments];
        return function asyncMotiveThunk (dispatch, getState) {
          const meta = {
            [META_MOTIVE_ARGS]: args
          };

          dispatch(createAsyncAction(TYPE_START, meta));

          const boundMotive = bindAsMotive(actionCreators, dispatch, getState)
          func(boundMotive, ...args)
            .then(() => {
              dispatch(createAsyncAction(TYPE_END, meta));
            })
            .catch(err => {
              dispatch(createAsyncAction(TYPE_ERROR, meta, err));
            })
        };
      }
      asyncMotiveActionCreator.ACTION_TYPE_START = TYPE_START;
      asyncMotiveActionCreator.ACTION_TYPE_END = TYPE_END;
      asyncMotiveActionCreator.ACTION_TYPE_ERROR = TYPE_ERROR;
      actionCreators[funcName] = asyncMotiveActionCreator;

      reducersMap[TYPE_START] = (state, action) => {
        return ourHandlers.start(
          state,
          ...(action.meta[META_MOTIVE_ARGS])
        );
      }
      reducersMap[TYPE_END] = (state, action) => {
        return ourHandlers.end(
          state,
          ...(action.meta[META_MOTIVE_ARGS])
        );
      }
      reducersMap[TYPE_ERROR] = (state, action) => {
        return ourHandlers.error(
          state,
          action.payload,
          ...(action.meta[META_MOTIVE_ARGS])
        );
      }
    } else {
      function syncMotiveActionCreator () {
        return createMotiveAction(
          ACTION_TYPE,
          { [META_MOTIVE_ARGS]: [ ...arguments ] }
        )
      }
      syncMotiveActionCreator.ACTION_TYPE = ACTION_TYPE;
      actionCreators[funcName] = syncMotiveActionCreator;

      function syncMotiveReducer (state, action) {
        return func(state, ...(action.meta[META_MOTIVE_ARGS]));
      }
      reducersMap[ACTION_TYPE] = syncMotiveReducer;
    }
  }

  Object.keys(configuration).forEach(loopMotiveConfiguration);

  function motiveReducer (state = config.initialState, action) {
    return reducersMap[action.type]
      ? reducersMap[action.type](state, action)
      : state;
  }

  const motive = Object.assign({}, actionCreators);
  Object.defineProperty(motive, 'reducer', { value: motiveReducer });
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
  return `${MOTIVE_PREFIX}${name ? '/' : ''}${snakeCase(name)}`;
}

function createMotiveAction (type, meta, payload) {
  const action = { type, meta };
  if (payload) action.payload = payload;
  return action;
}

function createAsyncAction (...args) {
  const action = createMotiveAction(...args);
  action.meta[META_MOTIVE_ASYNC] = true;
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

function constructEffectMotive (actionCreators, dispatch, getState) {
  const motive = {};
  Object.defineProperty(motive, 'dispatch', { value: dispatch });
  Object.defineProperty(motive, 'getState', { value: getState });
  return bindDispatchToActionCreators(motive, actionCreators, dispatch);
}

function bindDispatchToActionCreator (func, dispatch) {
  return function () {
    return dispatch(func.apply(null, arguments));
  };
}

function bindDispatchToActionCreators (target, actionCreators, dispatch) {
  return Object.keys(actionCreators).reduce((target, funcName) => {
    target[funcName] = bindDispatchToActionCreator(
      actionCreators[funcName],
      dispatch
    );
    return target;
  }, target);
}
