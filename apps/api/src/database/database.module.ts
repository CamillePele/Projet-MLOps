import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DB_HOST', 'localhost'),
                port: configService.get('DB_PORT', 5432),
                username: configService.get('DB_USERNAME', 'postgres'),
                password: configService.get('DB_PASSWORD', 'postgres'),
                database: configService.get('DB_NAME', 'mlops_db'),
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                synchronize: configService.get('NODE_ENV') !== 'production',
                logging: false,
            }),
            inject: [ConfigService],
        }),
    ],
})
export class DatabaseModule { }
