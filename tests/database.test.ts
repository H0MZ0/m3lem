import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Card, Workspace, Detail } from "../src/lib/model";
test("migration, publication and permission contract on disposable Postgres", async (t) => {
  const db = new PGlite();
  const sql = (p: string) => readFile(p, "utf8");
  const uid = (n: number) => `20000000-0000-4000-8000-00000000000${n}`,
    id = "10000000-0000-4000-8000-000000000001",
    asset = "30000000-0000-4000-8000-000000000001",
    token = "ab".repeat(32);
  async function role(r: string, n = 0) {
    await db.exec(
      `reset role;set role ${r};select set_config('request.jwt.claim.sub','${n ? uid(n) : ""}',false)`,
    );
  }
  async function one<T>(s: string, args: unknown[] = []) {
    return (await db.query<{ v: T }>(`select ${s} as v`, args)).rows[0].v;
  }
  const detail = () =>
      one<Detail | null>("public.artisan_detail($1,true)", [id]),
    work = () => one<Workspace>("public.my_workspace()"),
    find = (area = "", trade = "plomberie", today = false) =>
      one<Card[]>("public.find_artisans('casablanca',$1,$2,$3,1,true)", [
        trade,
        area,
        today,
      ]);
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text,name text,public boolean,file_size_limit int,allowed_mime_types text[]);`,
    );
    for (let i = 1; i <= 4; i++)
      await db.query("insert into auth.users values($1,$2)", [
        uid(i),
        i === 4 ? "staff@m3lem.example" : `artisan${i}@m3lem.example`,
      ]);
    for (const path of [
      "supabase/migrations/202611190001_directory.sql",
      "supabase/migrations/202611190002_media_library.sql",
      "scripts/catalog.sql",
      "scripts/demo.sql",
    ])
      await db.exec(await sql(path));
    await t.test(
      "anonymous grants, demo isolation, matching and ranking",
      async () => {
        await role("anon");
        assert.deepEqual(await one("public.find_artisans('casablanca')"), []);
        assert.equal((await detail())!.phone, null);
        assert.equal((await find("maarif"))[0].areas[0], "maarif");
        assert.equal((await find("maarif", "plomberie", true)).length, 1);
        assert.deepEqual(await find("sidi-maarouf", "peinture"), []);
        await assert.rejects(
          db.query("select * from directory.reports"),
          /permission denied/,
        );
        await assert.rejects(one("public.staff_queue()"), /permission denied/);
        await assert.rejects(
          one("public.report_profile($1,'broken')", [id]),
          /permission denied/,
        );
      },
    );
    let draft: string, live: string;
    await t.test(
      "owners cannot set verification/admin, read other assets or publish; draft edits retain approved snapshot",
      async () => {
        await role("service_role");
        await one("public.register_asset($1,$2)", [uid(1), asset]);
        await role("authenticated", 2);
        await assert.rejects(
          db.query("insert into directory.admins values($1)", [uid(2)]),
          /permission denied/,
        );
        await assert.rejects(
          db.query("update directory.profiles set verified_phone='x'"),
          /permission denied/,
        );
        assert.equal(
          await one("public.can_read_asset($1,true)", [asset]),
          false,
        );
        await role("authenticated", 1);
        const r = (await work()).revision;
        live = r.id;
        assert.equal(
          await one("public.can_read_asset($1,true)", [asset]),
          true,
        );
        await assert.rejects(
          one("public.moderate($1,'approve',$2,'')", [id, r.id]),
          /staff/,
        );
        await one("public.save_profile($1,true)", [
          { ...r, base: r.id, name: "Edited atelier", gallery: [asset] },
        ]);
        draft = (await work()).revision.id;
        await assert.rejects(
          one("public.save_profile($1,true)", [{ ...r, base: r.id }]),
          /stale/,
        );
        await role("anon");
        assert.notEqual((await detail())!.name, "Edited atelier");
        assert.equal(
          await one("public.can_read_asset($1,true)", [asset]),
          false,
        );
      },
    );
    await t.test(
      "staff approves reviewed revision, stale moderation fails, badge bound to phone",
      async () => {
        await role("authenticated", 4);
        await assert.rejects(
          one("public.moderate($1,'approve',$2,'')", [id, live]),
          /stale/,
        );
        await one("public.moderate($1,'approve',$2,'')", [id, draft]);
        await one(
          "public.moderate($1,'confirm',$2,'answered staff callback')",
          [id, draft],
        );
        assert.equal((await detail())!.verified, true);
        await role("anon");
        assert.equal(
          await one("public.can_read_asset($1,true)", [asset]),
          true,
        );
        await role("authenticated", 1);
        const r = (await work()).revision;
        await one("public.save_profile($1,true)", [
          { ...r, base: r.id, phone: "+212600000099" },
        ]);
        draft = (await work()).revision.id;
        await one("public.set_available(true)");
        await role("authenticated", 4);
        await one("public.moderate($1,'approve',$2,'')", [id, draft]);
        assert.equal((await detail())!.verified, false);
      },
    );
    await t.test(
      "invitations expire, consume atomically and expose only moderated reviews",
      async () => {
        await role("authenticated", 4);
        await one("public.issue_invite($1,'Customer callback logged',$2)", [
          id,
          token,
        ]);
        const before = (await detail())!.count;
        await role("service_role");
        await assert.rejects(
          one("public.consume_invite($1,8,'Invalid stars')", [token]),
        );
        await one("public.consume_invite($1,5,'Very tidy work')", [token]);
        await assert.rejects(
          one("public.consume_invite($1,4,'Duplicate')", [token]),
        );
        await role("anon");
        assert.equal((await detail())!.count, before);
        await role("authenticated", 4);
        const q = await one<{ reviews: { id: string }[] }>(
          "public.staff_queue()",
        );
        await one("public.triage($1,'approved')", [q.reviews[0].id]);
        assert.equal((await detail())!.count, before + 1);
        await one("public.issue_invite($1,'Completed job checked',$2)", [
          id,
          "ef".repeat(32),
        ]);
        await db.exec(
          "reset role;update directory.invitations set expires=now()-interval '1 minute'",
        );
        await role("service_role");
        await assert.rejects(
          one("public.consume_invite($1,5,'Expired link')", ["ef".repeat(32)]),
        );
      },
    );
    await t.test(
      "Moroccan calendar expiry on the Ramadan offset-change day",
      async () => {
        await db.exec(
          `reset role;update directory.profiles set available_at='2024-03-09T23:30:00Z' where id='${id}'`,
        );
        await role("anon");
        const d = (await detail())!;
        assert.equal(d.available_at, null);
        assert.equal(
          new Date(d.expires_at!).toISOString(),
          "2024-03-11T00:00:00.000Z",
        );
        assert.deepEqual(await find("", "plomberie", true), []);
      },
    );
    await t.test(
      "owner cannot attach or release someone else's assets; hourly budget cannot be reset by a public client",
      async () => {
        await role("authenticated", 2);
        const r = (await work()).revision;
        await assert.rejects(
          one("public.save_profile($1,true)", [
            { ...r, base: r.id, gallery: [asset] },
          ]),
          /media/,
        );
        await assert.rejects(
          one("public.release_asset($1)", [asset]),
          /unavailable/,
        );
        await assert.rejects(
          one("public.take_quota('test',2)"),
          /permission denied/,
        );
        await role("service_role");
        for (const allowed of [true, true, false])
          assert.equal(await one("public.take_quota('test',2)"), allowed);
      },
    );
    await t.test(
      "suspension removes directory, detail, assets and availability control",
      async () => {
        await role("authenticated", 4);
        await one("public.moderate($1,'suspend',$2,'Broken contact')", [
          id,
          draft,
        ]);
        await role("anon");
        assert.ok(!(await find()).some((r) => r.id === id));
        assert.equal(await detail(), null);
        assert.equal(
          await one("public.can_read_asset($1,true)", [asset]),
          false,
        );
        await role("authenticated", 1);
        await assert.rejects(
          one("public.set_available(true)"),
          /not published/,
        );
      },
    );
    await t.test(
      "corrections require independent reapproval; withdrawal revokes the live version",
      async () => {
        await role("authenticated", 4);
        await one(
          "public.moderate($1,'changes',$2,'Please correct service details')",
          [id, draft],
        );
        assert.equal(await detail(), null);
        await role("authenticated", 1);
        const w = await work();
        assert.match(w.feedback, /correct service/);
        await one("public.save_profile($1,true)", [
          { ...w.revision, base: w.revision.id },
        ]);
        draft = (await work()).revision.id;
        await role("authenticated", 4);
        await one("public.moderate($1,'approve',$2,'')", [id, draft]);
        assert.ok(await detail());
        await role("authenticated", 1);
        const r = (await work()).revision;
        await one("public.save_profile($1,false)", [
          { ...r, base: r.id, consent: false, gallery: [] },
        ]);
        await one("public.release_asset($1)", [asset]);
        await role("anon");
        assert.equal(await detail(), null);
        assert.equal(
          await one("public.can_read_asset($1,true)", [asset]),
          false,
        );
      },
    );
  } finally {
    await db.close();
  }
});
