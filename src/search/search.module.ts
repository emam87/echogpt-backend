import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsageModule } from '../usage/usage.module';
import { MockSearchProvider } from './providers/mock-search.provider';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [PrismaModule, UsageModule],
  controllers: [SearchController],
  providers: [SearchService, MockSearchProvider],
  exports: [SearchService, MockSearchProvider],
})
export class SearchModule {}
