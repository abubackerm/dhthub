import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CatalogAttributesModule } from './modules/catalog-attributes/catalog-attributes.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { SearchModule } from './modules/search/search.module';
import { ImportModule } from './modules/import/import.module';
import { EnquiryModule } from './modules/enquiry/enquiry.module';
import { CellModule } from './modules/cell/cell.module';
import { NotificationModule } from './modules/notification/notification.module';

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
    InventoryModule,
    CartModule,
    SearchModule,
    ImportModule,
    EnquiryModule,
    CellModule,
    NotificationModule,
  ],
})
export class AppModule {}
