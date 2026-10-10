exports.hookHarness = () => {
  const slots = []; let cursor = 0; let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    memo: (component) => component,
    useState(initial) {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[slot].value, (value) => { slots[slot].value = typeof value === 'function' ? value(slots[slot].value) : value; }];
    },
    useRef(initial) { const slot = cursor++; return slots[slot] ??= { current: initial }; },
    useContext(context) { return context.value; },
    useCallback(fn, deps) {
      const slot = cursor++;
      if (!same(slots[slot]?.deps, deps)) slots[slot] = { deps, fn };
      return slots[slot].fn;
    },
    useEffect(fn, deps) {
      const slot = cursor++;
      if (!same(slots[slot]?.deps, deps)) {
        const previous = slots[slot]; slots[slot] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[slot].cleanup = fn(); });
      }
    },
    useSyncExternalStore(subscribe, snapshot) {
      react.useEffect(() => subscribe(() => {}), [subscribe]);
      return snapshot();
    },
  };
  return { react, render(fn) { cursor = 0; const value = fn(); const pending = effects; effects = []; pending.forEach((run) => run()); return value; },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); } };
};

exports.fakeClock = (t) => {
  let now = 100000; let sequence = 0; const timers = new Map();
  t.mock.method(Date, 'now', () => now);
  t.mock.method(global, 'setTimeout', (fn, delay) => {
    const id = ++sequence; timers.set(id, { at: now + delay, fn }); return id;
  });
  t.mock.method(global, 'clearTimeout', (id) => timers.delete(id));
  return { timers, now: () => now, advance(ms) {
    const target = now + ms;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, timer] = next; timers.delete(id); now = timer.at; timer.fn();
    }
    now = target;
  } };
};
