import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CatalogAttributesModule } from './modules/catalog-attributes/catalog-attributes.module';
import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    CoreModule,
    AuthModule,
    CatalogModule,
    CatalogAttributesModule,
    PricingModule,
  ],
})
export class AppModule {}
