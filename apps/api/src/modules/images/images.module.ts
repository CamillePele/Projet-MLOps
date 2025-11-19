import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Image } from '../../database/entities';
import { UploadModule } from '../upload/upload.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
    imports: [TypeOrmModule.forFeature([Image]), UploadModule],
    controllers: [ImagesController],
    providers: [ImagesService],
})
export class ImagesModule { }
