import { Module } from '@nestjs/common';
import { CryptoModule } from '../common/crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [PrismaModule, CryptoModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
