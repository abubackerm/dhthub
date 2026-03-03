import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseProvider } from './database.provider';
import { PrismaTransactionalExecutor } from './prisma-transactional.executor';

@Global()
@Module({
  providers: [
    PrismaService,
    DatabaseProvider,
    PrismaTransactionalExecutor,
    {
      provide: 'TransactionalExecutor',
      useExisting: PrismaTransactionalExecutor,
    },
  ],
  exports: [DatabaseProvider, 'TransactionalExecutor'],
})
export class DatabaseModule {}
