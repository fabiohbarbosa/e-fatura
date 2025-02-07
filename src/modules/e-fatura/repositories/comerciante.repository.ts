import { db } from '@config/database-bootstrap';
import { Injectable } from '@nestjs/common';
import { Comerciante } from '@e-fatura/models/comerciante.model';

@Injectable()
export class ComercianteRepository {
  getCollection(): Comerciante {
    return db.get('comerciantes');
  }

  writeCollection(orders: Comerciante) {
    db.set('comerciantes', orders);
  }

  findAll(): Comerciante {
    return this.getCollection();
  }

  insert(data: Comerciante) {
    this.writeCollection(data);
  }

  private getNIF(records: Comerciante) {
    return Object.keys(records)[0];
  }
}
