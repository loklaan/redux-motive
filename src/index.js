const PROGRESS_STATE_PROP = 'progressing'
const MOTIVE_PREFIX = '@@MOTIVE'
const FUNCOBJ_EFFECT_KEY = 'effect'
const META_MOTIVE_ASYNC = '@@motiveasync'
const META_MOTIVE_ARGS = '@@motiveargs'
const HANDLER_SUFFIXES = {
  START: 'START',
  END: 'END',
  ERROR: 'ERROR'
}
const DEFAULT_HANDLERS = {
  start: state => Object.assign({}, state, { [PROGRESS_STATE_PROP]: true }),
  end: state => Object.assign({}, state, { [PROGRESS_STATE_PROP]: false }),
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
 * @param {Object<>} [configuration.config]
 * @param {Object<>} [configuration.sync]
 * @param {Object<>} [configuration.async]
 * @return {Object<>}
 */
function ReduxMotive (configuration) {
  if (!(this instanceof ReduxMotive)) {
    return new ReduxMotive(configuration)
  }

  const { config = {}, sync: syncMotives, async: asyncMotives } = configuration
  if (!(syncMotives || asyncMotives)) {
    throw new Error(
      "Expected props 'sync' or 'async' to be defined for the Motive."
    )
  }
  const actionCreators = {}
  const reducersMap = {}
  const PREFIX = intentPrefix(config.prefix || '')
  const defaultHandlers = (config && config.handlers) || DEFAULT_HANDLERS
  const bindAsMotive = memoizeFirst(constructEffectMotive)

  function extractActionCreatorAndReducerFromSyncMotive (syncMotiveKey) {
    const ACTION_TYPE = `${PREFIX}/${snakeCase(syncMotiveKey)}`
    const syncMotiveFunc = syncMotives[syncMotiveKey]

    function syncMotiveActionCreator () {
      return createMotiveAction(ACTION_TYPE, {
        [META_MOTIVE_ARGS]: [...arguments]
      })
    }
    syncMotiveActionCreator.ACTION_TYPE = ACTION_TYPE

    function syncMotiveReducer (state, action) {
      return syncMotiveFunc(state, ...action.meta[META_MOTIVE_ARGS])
    }

    actionCreators[syncMotiveKey] = syncMotiveActionCreator
    reducersMap[ACTION_TYPE] = syncMotiveReducer
  }

  function extractActionCreatorsAndReducerFromAsyncMotive (asyncMotiveKey) {
    const ACTION_TYPE = `${PREFIX}/${snakeCase(asyncMotiveKey)}`
    const ACTION_TYPE_START = `${ACTION_TYPE}/${HANDLER_SUFFIXES.START}`
    const ACTION_TYPE_END = `${ACTION_TYPE}/${HANDLER_SUFFIXES.END}`
    const ACTION_TYPE_ERROR = `${ACTION_TYPE}/${HANDLER_SUFFIXES.ERROR}`
    const asyncMotiveConfig = asyncMotives[asyncMotiveKey]
    let asyncMotiveFunc
    let asyncMotiveHandlers = defaultHandlers
    const hitAsyncConfig = !(asyncMotiveConfig instanceof Function)
    if (hitAsyncConfig) {
      asyncMotiveHandlers = asyncMotiveConfig.handlers || asyncMotiveHandlers
      asyncMotiveFunc = asyncMotiveConfig[FUNCOBJ_EFFECT_KEY]
    } else {
      asyncMotiveFunc = asyncMotiveConfig
    }

    function asyncMotiveActionCreator () {
      const args = [...arguments]
      return function asyncMotiveThunk (dispatch, getState) {
        const meta = {
          [META_MOTIVE_ARGS]: args
        }

        dispatch(createAsyncAction(ACTION_TYPE_START, meta))

        const boundMotive = bindAsMotive(actionCreators, dispatch, getState)
        asyncMotiveFunc(boundMotive, ...args)
          .then(() => {
            dispatch(createAsyncAction(ACTION_TYPE_END, meta))
          })
          .catch(err => {
            dispatch(createAsyncAction(ACTION_TYPE_ERROR, meta, err))
          })
      }
    }
    asyncMotiveActionCreator.ACTION_TYPE_START = ACTION_TYPE_START
    asyncMotiveActionCreator.ACTION_TYPE_END = ACTION_TYPE_END
    asyncMotiveActionCreator.ACTION_TYPE_ERROR = ACTION_TYPE_ERROR

    const asyncMotiveReducers = {
      [ACTION_TYPE_START]: (state, action) =>
        asyncMotiveHandlers.start(state, ...action.meta[META_MOTIVE_ARGS]),
      [ACTION_TYPE_END]: (state, action) =>
        asyncMotiveHandlers.end(state, ...action.meta[META_MOTIVE_ARGS]),
      [ACTION_TYPE_ERROR]: (state, action) =>
        asyncMotiveHandlers.error(
          state,
          action.payload,
          ...action.meta[META_MOTIVE_ARGS]
        )
    }

    actionCreators[asyncMotiveKey] = asyncMotiveActionCreator
    reducersMap[ACTION_TYPE_START] = asyncMotiveReducers[ACTION_TYPE_START]
    reducersMap[ACTION_TYPE_END] = asyncMotiveReducers[ACTION_TYPE_END]
    reducersMap[ACTION_TYPE_ERROR] = asyncMotiveReducers[ACTION_TYPE_ERROR]
  }

  syncMotives &&
    Object.keys(syncMotives).forEach(
      extractActionCreatorAndReducerFromSyncMotive
    )
  asyncMotives &&
    Object.keys(asyncMotives).forEach(
      extractActionCreatorsAndReducerFromAsyncMotive
    )

  function motiveReducer (state = config.initialState, action) {
    return reducersMap[action.type]
      ? reducersMap[action.type](state, action)
      : state
  }

  const motive = Object.assign({}, actionCreators)
  Object.defineProperty(motive, 'reducer', { value: motiveReducer })
  return motive
}

export default ReduxMotive

function snakeCase (str) {
  return str
    .replace(/\W/g, '_')
    .replace(/(?!^.)[A-Z]/g, c => '_' + c.toUpperCase())
    .replace(/\w/g, c => c.toUpperCase())
}

function intentPrefix (name) {
  return `${MOTIVE_PREFIX}${name ? '/' : ''}${snakeCase(name)}`
}

function createMotiveAction (type, meta, payload) {
  const action = { type, meta }
  if (payload) action.payload = payload
  return action
}

function createAsyncAction (...args) {
  const action = createMotiveAction(...args)
  action.meta[META_MOTIVE_ASYNC] = true
  return action
}

function memoizeFirst (func) {
  const cache = new WeakMap()
  return function (arg) {
    if (!cache.has(arg)) {
      cache.set(arg, func.apply(null, arguments))
    }
    return cache.get(arg)
  }
}

function constructEffectMotive (actionCreators, dispatch, getState) {
  const motive = {}
  Object.defineProperty(motive, 'dispatch', { value: dispatch })
  Object.defineProperty(motive, 'getState', { value: getState })
  return bindDispatchToActionCreators(motive, actionCreators, dispatch)
}

function bindDispatchToActionCreator (func, dispatch) {
  return function () {
    return dispatch(func.apply(null, arguments))
  }
}

function bindDispatchToActionCreators (target, actionCreators, dispatch) {
  return Object.keys(actionCreators).reduce((target, funcName) => {
    target[funcName] = bindDispatchToActionCreator(
      actionCreators[funcName],
      dispatch
    )
    return target
  }, target)
}
