# How to create a Store

## Description

The `RStore` package export a `createStore` function which can be used to create a store.

Only the `createStore` is not enough, we also need make the data have the ability to be responsive, so the `RStore` also export the reactive api like `ref`、`reactive`、`computed`... which provide by [`@vue/reactivity`](https://www.npmjs.com/package/@vue/reactivity),

The hook which return by `createStore` can be used in the `React` component just like a custom hook, and this hook also could expect a `selector` function which can be pick a part of state from the store.

## v0.1.9 Update

the state which in the `selector` function is a readonly state, so the only way to change state is in the `createStore` function.

## Code Example

```tsx twoslash
import * as React from "react";
import { createStore, reactive, ref } from "reactivity-store";

// here we create a `count` store
const _useCount = createStore(() => {
  // state
  const reactiveCount = reactive({ count: 0 });

  // define change state function
  const changeCount = (c: number) => {
    reactiveCount.count = c;
  };

  // the returned value which from the `createStore` should contain reactive filed, so the component can update when the state change
  return { reactiveCount, changeCount };
});

// return a reactive filed need we unwrap the field, so we can use the `ref` to make the unwrap automatic
const useCount = createStore(() => {
  // state
  const reactiveCount = ref(0);

  // define change state function
  const changeCount = (c: number) => {
    reactiveCount.value = c;
  };

  return { reactiveCount, changeCount };
});

const App = () => {
  // the ref field which return from `useSelector` will be unwrap ref automatic
  const { reactiveCount, changeCount } = useCount((state) => state);

  return (
    <div>
      <p>React Reactive Count</p>
      <p>{reactiveCount}</p>
      <button onClick={() => changeCount(reactiveCount + 1)}>Add</button>
    </div>
  );
};
```

::: details Click to show `zustand` code with same logic

```tsx twoslash
// ==== r-store ====

// 1. use createStore
import { createStore, ref } from "reactivity-store";

// step1 create store
const useCount_1 = createStore(() => {
  const reactiveCount = ref(0);

  const changeCount = (c: number) => {
    reactiveCount.value = c;
  };

  return { reactiveCount, changeCount };
});
// step2 use store
const { reactiveCount: c1, changeCount: _c1 } = useCount_1((s) => s);

// 2. use createState
import { createState } from "reactivity-store";

// step1 create store
const useCount_2 = createState(() => ({ reactiveCount: 0 }), { withActions: (s) => ({ changeCount: (c: number) => (s.reactiveCount = c) }) });
// step2 use store
const { reactiveCount: c2, changeCount: _c2 } = useCount_2((s) => s);

// ==== zustand ====
import { create } from "zustand";

// step1 create store
const useCount_3 = create<{ reactiveCount: number; changeCount: (c: number) => void }>((set, get) => ({
  reactiveCount: 0,
  changeCount: (c: number) => set({ reactiveCount: c }),
}));
// step2 use store
const { reactiveCount: c_3, changeCount: _c3 } = useCount_3((s) => s);
```

:::

<!-- ::: warning
I recommend provide a memo select to the hook which pick the state if we do not need all of the store state, like:

```tsx
const App = () => {
  const reactiveObj = useCount(useCallback((state) => state.reactiveCount, []));

  return (
    <div style={containerStyle}>
      <p>React Reactive Count</p>
      <p style={{ color: "red" }}>{reactiveObj.count}</p>
      <button onClick={() => reactiveObj.count++} style={buttonStyle}>
        Add
      </button>
    </div>
  );
};
```

::: -->

## Online Example

<script setup>
  import Create from '@theme/components/createStore.vue'
</script>

<Create />
