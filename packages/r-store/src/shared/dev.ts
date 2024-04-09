/* eslint-disable @typescript-eslint/ban-types */
import { isPromise } from "@vue/shared";

import { Controller } from "./controller";
import { InternalNameSpace, isServer } from "./env";
import { createLifeCycle } from "./lifeCycle";
import { traverse } from "./tools";

const namespaceMap: Record<string, unknown> = {};

/**
 * @internal
 */
export const setNamespaceMap = (key: string, value: unknown) => {
  namespaceMap[key] = value;
};

/**
 * @internal
 */
export const delNamespace = (key: string) => {
  delete namespaceMap[key];
};

/**
 * @internal
 */
export const checkHasKey = (key: string) => {
  return key in namespaceMap;
};

if (__DEV__ && !isServer) {
  try {
    globalThis["@reactivity-store"] = globalThis["@reactivity-store"] || new WeakMap();
  } catch {
    void 0;
  }
}

/**
 * @internal
 */
export const setDevController = (controller: Controller, state: any) => {
  if (__DEV__ && !isServer) {
    if (!globalThis["@reactivity-store"]) return;
    try {
      const set = (globalThis["@reactivity-store"]?.get?.(state) || new Set()) as Set<Controller>;

      set.add(controller);

      globalThis["@reactivity-store"]?.set?.(state, set);
    } catch {
      void 0;
    }
  }
};

/**
 * @internal
 */
export const delDevController = (controller: Controller, state: any) => {
  if (__DEV__ && !isServer) {
    if (!globalThis["@reactivity-store"]) return;
    try {
      const set = globalThis["@reactivity-store"]?.get?.(state) as Set<Controller>;

      set?.delete?.(controller);

      if (set.size === 0) {
        globalThis["@reactivity-store"]?.delete?.(state);
      }
    } catch {
      void 0;
    }
  }
};

// cache state which has connect to devtool
const devToolMap: Record<string, any> = {};

const devController: Record<string, Controller> = {};

const globalName = "__reactivity-store-redux-devtools__";

type Action = { type: string; $payload?: any; getUpdatedState: () => any };

let globalDevTools = null;

/**
 * @internal
 */
export const getDevToolInstance = () => globalDevTools || window.__REDUX_DEVTOOLS_EXTENSION__.connect({ name: globalName });

/**
 * @internal
 */
export const connectDevTool = (name: string, actions: Record<string, Function>, state: any, reactiveState: any) => {
  if (window && window.__REDUX_DEVTOOLS_EXTENSION__ && typeof window.__REDUX_DEVTOOLS_EXTENSION__.connect === "function") {
    const devTools = globalDevTools || window.__REDUX_DEVTOOLS_EXTENSION__.connect({ name: globalName });

    globalDevTools = devTools;

    const existState = devToolMap[name];

    const existController = devController[name];

    if (existController) {
      existController.stop();

      delDevController(existController, existState);
    }

    devToolMap[name] = state;

    const lifeCycle = createLifeCycle();

    lifeCycle.syncUpdateComponent = true;

    let updateInAction = false;

    const onUpdateWithoutAction = (instance?: Controller) => {
      instance?.run();
      if (updateInAction) return;
      sendToDevTools({
        type: `subscribeAction-${name}`,
        getUpdatedState: () => ({ ...devToolMap, [name]: JSON.parse(JSON.stringify(state)) }),
      });
    };

    // create a subscribe controller to listen to the state change, because some state change may not trigger by the `action`
    const controller = new Controller(() => traverse(reactiveState), lifeCycle, new Set(), InternalNameSpace.$$__redux_dev_tool__$$, onUpdateWithoutAction);

    devController[name] = controller;

    controller.run();

    setDevController(controller, state);

    const obj = { ...devToolMap };

    devTools.init(obj);

    return Object.keys(actions).reduce((p, c) => {
      p[c] = (...args) => {
        updateInAction = true;

        const len = actions[c].length || 0;

        const re = actions[c](...args);

        const action = actions[c];

        if (isPromise(re)) {
          re.finally(() => {
            sendToDevTools({
              type: `asyncAction-${name}/${action.name || "anonymous"}`,
              $payload: args.slice(0, len),
              getUpdatedState: () => ({ ...devToolMap, [name]: JSON.parse(JSON.stringify(state)) }),
            });
            updateInAction = false;
          });
        } else {
          sendToDevTools({
            type: `syncAction-${name}/${action.name || "anonymous"}`,
            $payload: args.slice(0, len),
            getUpdatedState: () => ({ ...devToolMap, [name]: JSON.parse(JSON.stringify(state)) }),
          });
          updateInAction = false;
        }
        return re;
      };
      return p;
    }, {});
  } else {
    return actions;
  }
};

/**
 * @internal
 */
export const sendToDevTools = (action: Action) => {
  const { getUpdatedState, ...rest } = action;
  try {
    const state = getUpdatedState();
    getDevToolInstance().send(rest, state);
  } catch (e) {
    console.log(e);
  }
};
