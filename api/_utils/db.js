import catalyst from 'zcatalyst-sdk-node';
import crypto from 'crypto';

let catalystApp = null;
try {
  catalystApp = catalyst.initialize();
} catch (e) {
  console.warn('[KAVACH DB ADAPTER] Zoho Catalyst SDK could not be initialized. External credentials may be required for local usage.');
}

class ZCQLQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.selectCols = '*';
    this.wheres = [];
    this.orderVal = '';
    this.limitVal = null;
    this.isSingle = false;
    this.isCount = false;
  }

  select(cols = '*', options = {}) {
    if (options.count) {
      this.isCount = true;
    }
    this.selectCols = cols;
    return this;
  }

  eq(col, val) {
    if (val === null || val === undefined) {
      this.wheres.push(`${col} IS NULL`);
    } else {
      const safeVal = String(val).replace(/'/g, "''");
      this.wheres.push(`${col} = '${safeVal}'`);
    }
    return this;
  }

  in(col, array) {
    if (!array || array.length === 0) {
      this.wheres.push('1 = 0');
      return this;
    }
    const safeVals = array.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ');
    this.wheres.push(`${col} IN (${safeVals})`);
    return this;
  }

  or(expr) {
    const parts = expr.split(',');
    const orConds = [];
    parts.forEach(part => {
      const match = part.match(/^([^.]+)\.(eq|ilike)\.(.+)$/);
      if (match) {
        const col = match[1];
        const op = match[2];
        const val = match[3];
        if (op === 'eq') {
          orConds.push(`${col} = '${val.replace(/'/g, "''")}'`);
        } else if (op === 'ilike') {
          const pattern = val.replace(/%/g, '%');
          orConds.push(`LOWER(${col}) LIKE LOWER('${pattern.replace(/'/g, "''")}')`);
        }
      }
    });
    if (orConds.length) {
      this.wheres.push(`(${orConds.join(' OR ')})`);
    }
    return this;
  }

  ilike(col, pattern) {
    const safePattern = pattern.replace(/%/g, '%').replace(/'/g, "''");
    this.wheres.push(`LOWER(${col}) LIKE LOWER('${safePattern}')`);
    return this;
  }

  gte(col, val) {
    const safeVal = String(val).replace(/'/g, "''");
    this.wheres.push(`${col} >= '${safeVal}'`);
    return this;
  }

  order(col, { ascending = true } = {}) {
    this.orderVal = `ORDER BY ${col} ${ascending ? 'ASC' : 'DESC'}`;
    return this;
  }

  limit(n) {
    this.limitVal = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  compileSelect() {
    let sql = '';
    if (this.isCount) {
      sql = `SELECT COUNT(ROWID) FROM ${this.tableName}`;
    } else {
      sql = `SELECT ${this.selectCols} FROM ${this.tableName}`;
    }
    if (this.wheres.length) {
      sql += ` WHERE ${this.wheres.join(' AND ')}`;
    }
    if (this.orderVal) {
      sql += ` ${this.orderVal}`;
    }
    if (this.limitVal) {
      sql += ` LIMIT ${this.limitVal}`;
    }
    return sql;
  }

  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }

  async execute() {
    try {
      if (!catalystApp) {
        throw new Error('Catalyst SDK not initialized');
      }
      const zcql = catalystApp.zcql();
      const sql = this.compileSelect();
      console.log(`[ZCQL EXECUTING]: ${sql}`);
      const rawResult = await zcql.executeZCQLQuery(sql);
      
      if (this.isCount) {
        const countRow = rawResult[0]?.[this.tableName];
        const count = countRow ? Object.values(countRow)[0] : 0;
        return { count: Number(count), data: null, error: null };
      }

      const data = rawResult.map(row => row[this.tableName]);
      
      if (this.isSingle) {
        if (data.length === 0) {
          return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        }
        return { data: data[0], error: null };
      }

      return { data, error: null };
    } catch (err) {
      console.error(`[ZCQL ERROR] on table ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }

  async insert(payload) {
    try {
      if (!catalystApp) throw new Error('Catalyst SDK not initialized');
      const datastore = catalystApp.table();
      const table = datastore.tableId(this.tableName);
      
      const items = Array.isArray(payload) ? payload : [payload];
      items.forEach(item => {
        if (!item.id) item.id = crypto.randomUUID();
        if (!item.created_at) item.created_at = new Date().toISOString();
      });

      const response = await table.addRow(items);
      const insertedData = Array.isArray(payload) ? response : response[0];
      
      return {
        data: insertedData,
        error: null,
        single: () => ({
          then: (resolve) => resolve({ data: Array.isArray(insertedData) ? insertedData[0] : insertedData, error: null })
        }),
        select: () => ({
          single: () => ({
            then: (resolve) => resolve({ data: Array.isArray(insertedData) ? insertedData[0] : insertedData, error: null })
          })
        })
      };
    } catch (err) {
      console.error(`[Catalyst Insert Error] on ${this.tableName}:`, err);
      return { data: null, error: err };
    }
  }

  async update(payload) {
    const self = this;
    return {
      eq: async (col, val) => {
        try {
          if (!catalystApp) throw new Error('Catalyst SDK not initialized');
          if (col !== 'id') {
            throw new Error('Catalyst update adapter only supports updating by id filter');
          }
          const sets = [];
          for (const [k, v] of Object.entries(payload)) {
            if (v === null || v === undefined) {
              sets.push(`${k} = NULL`);
            } else {
              const safeVal = String(v).replace(/'/g, "''");
              sets.push(`${k} = '${safeVal}'`);
            }
          }
          
          const zcql = catalystApp.zcql();
          const sql = `UPDATE ${self.tableName} SET ${sets.join(', ')} WHERE ${col} = '${String(val).replace(/'/g, "''")}'`;
          console.log(`[ZCQL EXECUTING]: ${sql}`);
          await zcql.executeZCQLQuery(sql);
          
          const { data } = await self.eq('id', val).single();
          return {
            data,
            error: null,
            select: () => ({
              single: () => ({
                then: (resolve) => resolve({ data, error: null })
              })
            })
          };
        } catch (err) {
          console.error(`[Catalyst Update Error] on ${self.tableName}:`, err);
          return { data: null, error: err };
        }
      }
    };
  }
}

const db = {
  from: (tableName) => new ZCQLQueryBuilder(tableName)
};

export default db;
