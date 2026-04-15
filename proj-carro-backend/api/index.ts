import type { Request, Response } from 'express';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';

let cachedExpressApp: ReturnType<typeof express> | null = null;

async function getNestExpressApp() {
  if (cachedExpressApp) {
    return cachedExpressApp;
  }

  const expressApp = express();
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  nestApp.enableCors();
  await nestApp.init();

  cachedExpressApp = expressApp;
  return expressApp;
}

export default async function handler(req: Request, res: Response) {
  const app = await getNestExpressApp();
  return app(req, res);
}