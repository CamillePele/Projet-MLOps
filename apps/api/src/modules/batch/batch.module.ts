import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Batch, Image } from '../../database/entities';
import { BatchController } from './batch.controller';
import { BatchGateway } from './batch.gateway';
import { BatchService } from './batch.service';

@Module({
    imports: [TypeOrmModule.forFeature([Batch, Image])],
    controllers: [BatchController],
    providers: [BatchService, BatchGateway],
    exports: [BatchService, BatchGateway],
})
export class BatchModule { }
