import * as AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';

import { RabbitMQService } from './rabbitmq/rabbitmq.service';

@Injectable()
export class AppService {
  constructor(private readonly rabbitMQService: RabbitMQService) { }

  getHello(): string {
    return 'Hello World!';
  }
}
