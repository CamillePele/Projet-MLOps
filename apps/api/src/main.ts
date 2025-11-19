import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Configure Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('MLOps API')
    .setDescription('API for image prediction and model management')
    .setVersion('1.0')
    .addTag('images', 'Image upload and management')
    .addTag('predictions', 'Prediction results')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Expose OpenAPI JSON
  app.use('/api-json', (req, res) => {
    res.json(document);
  });

  // Enable CORS for frontend
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
  });

  // Connect to RabbitMQ for listening to prediction results
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
      queue: configService.get<string>('RABBITMQ_RESULT_QUEUE', 'prediction_result_queue'),
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
  console.log(`🐰 RabbitMQ connected and listening for prediction results`);
}

bootstrap();
