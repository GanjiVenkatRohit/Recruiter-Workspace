import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext.jsx';
import { getToken } from '../auth';
import config from '../config';
import './ConnectionStatus.css';

const EVENT_SYSTEM_URL = config.eventSystemUrl || 'http://localhost:4004';

export default function ConnectionStatus() {
  const wsClient = useWebSocket();
  const [status, setStatus] = useState(wsClient ? wsClient.connectionStatus : 'offline');
  const [eventsStatus, setEventsStatus] = useState('Events reconnecting');

  useEffect(() => {
    if (!wsClient) return;

    const unsubscribe = wsClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => unsubscribe();
  }, [wsClient]);

  useEffect(() => {
    let active = true;
    let controller = null;
    let retryTimer = null;
    let isConnecting = false;
    let retryDelay = 5000; // start at 5s, back off on repeated failures

    const scheduleRetry = () => {
      // Always clear any existing timer before scheduling a new one
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (!active) return;

      retryTimer = setTimeout(() => {
        retryTimer = null;
        connectEventsSSE();
      }, retryDelay);

      // Exponential backoff: 5s → 10s → 20s → cap at 30s
      retryDelay = Math.min(retryDelay * 2, 30000);
    };

    const connectEventsSSE = async () => {
      // Guard against concurrent connection attempts
      if (!active || isConnecting) return;
      isConnecting = true;

      const token = getToken();
      if (!token) {
        isConnecting = false;
        if (active) {
          setEventsStatus('Events reconnecting');
          scheduleRetry();
        }
        return;
      }

      controller = new AbortController();
      const url = `${EVENT_SYSTEM_URL}/events/stream`;

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!active) { isConnecting = false; return; }

        if (response.ok) {
          setEventsStatus('Events connected');
          retryDelay = 5000; // reset backoff on success
          const reader = response.body.getReader();
          // Stream is open — read until closed
          while (active) {
            const { done } = await reader.read();
            if (done) break;
          }
        } else {
          setEventsStatus('Events reconnecting');
        }
      } catch (err) {
        // AbortError is expected when we intentionally cancel
        if (active && err.name !== 'AbortError') {
          setEventsStatus('Events reconnecting');
        }
      }

      isConnecting = false;

      // Only schedule retry if we're still mounted and not intentionally stopped
      if (active) {
        scheduleRetry();
      }
    };

    connectEventsSSE();

    const handleAuthChanged = () => {
      // Cancel any pending retry and active connection, then reconnect fresh
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (controller) {
        controller.abort();
        controller = null;
      }
      isConnecting = false;
      retryDelay = 5000; // reset backoff
      connectEventsSSE();
    };
    window.addEventListener('auth-changed', handleAuthChanged);

    return () => {
      active = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (controller) controller.abort();
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, []);

  let label = 'Offline';
  let statusClass = 'offline';

  if (status === 'connected') {
    label = 'Live';
    statusClass = 'live';
  } else if (status === 'reconnecting' || status === 'connecting') {
    label = 'Reconnecting...';
    statusClass = 'reconnecting';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className={`connection-status-badge ${statusClass}`} id="connection-status">
        <span className="status-dot" />
        <span className="status-text">{label}</span>
      </div>
      <div className={`connection-status-badge ${eventsStatus === 'Events connected' ? 'live' : 'reconnecting'}`} id="events-status">
        <span className="status-dot" />
        <span className="status-text">{eventsStatus}</span>
      </div>
    </div>
  );
}

