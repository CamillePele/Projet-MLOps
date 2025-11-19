import {
    Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { IPredictionResult } from '../../common/interfaces';
import { Image } from './image.entity';

@Entity('predictions')
export class Prediction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column()
    model: string;

    @ManyToOne(() => Image, (image) => image.processeds)
    @JoinColumn({ name: 'imageId' })
    image: Image;

    @Column('jsonb')
    result: IPredictionResult;
}

// Export for backward compatibility
export type PredictionResult = IPredictionResult;