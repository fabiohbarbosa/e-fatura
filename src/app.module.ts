import { Module } from '@nestjs/common';
import { EFaturaModule } from '@e-fatura/e-fatura.module';

@Module({
  imports: [EFaturaModule],
})
export class AppModule {}
