import { Module } from '@nestjs/common';
import { EFaturaController } from './controllers/e-fatura.controller';
import { HttpModule } from '@nestjs/axios';
import { EFaturaService } from '@e-fatura/services/e-fatura.service';
import { FaturaRepository } from '@e-fatura/services/fatura.repository';
import { StatsController } from '@e-fatura/controllers/stats.controller';

@Module({
  imports: [HttpModule],
  controllers: [EFaturaController, StatsController],
  providers: [EFaturaService, FaturaRepository],
})
export class EFaturaModule {}
