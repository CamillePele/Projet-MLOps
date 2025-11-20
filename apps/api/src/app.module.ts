import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { BatchModule } from './modules/batch/batch.module';
import { ImagesModule } from './modules/images/images.module';
import { ModelsModule } from './modules/models/models.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { UploadModule } from './modules/upload/upload.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    RabbitMQModule,
    BatchModule,
    UploadModule,
    ImagesModule,
    PredictionsModule,
    ModelsModule,
  ],
})
export class AppModule { }
