import { Server, Socket } from 'socket.io';

import {
    OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer
} from '@nestjs/websockets';

import { BatchService } from './batch.service';

@WebSocketGateway({
    cors: {
        origin: '*', // Configure properly in production
    },
    namespace: '/batch',
})
export class BatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private subscribedClients: Map<string, Set<string>> = new Map(); // batchId -> Set<clientId>

    constructor(private readonly batchService: BatchService) { }

    handleConnection(client: Socket) {
        console.log(`🔌 Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`🔌 Client disconnected: ${client.id}`);

        // Remove client from all subscriptions
        this.subscribedClients.forEach((clients) => {
            clients.delete(client.id);
        });
    }

    /**
     * Subscribe to batch updates
     */
    @SubscribeMessage('subscribe')
    handleSubscribe(client: Socket, batchId: string): void {
        console.log(`📡 Client ${client.id} subscribing to batch ${batchId}`);

        if (!this.subscribedClients.has(batchId)) {
            this.subscribedClients.set(batchId, new Set());
        }

        this.subscribedClients.get(batchId)!.add(client.id);
        client.join(`batch:${batchId}`);

        // Send initial batch state
        this.batchService.getStatistics(batchId).then((stats) => {
            client.emit('batch:update', stats);
        });
    }

    /**
     * Unsubscribe from batch updates
     */
    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(client: Socket, batchId: string): void {
        console.log(`📡 Client ${client.id} unsubscribing from batch ${batchId}`);

        const clients = this.subscribedClients.get(batchId);
        if (clients) {
            clients.delete(client.id);
        }

        client.leave(`batch:${batchId}`);
    }

    /**
     * Emit batch update to all subscribed clients (optimized)
     */
    emitBatchUpdateDirect(batchId: string, stats: any): void {
        this.server.to(`batch:${batchId}`).emit('batch:update', stats);
    }

    /**
     * Emit batch update to all subscribed clients (with DB fetch)
     */
    async emitBatchUpdate(batchId: string): Promise<void> {
        const stats = await this.batchService.getStatistics(batchId);
        this.emitBatchUpdateDirect(batchId, stats);
    }

    /**
     * Emit prediction complete for a specific image in batch
     */
    emitPredictionComplete(batchId: string, imageId: string, success: boolean): void {
        this.server.to(`batch:${batchId}`).emit('batch:prediction', {
            batchId,
            imageId,
            success,
            timestamp: new Date(),
        });
    }
}
