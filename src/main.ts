import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { props } from '@config/props';

async function bootstrap() {
  const port = process.env.PORT ?? props.port;
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    cors: true,
  });
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(port);
  Logger.log(`Server running: http://localhost:${port}`);
}
bootstrap();
