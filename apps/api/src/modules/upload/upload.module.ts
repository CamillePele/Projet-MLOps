import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { Batch, Image, Prediction } from '../../database/entities';
import { RabbitMQModule } from '../../rabbitmq/rabbitmq.module';
import { BatchModule } from '../batch/batch.module';
import { FileService } from './file.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
    imports: [
        RabbitMQModule,
        BatchModule,
        TypeOrmModule.forFeature([Image, Batch, Prediction]),
    ],
    controllers: [UploadController],
    providers: [UploadService, FileService],
    exports: [FileService],
})
export class UploadModule { }
