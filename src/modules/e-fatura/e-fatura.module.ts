import { Module } from '@nestjs/common';
import { EFaturaController } from './controllers/e-fatura.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [EFaturaController],
})
export class EFaturaModule {}
