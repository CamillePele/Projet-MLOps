import {
    Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn
} from 'typeorm';

import { Image } from './image.entity';

export enum BatchStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('batches')
export class Batch {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({
        type: 'enum',
        enum: BatchStatus,
        default: BatchStatus.PENDING,
    })
    status: BatchStatus;

    @Column()
    totalImages: number;

    @Column({ default: 0 })
    processedImages: number;

    @Column({ default: 0 })
    successfulPredictions: number;

    @Column({ default: 0 })
    failedPredictions: number;

    @Column({ nullable: true })
    modelName: string;

    @OneToMany(() => Image, (image) => image.batch)
    images: Image[];

    // Computed property
    get progress(): number {
        if (this.totalImages === 0) return 0;
        return Math.round((this.processedImages / this.totalImages) * 100);
    }
}
