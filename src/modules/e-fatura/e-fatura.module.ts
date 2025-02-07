import { Module } from '@nestjs/common';
import { EFaturaController } from './controllers/e-fatura.controller';
import { HttpModule } from '@nestjs/axios';
import { EFaturaService } from '@e-fatura/services/e-fatura.service';
import { FaturaRepository } from '@e-fatura/repositories/fatura.repository';
import { StatsController } from '@e-fatura/controllers/stats.controller';
import { ComercianteRepository } from '@e-fatura/repositories/comerciante.repository';

@Module({
  imports: [HttpModule],
  controllers: [EFaturaController, StatsController],
  providers: [EFaturaService, FaturaRepository, ComercianteRepository],
})
export class EFaturaModule {}
