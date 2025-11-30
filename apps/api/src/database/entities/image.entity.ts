import {
    Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn,
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
    imageHash: string;

    @Column({ nullable: true })
    filename: string;

    @Column({ nullable: true })
    imageUrl: string;

    @ManyToMany(() => Batch, (batch) => batch.images)
    @JoinTable({ name: 'batch_images' })
    batches: Batch[];

    @OneToMany(() => Prediction, (processed) => processed.image)
    processeds: Prediction[];
}
