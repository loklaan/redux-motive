import regeneratorRuntime from 'regenerator-runtime'
import ReduxMotive from '../'
import {createStore, applyMiddleware} from 'redux'
import thunk from 'redux-thunk'

describe('ReduxMotive', () => {
  describe('constructor', () => {
    it('should not construct empty motive', () => {
      expect(() => {
        const motive = new ReduxMotive({})
      }).toThrow()
    })

    it('should construct a motive', () => {
      expect(() => {
        const motive = new ReduxMotive({
          sync: {foo () {}}
        })
        expect(motive).toMatchSnapshot()
        expect(motive.reducer).toMatchSnapshot()
      }).not.toThrow()
    })
  })

  describe('intents', () => {
    it('should work with single sync intent', () => {
      const motive = new ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        sync: {
          rain: (state, depthInMM) =>
            Object.assign({}, state, {
              rainDepth: depthInMM
            })
        }
      })

      const store = createStore(motive.reducer, applyMiddleware(thunk))

      store.dispatch(motive.rain(10))
      expect(store.getState()).toMatchSnapshot()
    })

    it('should work with single async motive', done => {
      let store = null
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async: {
          async rainSuperBad (motive, depthInMM) {
            return state => {
              done.fail(new Error('Should not have reached this code!'))
              return Object.assign({}, state, {
                rainDepth: depthInMM
              })
            }
          }
        }
      })

      store = createStore(motive.reducer, applyMiddleware(thunk))

      expect(store.getState()).toMatchSnapshot()
      store.dispatch(motive.rainSuperBad(10))
      expect(store.getState()).toMatchSnapshot()

      // Allow async actions into the event loop
      setTimeout(() => {
        expect(store.getState()).toMatchSnapshot()
        done()
      }, 0)
    })

    it('should work with single async motive that throws', done => {
      let store = null
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async: {
          async rainPrettyBad (motive, depthInMM) {
            throw new Error('foo')
          }
        }
      })

      store = createStore(motive.reducer, applyMiddleware(thunk))

      expect(store.getState()).toMatchSnapshot()
      store.dispatch(motive.rainPrettyBad(10))
      expect(store.getState()).toMatchSnapshot()

      // Allow async actions into the event loop
      setTimeout(() => {
        expect(store.getState()).toMatchSnapshot()
        done()
      }, 0)
    })

    it('should work with single async motive with configured handlers', done => {
      let store = null
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async: {
          rainPrettyGood: {
            effect: async function rainPrettyGood (motive, depthInMM) {
              return state =>
                Object.assign({}, state, {
                  rainDepth: depthInMM
                })
            },
            handlers: {
              start (state, depthInMM) {
                return Object.assign({}, state, {
                  isSubmerged: true
                })
              },
              end (state, depthInMM) {
                return Object.assign({}, state, {
                  isSubmerged: false
                })
              },
              error (state, depthInMM) {
                return Object.assign({}, state, {
                  isSubmerged: true,
                  drowned: true
                })
              }
            }
          }
        }
      })

      store = createStore(motive.reducer, applyMiddleware(thunk))

      expect(store.getState()).toMatchSnapshot()
      store.dispatch(motive.rainPrettyGood(10))
      expect(store.getState()).toMatchSnapshot()

      // Allow async actions into the event loop
      setTimeout(() => {
        expect(store.getState()).toMatchSnapshot()
        done()
      }, 0)
    })

    it('should have a bound motive in async motive', done => {
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async: {
          async motive (motive) {
            try {
              expect(motive).toBeDefined()
              // Bound action creators should be enumerable
              expect(Object.keys(motive)).toEqual(['motive'])
              // But dispatch/getState shouldn't
              expect(motive.dispatch).toBeDefined()
              expect(motive.getState).toBeDefined()
              done()
            } catch (err) {
              done.fail(err)
            }
            return state => state
          }
        }
      })

      const store = createStore(motive.reducer, applyMiddleware(thunk))

      expect(store.getState()).toMatchSnapshot()
      store.dispatch(motive.motive())
    })

    it('should be ok when async motive returns nothing', done => {
      let store = null
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async: {
          async motive (motive) {}
        }
      })

      store = createStore(motive.reducer, applyMiddleware(thunk))

      expect(store.getState()).toMatchSnapshot()
      store.dispatch(motive.motive())
      setTimeout(() => {
        if (store.getState().error) {
          done.fail(store.getState().error)
        } else {
          expect(store.getState().progressing).toBe(false)
          done()
        }
      }, 0)
    })

    it('should be ok if an expanded async motive only defines "effect" prop', done => {
      let store = null
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async: {
          motive: {
            async effect (motive) {}
          }
        }
      })

      store = createStore(motive.reducer, applyMiddleware(thunk))

      expect(store.getState()).toMatchSnapshot()
      store.dispatch(motive.motive())
      setTimeout(() => {
        if (store.getState().error) {
          done.fail(store.getState().error)
        } else {
          expect(store.getState().progressing).toBe(false)
          done()
        }
      }, 0)
    })

    it('should dispatch an bound motive action creator in an async motive', done => {
      let store = null
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async: {
          async motiveA (motive) {
            motive.motiveB()
          },
          async motiveB () {
            done()
          }
        }
      })

      store = createStore(motive.reducer, applyMiddleware(thunk))

      expect(store.getState()).toMatchSnapshot()
      store.dispatch(motive.motiveA())
      setTimeout(() => {
        if (store.getState().error) {
          done.fail(store.getState().error)
        } else {
          expect(store.getState().progressing).toBe(false)
          done()
        }
      }, 0)
    })
  })
})
