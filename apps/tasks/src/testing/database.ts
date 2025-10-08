import { randomUUID } from 'node:crypto';
import { DataSource, EntityTarget } from 'typeorm';
import { newDb } from 'pg-mem';

export async function createTestDataSource(
  entities: EntityTarget<unknown>[],
): Promise<DataSource> {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  const textType = db.public.getType('text');
  const uuidType = db.public.getType('uuid');

  db.public.registerFunction({
    name: 'version',
    returns: textType,
    implementation: () => 'PostgreSQL 13.3',
  });
  db.public.registerFunction({
    name: 'current_database',
    returns: textType,
    implementation: () => 'test',
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: uuidType,
    implementation: () => randomUUID(),
    impure: true,
  });

  const dataSourceFactory = db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities,
  });

  const dataSource = await dataSourceFactory.initialize();
  await dataSource.synchronize();

  return dataSource;
}
