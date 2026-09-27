// ── OpenTelemetry must be the very first import ────────────────────────────
import './tracing';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Behind a proxy (such as Render) the real visitor IP arrives in the X-Forwarded-For header.
  // Rate limiting needs it, otherwise every visitor looks like the proxy's address. Set
  // TRUST_PROXY_HOPS to the number of proxies in front of the app. 0 (default) trusts none.
  // Too low: visitors share one limit. Too high: visitors can fake their IP to dodge the limit.
  const proxyHops = parseInt(process.env.TRUST_PROXY_HOPS ?? '0', 10);
  if (proxyHops > 0) app.getHttpAdapter().getInstance().set('trust proxy', proxyHops);

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Health endpoint outside the /api/v1 prefix
  const httpAdapter = app.getHttpAdapter();
  // `ip` and `forwardedFor` are for checking TRUST_PROXY_HOPS after deploying. Open this from two different
  // networks (for example a phone on mobile data and a computer): `ip` should be that caller's own public
  // address each time. The number of comma-separated entries in `forwardedFor` is the number of proxies in
  // front of the app, which is the value to use. Both fields only show the caller's own connection details
  // and can be removed once the setting is confirmed.
  httpAdapter.get(
    '/health',
    (
      req: { ip?: string; headers: Record<string, string | string[] | undefined> },
      res: { json: (data: unknown) => void },
    ) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ip: req.ip,
        forwardedFor: req.headers['x-forwarded-for'] ?? null,
      });
    },
  );

  const port = parseInt(process.env.PORT ?? '5000', 10);
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
}

bootstrap();
