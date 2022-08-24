import {
  Controller,
  DefaultValuePipe,
  Param,
  ParseBoolPipe,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Atividade } from '@e-fatura/models/atividade.enum';
import { EFaturaService } from '@e-fatura/services/e-fatura.service';

const year = 2022;

@Controller('/e-fatura')
export class EFaturaController {
  constructor(private readonly service: EFaturaService) {}

  @Patch(':nif/:atividade')
  async submitByNIF(
    @Param('nif', new ParseIntPipe()) nif: number,
    @Param('atividade', new ParseEnumPipe(Atividade)) atividade: Atividade,
    @Query('somentePendentes', new DefaultValuePipe(true), ParseBoolPipe)
    onlyPendingEntries: boolean,
  ): Promise<void> {
    return this.service.submitByNIF(year, nif, atividade, onlyPendingEntries);
  }

  @Patch()
  async autoSubmit(): Promise<void> {
    return this.service.autoSubmit(year);
  }
}
