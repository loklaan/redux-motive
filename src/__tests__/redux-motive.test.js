import ReduxMotive from '../';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

describe('ReduxMotive', () => {
  describe('constructor', () => {
    it('should construct empty intent', () => {
      expect(() => {
        const motive = new ReduxMotive({
          config: { initialState: {} }
        });
        expect(motive).toMatchSnapshot();
        expect(motive.reducer).toMatchSnapshot();
      }).not.toThrow()
    });

    it('should not construct w/ bad config', () => {
      expect(() => {
        const intent = new ReduxMotive({});
      }).toThrow()
    });
  });

  describe('intents', () => {
    it('should work with single sync intent', () => {
      const motive = new ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        rain: (state, depthInMM) =>
          Object.assign({}, state, {
            rainDepth: depthInMM
          })
      });

      const store = createStore(
        motive.reducer,
        applyMiddleware(thunk)
      );

      store.dispatch(motive.rain(10));
      expect(store.getState()).toMatchSnapshot();
    });

    it('should work with single async intent', (done) => {
      let store = null;
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async rainSuperBad (motive, depthInMM) {
          return state => Object.assign({}, state, {
            rainDepth: depthInMM
          });
        }
      });

      store = createStore(
        motive.reducer,
        applyMiddleware(thunk)
      );

      expect(store.getState()).toMatchSnapshot();
      store.dispatch(motive.rainSuperBad(10));
      expect(store.getState()).toMatchSnapshot();

      // Allow async actions into the event loop
      setTimeout(() => {
        expect(store.getState()).toMatchSnapshot();
        done();
      }, 0)
    });

    it('should work with single async intent that throws', (done) => {
      let store = null;
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async rainPrettyBad (motive, depthInMM) {
          throw new Error('foo');
        }
      });

      store = createStore(
        motive.reducer,
        applyMiddleware(thunk)
      );

      expect(store.getState()).toMatchSnapshot();
      store.dispatch(motive.rainPrettyBad(10));
      expect(store.getState()).toMatchSnapshot();

      // Allow async actions into the event loop
      setTimeout(() => {
        expect(store.getState()).toMatchSnapshot();
        done();
      }, 0)
    });

    it('should work with single async intent with configured handlers', (done) => {
      let store = null;
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        rainPrettyGood: {
          intent: async function rainPrettyGood (motive, depthInMM) {
            return (state) => Object.assign({}, state, {
              rainDepth: depthInMM
            });
          },
          handlers: {
            start (state, depthInMM) {
              return Object.assign({}, state, {
                isSubmerged: true
              });
            },
            end (state, depthInMM) {
              return Object.assign({}, state, {
                isSubmerged: false
              });
            },
            error (state, depthInMM) {
              return Object.assign({}, state, {
                isSubmerged: true,
                drowned: true
              });
            }
          }
        }
      });

      store = createStore(
        motive.reducer,
        applyMiddleware(thunk)
      );

      expect(store.getState()).toMatchSnapshot();
      store.dispatch(motive.rainPrettyGood(10));
      expect(store.getState()).toMatchSnapshot();

      // Allow async actions into the event loop
      setTimeout(() => {
        expect(store.getState()).toMatchSnapshot();
        done();
      }, 0)
    });

    it('should have a bound motive in async intent', (done) => {
      let store = null;
      const motive = ReduxMotive({
        config: {
          prefix: 'test',
          initialState: {}
        },

        async intent (motive) {
          try {
            expect(motive).toBeDefined();
            // Bound action creators should be enumerable
            expect(Object.keys(motive)).toEqual(['intent']);
            // But dispatch/getState shouldn't
            expect(motive.dispatch).toBeDefined();
            expect(motive.getState).toBeDefined();
            done();
          } catch (err) {
            done.fail(err);
          }
          return state => state;
        }
      });

      store = createStore(
        motive.reducer,
        applyMiddleware(thunk)
      );

      expect(store.getState()).toMatchSnapshot();
      store.dispatch(motive.intent());
    });
  });
});
