import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Prediction } from '../../database/entities';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';

@Module({
    imports: [TypeOrmModule.forFeature([Prediction])],
    controllers: [PredictionsController],
    providers: [PredictionsService],
})
export class PredictionsModule { }
