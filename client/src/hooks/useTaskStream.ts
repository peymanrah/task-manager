import { useState, useEffect, useCallback, useRef } from 'react';
import { Task } from '../types';

const WS_URL = `ws://${window.location.hostname}:4567`;
const API_URL = '/api';

export function useTaskStream() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'FULL_STATE') {
          setTasks(data.tasks);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Auto-reconnect after 2s
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Fallback: fetch via REST if WS not connected
  useEffect(() => {
    if (!connected) {
      fetch(`${API_URL}/tasks`)
        .then((r) => r.json())
        .then(setTasks)
        .catch(() => {});
    }
  }, [connected]);

  const deleteTask = useCallback(async (id: string) => {
    await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
  }, []);

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    await fetch(`${API_URL}/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' });
  }, []);

  return { tasks, connected, deleteTask, deleteSubtask };
}
