# OpenClaw Gateway Event System Guide

This guide explains how the real-time event system works in your OpenClaw Dashboard, focusing on the specialized hooks and React patterns used.

## 1. How It Works (The "Big Picture")

The system is built on a **Publish-Subscribe (Pub/Sub)** pattern using React Context.

1.  **The Publisher ([GatewayProvider](file:///Users/far1din/Documents/code/openclaw-dashboard/openclaw-admin/lib/client/gateway-context.tsx#22-127))**:
    *   Maintains a single WebSocket connection.
    *   Listens for *all* incoming messages.
    *   When an event arrives, it loops through a list of subscribers and calls them.

2.  **The Subscriber ([useGatewayEvent](file:///Users/far1din/Documents/code/openclaw-dashboard/openclaw-admin/lib/client/gateway-context.tsx#136-146))**:
    *   Components use this hook to "subscribe" to updates.
    *   When the component mounts, it adds its function to the provider's list.
    *   When the component unmounts, it removes itself (cleanup).

## 2. Listening to Specific Events

The [useGatewayEvent](file:///Users/far1din/Documents/code/openclaw-dashboard/openclaw-admin/lib/client/gateway-context.tsx#136-146) hook receives **every** event. To listen to a *specific* event, you simply add an `if` check inside your handler.

### Example: Listening for "sessions.update"

```tsx
useGatewayEvent((evt) => {
    // 1. Check the event type
    if (evt.event === "sessions.update") {
        console.log("Session updated!", evt.payload);
        // Refresh your list or update state
        handleListSessions();
    }
});
```

### Example: Multiple Events

```tsx
useGatewayEvent((evt) => {
    switch (evt.event) {
        case "agent.online":
            toast.success(`Agent ${evt.payload.id} is online`);
            break;
        case "agent.offline":
            toast.warning(`Agent ${evt.payload.id} is offline`);
            break;
    }
});
```

## 3. Explaining the React Hooks

You noticed `useCallback` and `useEffect`. Here is why they are necessary.

### `useEffect` ( The "Side Effect" )

**Purpose**: Runs code *after* the component renders, or when dependencies change.
**Usage**: We use it to register (subscribe) our listener when the component appears, and unregister (unsubscribe) when it disappears.

```tsx
useEffect(() => {
    addListener(myHandler);      // Run on mount
    return () => {
        removeListener(myHandler); // Run on unmount (Cleanup)
    };
}, []);
```

### `useCallback` ( The "Memory Saver" )

**Purpose**: Memoizes (saves) a function definition so it doesn't get re-created on every single render.
**Why it matters here**:
If you don't use `useCallback`, your `handleListSessions` function is technically a *new, different function* every time the component re-renders.
*   This would cause `useEffect` (which depends on it) to re-run constantly.
*   It could cause infinite loops of subscribing/unsubscribing.

**Without `useCallback` (BAD):**
Render 1 -> creates `fn_A` -> useEffect sees `fn_A` -> Runs effect
Render 2 -> creates `fn_B` -> useEffect sees *change* because `fn_A != fn_B` -> Runs effect again!

**With `useCallback` (GOOD):**
Render 1 -> creates `fn_A`
Render 2 -> reuses `fn_A` -> useEffect sees no change -> Does nothing (Efficient!).

## 4. Best Practices

1.  **Always Filter**: Your handler receives *everything*. Always check `evt.event` first.
2.  **Stable Handlers**: If you pass a function to [useGatewayEvent](file:///Users/far1din/Documents/code/openclaw-dashboard/openclaw-admin/lib/client/gateway-context.tsx#136-146), try to define it inline (like the examples above) or wrap it in `useCallback` if it's defined outside.
3.  **Avoid Heavy Logic**: Event handlers run synchronously for every event. Keep them fast (e.g., just set state or trigger a fetch).
