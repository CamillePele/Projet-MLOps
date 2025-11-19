import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Batch, Image, Prediction } from '../database/entities';
import { BatchModule } from '../modules/batch/batch.module';
import { FileService } from '../modules/upload/file.service';
import { RabbitMQController } from './rabbitmq.controller';
import { RabbitMQService } from './rabbitmq.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Image, Prediction, Batch]),
        forwardRef(() => BatchModule),
        ClientsModule.registerAsync([
            {
                name: 'PREDICTION_SERVICE',
                imports: [ConfigModule],
                useFactory: (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [
                            configService.get<string>(
                                'RABBITMQ_URL',
                                'amqp://guest:guest@localhost:5672',
                            ),
                        ],
                        queue: configService.get<string>(
                            'RABBITMQ_PREDICTION_QUEUE',
                            'prediction_queue',
                        ),
                        queueOptions: {
                            durable: true,
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
    ],
    controllers: [RabbitMQController],
    providers: [RabbitMQService, FileService],
    exports: [RabbitMQService],
})
export class RabbitMQModule { }
