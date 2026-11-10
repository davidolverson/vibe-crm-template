export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }
  const url = (process.env.DATABASE_URL || '').replace(/[&?]channel_binding=require/g, '');
  const sql = neon(url);
  const tables = await sql`select table_name from information_schema.tables where table_schema='public' order by table_name`;
  const tableNames = tables.map(t => t.table_name);
  // Find actual table names (case-insensitive)
  const findTable = (names: string[]) => tableNames.find(t => names.map(n=>n.toLowerCase()).includes(t.toLowerCase()));
  const userTable = findTable(['user', 'users', 'User']);
  const orgTable = findTable(['organization', 'organizations', 'Organization']);
  const contactTable = findTable(['Contact', 'contact', 'contacts']);

  const stats: Record<string, number> = {};
  if (userTable) {
    const rows = await sql.query(`select count(*)::int as c from "${userTable}"`);
    stats.users = rows[0].c;
  }
  if (orgTable) {
    const rows = await sql.query(`select count(*)::int as c from "${orgTable}"`);
    stats.orgs = rows[0].c;
  }
  if (contactTable) {
    const rows = await sql.query(`select count(*)::int as c from "${contactTable}"`);
    stats.contacts = rows[0].c;
  }
  // column names vary (snake vs camel); try both
  let recent: unknown[] = [];
  if (userTable) {
    try {
      recent = await sql.query(`select email, "created_at" as created from "${userTable}" order by "created_at" desc limit 10`);
    } catch {
      try {
        recent = await sql.query(`select email, "createdAt" as created from "${userTable}" order by "createdAt" desc limit 10`);
      } catch {
        recent = [{ note: 'no standard timestamp column found' }];
      }
    }
  }
  const host = new URL('postgresql://' + (process.env.DATABASE_URL || '').split('@')[1]).hostname;
  return NextResponse.json({ host, tables: tableNames, ...stats, recent });
}
