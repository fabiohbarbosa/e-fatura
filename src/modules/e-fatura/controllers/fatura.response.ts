import { Expose, plainToInstance, Type } from 'class-transformer';
import { Linha } from '@e-fatura/controllers/linha';

export class FaturaResponse {
  @Expose()
  @Type(() => Linha)
  linhas: Linha[];

  static deserialize = <T>(data: T): FaturaResponse =>
    plainToInstance(FaturaResponse, data, {
      excludeExtraneousValues: true,
    });
}
