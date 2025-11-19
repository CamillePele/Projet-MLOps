import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BatchDto } from '@/api/models';

interface UseBatchSocketReturn {
    batchData: BatchDto | null;
    isConnected: boolean;
    error: Error | null;
}

export function useBatchSocket(batchId: string | null): UseBatchSocketReturn {
    const [batchData, setBatchData] = useState<BatchDto | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (!batchId) {
            setBatchData(null);
            return;
        }

        // Create socket connection to /batch namespace
        const newSocket = io('http://localhost:3000/batch', {
            transports: ['websocket', 'polling'],
        });

        setSocket(newSocket);

        // Connection handlers
        newSocket.on('connect', () => {
            console.log('✅ Connected to batch WebSocket');
            setIsConnected(true);
            setError(null);

            // Subscribe to batch updates
            newSocket.emit('subscribe', batchId);
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Disconnected from batch WebSocket');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('WebSocket connection error:', err);
            setError(err);
            setIsConnected(false);
        });

        // Listen for batch updates
        newSocket.on('batch:update', (data: BatchDto) => {
            console.log('📊 Batch update received:', data);
            setBatchData(data);
        });

        // Listen for individual prediction completions
        newSocket.on('batch:prediction', (data: any) => {
            console.log('🎯 Prediction completed:', data);
            // Optionally trigger a refetch or update specific image
        });

        // Cleanup on unmount or batchId change
        return () => {
            if (newSocket) {
                newSocket.emit('unsubscribe', batchId);
                newSocket.disconnect();
            }
        };
    }, [batchId]);

    return { batchData, isConnected, error };
}
