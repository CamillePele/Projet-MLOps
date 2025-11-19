import { Module } from '@nestjs/common';

import { RabbitMQModule } from '../../rabbitmq/rabbitmq.module';
import { BatchModule } from '../batch/batch.module';
import { FileService } from './file.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
    imports: [RabbitMQModule, BatchModule],
    controllers: [UploadController],
    providers: [UploadService, FileService],
    exports: [FileService],
})
export class UploadModule { }
