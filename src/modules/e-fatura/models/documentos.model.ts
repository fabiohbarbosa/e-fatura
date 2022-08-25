import { Expose, plainToInstance, Type } from 'class-transformer';
import { Fatura } from '@e-fatura/models/fatura.model';

export class Documentos {
  @Expose()
  @Type(() => Fatura)
  linhas: Fatura[];

  static deserialize = <T>(data: T): Documentos =>
    plainToInstance(Documentos, data, {
      excludeExtraneousValues: true,
    });
}
