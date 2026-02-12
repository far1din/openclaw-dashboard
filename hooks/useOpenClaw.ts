import { useEffect, useRef, useState, useCallback } from 'react';

const VPS_URL = process.env.NEXT_PUBLIC_VPS_URL;
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

type OpenClawMessage = {
  type: string;
  id?: string;
  method?: string;
  params?: any;
  ok?: boolean;
  payload?: any;
  error?: any;
  event?: string;
  data?: any;
  seq?: number;
  stateVersion?: number;
};

type RequestPromise = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

export function useOpenClaw() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const requestsRef = useRef<Map<string, RequestPromise>>(new Map());
  // We'll expose a way to subscribe to events or just return the last event?
  // User request says "Global event listener for agent events (incoming messages)".
  // Letting the component handle the event stream might be better, or exposing an event emitter.
  // For simplicity, let's expose specific states or a generic event callback subscription.
  // But to keep it simple as requested: "Global event listener...".
  // Maybe just return the socket or a way to add listeners.
  // Actually, the chat component needs to "Listen for `stream: 'text'` events".
  // Let's use a simple listener pattern.
  
  const listenersRef = useRef<Set<(msg: OpenClawMessage) => void>>(new Set());

  useEffect(() => {
    if (!VPS_URL || !ADMIN_TOKEN) {
      console.error("Missing VPS_URL or ADMIN_TOKEN");
      return;
    }

    const ws = new WebSocket(VPS_URL);
    socketRef.current = ws;

    const CONNECT_ID = 'c1';
    let connectSent = false;

    const sendConnect = () => {
      if (connectSent) return;
      connectSent = true;

      requestsRef.current.set(CONNECT_ID, {
        resolve: (payload: any) => {
          console.log('Handshake successful:', payload);
          setIsConnected(true);
        },
        reject: (err: any) => {
          console.error('Handshake failed:', JSON.stringify(err, null, 2));
          ws.close();
        },
      });

      const payload = {
        type: 'req',
        id: CONNECT_ID,
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'cli',
            displayName: 'web-admin',
            version: '0.1.0',
            platform: 'node',
            mode: 'cli',
          },
          auth: { token: ADMIN_TOKEN },
        },
      };

      console.log('Sending connect request...');
      ws.send(JSON.stringify(payload));
    };

    ws.onopen = () => {
      console.log('WebSocket open, sending connect...');
      // Send connect immediately (local/SSH-tunnel connections)
      sendConnect();
    };

    ws.onclose = () => {
      console.log('Disconnected from OpenClaw VPS');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data: OpenClawMessage = JSON.parse(event.data);
        console.log('WS <<', data.type, data.event || data.id || '');

        // Handle connect.challenge (remote connections send this before connect)
        if (data.type === 'event' && data.event === 'connect.challenge') {
          console.log('Received connect.challenge, sending connect...');
          sendConnect();
          return;
        }

        // Handle responses (ok/payload/error format)
        if (data.type === 'res' && data.id) {
          const promise = requestsRef.current.get(data.id);
          if (promise) {
            if (data.error || data.ok === false) {
              promise.reject(data.error || { message: 'Request failed' });
            } else {
              promise.resolve(data.payload);
            }
            requestsRef.current.delete(data.id);
          }
        }

        // Notify listeners of any message (events, results, requests, etc.)
        listenersRef.current.forEach(listener => listener(data));

      } catch (err) {
        console.error('Failed to parse message:', event.data);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const call = useCallback((method: string, params: any = {}) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        return reject(new Error('Not connected'));
      }

      const id = crypto.randomUUID();
      requestsRef.current.set(id, { resolve, reject });

      const payload = {
        type: 'req',
        id,
        method,
        params,
      };

      socketRef.current.send(JSON.stringify(payload));
    });
  }, []);

  const subscribe = useCallback((callback: (msg: OpenClawMessage) => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  return { isConnected, call, subscribe };
}
