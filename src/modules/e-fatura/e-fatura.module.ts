import { Module } from '@nestjs/common';
import { EFaturaController } from './controllers/e-fatura.controller';
import { HttpModule } from '@nestjs/axios';
import { EFaturaService } from '@e-fatura/services/e-fatura.service';

@Module({
  imports: [HttpModule],
  controllers: [EFaturaController],
  providers: [EFaturaService],
})
export class EFaturaModule {}
