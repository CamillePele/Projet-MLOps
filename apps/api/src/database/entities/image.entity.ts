import {
    Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { Batch } from './batch.entity';
import { Prediction } from './prediction.entity';

@Entity('images')
export class Image {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column()
    isTraining: boolean;

    @Column({ nullable: true })
    filename: string;

    @Column({ nullable: true })
    imageUrl: string;

    @ManyToOne(() => Batch, (batch) => batch.images, { nullable: true })
    @JoinColumn({ name: 'batchId' })
    batch: Batch;

    @OneToMany(() => Prediction, (processed) => processed.image)
    processeds: Prediction[];
}
