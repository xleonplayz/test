import pg from 'pg';import {readFile} from 'node:fs/promises';import {seed,DomainError} from './domain.mjs';
const ca=process.env.PGSSLROOTCERT?await readFile(process.env.PGSSLROOTCERT,'utf8'):undefined;
export const pool=new pg.Pool({...(process.env.DATABASE_URL?{connectionString:process.env.DATABASE_URL}:{}),ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},connectionTimeoutMillis:3000});
await pool.query('CREATE TABLE IF NOT EXISTS sample_workspace(id integer PRIMARY KEY,revision integer NOT NULL,payload jsonb NOT NULL)');
await pool.query('INSERT INTO sample_workspace VALUES(1,0,$1) ON CONFLICT(id) DO NOTHING',[JSON.stringify(seed(1000))]);
const {rows}=await pool.query('SELECT payload FROM sample_workspace WHERE id=1');
export const storage={state:rows[0].payload,save:async state=>{const result=await pool.query('UPDATE sample_workspace SET revision=$1,payload=$2 WHERE id=1 AND revision=$3',[state.revision,JSON.stringify(state),state.revision-1]);if(result.rowCount!==1)throw new DomainError('Persistenzkonflikt',409);}};
