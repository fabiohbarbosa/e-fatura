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
import { props } from '@config/props';

const years = props.years;

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
    const process = years.map((year) =>
      this.service.submitByNIF(year, nif, atividade, onlyPendingEntries),
    );
    await Promise.all(process);
  }

  @Patch()
  async autoSubmit(): Promise<void> {
    const process = years.map((year) => this.service.autoSubmit(year));
    await Promise.all(process);
  }
}
