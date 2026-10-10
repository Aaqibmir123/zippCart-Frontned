# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Project conventions

- Keep every authored source file below 500 lines. Split by responsibility before reaching the limit; do not compress code to satisfy it.
- Group related UI in feature folders. Separate substantial query/mutation orchestration and styles from screen rendering. Use small index exports at feature boundaries when helpful.
- Use TanStack Query for server state, with visible loading, pending, error and retry states.
- Keep cart addresses compact below the products; show full details and billing preferences in address management.
- Show one estimated total with its checkout button directly underneath in the same summary. Avoid duplicate checkout bars and unnecessary explanatory copy.
- Display feedback toasts at the top, below the device safe area.
