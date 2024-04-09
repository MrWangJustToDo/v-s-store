import { reactive, toRaw } from "@vue/reactivity";
import { isPromise } from "@vue/shared";

import { connectDevTool } from "../shared/dev";
import { isServer } from "../shared/env";
import { createHook } from "../shared/hook";
import { createLifeCycle } from "../shared/lifeCycle";
import { checkHasFunction, checkHasReactive, checkHasSameField } from "../shared/tools";

import { withActions, withDeepSelector, withNamespace, withPersist } from "./middleware";
import { getFinalActions, getFinalDeepSelector, getFinalNamespace, getFinalState } from "./tools";

import type { Setup } from "./createState";
import type { MaybeStateWithMiddleware, WithActionsProps, UnWrapMiddleware } from "./tools";

/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function internalCreateState<T extends Record<string, unknown>, P extends Record<string, Function>, L extends Record<string, Function>>(
  setup: Setup<MaybeStateWithMiddleware<T, L>>,
  name: string,
  option?: {
    withPersist?: string;
    withActions?: WithActionsProps<UnWrapMiddleware<T>, P>["generateActions"];
    withNamespace?: string;
    withDeepSelector?: boolean;
  }
) {
  let creator: any = setup;

  if (option?.withPersist) {
    creator = withPersist(creator, { key: option.withPersist });
  }

  if (option?.withActions) {
    creator = withActions(creator, { generateActions: option.withActions });
  }

  if (option?.withNamespace) {
    creator = withNamespace(creator, { namespace: option.withNamespace, reduxDevTool: true });
  }

  if (typeof option?.withDeepSelector !== "undefined") {
    creator = withDeepSelector(creator, { deepSelector: option.withDeepSelector });
  }

  const lifeCycle = createLifeCycle();

  const state = creator();

  // handle withActions middleware;
  const initialState = getFinalState(state) as T;

  if (__DEV__ && isPromise(initialState)) {
    console.error(
      `[reactivity-store] '${name}' expect receive a plain object but got a promise %o, this is a unexpected usage. should not return a promise in this 'setup' function`,
      initialState
    );
  }

  let actions = getFinalActions(state);

  const namespaceOptions = getFinalNamespace(state);

  const deepSelectorOptions = getFinalDeepSelector(state);

  const rawState = toRaw(initialState);

  const reduxDevTool = __DEV__ && namespaceOptions.reduxDevTool && !isServer;

  if (__DEV__ && checkHasReactive(rawState)) {
    console.error(
      `[reactivity-store] '${name}' expect receive a plain object but got a reactive object/field %o, this is a unexpected usage. should not use 'reactiveApi' in this 'setup' function`,
      rawState
    );
  }

  if (__DEV__ && checkHasFunction(rawState)) {
    console.error(
      `[reactivity-store] '${name}' has a function field in state %o, this is a unexpected usage. state should be only a plain object with data field`,
      rawState
    );
  }

  if (__DEV__) {
    const sameField = checkHasSameField(rawState, actions);
    sameField.forEach((key) =>
      console.warn(`[reactivity-store] duplicate key: [${key}] in 'state' and 'actions' from createState, this is a unexpected usage`)
    );
  }

  const reactiveState = reactive(initialState);

  const deepSelector = deepSelectorOptions?.deepSelector ?? true;

  if (reduxDevTool) {
    actions = connectDevTool(namespaceOptions.namespace, actions, rawState, reactiveState) as P;
  }

  const useSelector = createHook<T, P & L>(reactiveState, rawState, lifeCycle, deepSelector, namespaceOptions.namespace, actions as P & L);

  return useSelector;
}
