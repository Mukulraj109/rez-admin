// Admin Socket Hook
// Provides real-time WebSocket connection for admin panel

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';
import { storageService } from '../services/storage';

interface UseAdminSocketReturn {
  connected: boolean;
  socket: Socket | null;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

export function useAdminSocket(): UseAdminSocketReturn {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let socket: Socket | null = null;

    const initSocket = async () => {
      try {
        const token = await storageService.getAuthToken();
        if (!token) {
          console.warn('[AdminSocket] No auth token available');
          return;
        }

        const socketUrl = API_CONFIG.SOCKET_URL || API_CONFIG.BASE_URL.replace('/api', '');

        socket = io(socketUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
          timeout: API_CONFIG.SOCKET_TIMEOUT || 5000,
        });

        socket.on('connect', () => {
          if (mountedRef.current) {
            setConnected(true);
            console.log('[AdminSocket] Connected, id:', socket.id);
          }
        });

        socket.on('disconnect', (reason) => {
          if (mountedRef.current) {
            setConnected(false);
            console.log('[AdminSocket] Disconnected, reason:', reason);
          }
        });

        socket.on('connect_error', (err) => {
          console.warn('[AdminSocket] Connection error:', err.message);
        });

        // Debug: log ALL incoming events
        socket.onAny((eventName: string, data: any) => {
          console.log('📨 [AdminSocket] Event received:', eventName, 'data:', JSON.stringify(data).slice(0, 200));
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('[AdminSocket] Init error:', error);
      }
    };

    initSocket();

    return () => {
      mountedRef.current = false;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.off(event, callback);
  }, []);

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return {
    connected,
    socket: socketRef.current,
    on,
    off,
    emit,
  };
}

export default useAdminSocket;
