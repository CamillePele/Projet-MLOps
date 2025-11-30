import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { IPredictionRequest } from '../common/interfaces';

@Injectable()
export class RabbitMQService implements OnModuleInit {
    constructor(
        @Inject('PREDICTION_SERVICE')
        private readonly predictionClient: ClientProxy,
    ) { }

    async onModuleInit() {
        await this.predictionClient.connect();
        console.log('✅ RabbitMQ client connected');
    }

    /**
     * Send images for prediction
     */
    async sendPredictionRequests(requests: IPredictionRequest[]): Promise<void> {
        for (const request of requests) {
            this.predictionClient.emit('image_prediction', request);
        }
    }
}
