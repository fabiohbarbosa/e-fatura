import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { EFaturaService } from '@e-fatura/services/e-fatura.service';
import { Stats } from '@e-fatura/models/stats.model';

@Controller('/stats')
export class StatsController {
  constructor(private readonly service: EFaturaService) {}

  @Get(':year')
  async submitByNIF(
    @Param('year', new ParseIntPipe()) year: number,
    @Query('nif', new DefaultValuePipe(0), ParseIntPipe)
    nif?: number,
  ): Promise<Stats[]> {
    return this.service.getByYear(year, nif ? nif : undefined);
  }
}
