import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import { ApplicationModule } from './app.module';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule, { cors: true });

  const options = new DocumentBuilder()
    .setTitle('Generate-pdf')
    .setDescription('Nest.js express puppetter - generate pdf project')
    .setVersion('V0.0.1')
    .addTag('Products')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  
  SwaggerModule.setup('api', app, document);

  app.use(express.static('src/templates')); 
  app.use(helmet());
  app.use(compression());

  await app.listen(3000);
}
bootstrap();
