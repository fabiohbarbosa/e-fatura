import { props } from '@config/props';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSONdb = require('simple-json-db');
const env = process.env.NODE_ENV;
const filePath = env === 'test' ? 'db-test.json' : 'db.json';

const localDb: typeof JSONdb = new JSONdb(filePath, {
  jsonSpaces: 2,
});

const cleanUp = env === 'test' ? true : props.database.cleanUp;

// clean database up
if (cleanUp) {
  const key = 'comerciantes';

  if (localDb.has(key)) {
    localDb.delete(key);
  }
}

export const db = localDb;
