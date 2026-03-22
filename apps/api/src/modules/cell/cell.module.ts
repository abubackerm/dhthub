import { Module } from '@nestjs/common';
import { CellService } from './services/cell.service';
import { CellAdminController, CellPublicController } from './controllers/cell.controller';
import { CellRepository } from './repositories/cell.repository';
import { CellImageRepository } from './repositories/cell-image.repository';
import { DatabaseModule } from '../../core/database/database.module';
import { CategoryRepository } from '@modules/catalog/repositories/category.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [CellAdminController, CellPublicController],
  providers: [CellService, CellRepository, CellImageRepository, CategoryRepository],
  exports: [CellService, CellRepository, CellImageRepository],
})
export class CellModule {}
