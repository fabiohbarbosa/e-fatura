import { Expose, plainToInstance, Type } from 'class-transformer';
import { Linha } from '@e-fatura/models/linha.model';

export class Fatura {
  @Expose()
  @Type(() => Linha)
  linhas: Linha[];

  static deserialize = <T>(data: T): Fatura =>
    plainToInstance(Fatura, data, {
      excludeExtraneousValues: true,
    });
}
