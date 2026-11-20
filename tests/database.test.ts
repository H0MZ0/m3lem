import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type {
  Card,
  Workspace,
  Detail,
  ServiceRequest,
  RequestQueueItem,
  RequestStatus,
} from "../src/lib/model";
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
    find = (trade = "plomberie", today = false) =>
      one<Card[]>("public.find_artisans('casablanca',$1,$2,1,true)", [
        trade,
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
      "supabase/migrations/202611190003_moroccan_cities.sql",
      "supabase/migrations/202611190004_artisan_trades.sql",
      "supabase/migrations/202611190005_regions.sql",
      "supabase/migrations/202611190006_city_discovery.sql",
      "supabase/migrations/202611190007_marketplace_workflows.sql",
      "supabase/migrations/202611200001_service_requests.sql",
      "scripts/demo.sql",
    ])
      await db.exec(await sql(path));
    await t.test(
      "national catalog is available to anonymous clients without inventing coverage",
      async () => {
        await role("anon");
        const items = await one<
          { slug: string; kind: string; parent: string | null }[]
        >("public.catalog_items()");
        assert.equal(items.filter((i) => i.kind === "city").length, 385);
        const regions = items
          .filter((i) => i.kind === "region")
          .map((i) => i.slug);
        assert.equal(regions.length, 12);
        assert.ok(
          items
            .filter((i) => i.kind === "city")
            .every((i) => regions.includes(i.parent!)),
        );
        assert.equal(
          items.find((i) => i.slug === "tanger")?.parent,
          "region-01",
        );
        assert.equal(
          items.find((i) => i.slug === "casablanca")?.parent,
          "region-06",
        );
        assert.ok(!items.some((i) => i.kind === "area"));
        assert.equal(items.filter((i) => i.kind === "trade").length, 190);
        for (const slug of [
          "casablanca",
          "tanger",
          "tamesna",
          "dakhla",
          "ajdir-al-hoceima",
          "ajdir-taza",
          "menuiserie",
          "maconnerie",
          "poterie",
          "bobinage",
        ])
          assert.ok(
            items.some((i) => i.slug === slug),
            slug,
          );
        assert.deepEqual(
          await one("public.find_artisans('dakhla','menuiserie',false,1,true)"),
          [],
        );
      },
    );
    await t.test(
      "anonymous grants, demo isolation, matching and ranking",
      async () => {
        await role("anon");
        assert.deepEqual(await one("public.find_artisans('casablanca')"), []);
        assert.equal((await detail())!.phone, null);
        assert.equal((await find()).length, 2);
        assert.equal((await find("plomberie", true)).length, 1);
        assert.ok(!("areas" in (await find("peinture"))[0]));
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
      "anonymous signals aggregate, exclude demo contacts and are only reported to staff",
      async () => {
        await role("anon");
        await assert.rejects(
          one("public.discovery_summary()"),
          /permission denied/,
        );
        await assert.rejects(
          one("public.review_subject($1)", [token]),
          /permission denied/,
        );
        await role("service_role");
        await one("public.count_discovery('search','casablanca','plomberie')");
        await one(
          "public.count_discovery('call','casablanca','plomberie',false,$1)",
          [id],
        );
        await role("authenticated", 2);
        await assert.rejects(one("public.discovery_summary()"), /staff/);
        await role("authenticated", 4);
        const result = await one<{
          searches: number;
          empty: number;
          calls: number;
        }>("public.discovery_summary()");
        assert.equal(result.searches, 1);
        assert.equal(result.empty, 1);
        assert.equal(result.calls, 0);
        await db.exec(
          `reset role;update directory.profiles set demo=false where id='${id}'`,
        );
        await role("service_role");
        await one("public.count_discovery('search','casablanca','plomberie')");
        for (const channel of ["call", "whatsapp"])
          await one(
            "public.count_discovery($1,'casablanca','plomberie',false,$2)",
            [channel, id],
          );
        await one(
          "public.count_discovery('call','tanger','plomberie',false,$1)",
          [id],
        );
        await role("authenticated", 4);
        assert.deepEqual(await one("public.discovery_summary()"), {
          searches: 2,
          empty: 1,
          calls: 1,
          whatsapp: 1,
          gaps: [{ city: "casablanca", trade: "plomberie", misses: 1 }],
        });
        await db.exec(
          `reset role;update directory.profiles set demo=true where id='${id}'`,
        );
      },
    );
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
        assert.equal(
          await one("public.review_subject($1)", [token]),
          "Edited atelier",
        );
        await assert.rejects(
          one("public.consume_invite($1,8,'Invalid stars')", [token]),
        );
        await one("public.consume_invite($1,5,'Very tidy work')", [token]);
        assert.equal(await one("public.review_subject($1)", [token]), null);
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
      "service requests are token-scoped, match only local trades, and record contact",
      async () => {
        const reqHash = "ab".repeat(32),
          reqAsset = "30000000-0000-4000-8000-000000000002",
          ref = "REQ0000001";
        await role("service_role");
        const created = await one<{ id: string; ref: string }>(
          "public.create_request($1,$2,$3::uuid[])",
          [
            {
              ref,
              trade: "plomberie",
              city: "casablanca",
              name: "Client test",
              phone: "+212611111111",
              description: "تسرب تحت الحوض فالمطبخ",
              consent: true,
            },
            reqHash,
            [reqAsset],
          ],
        );
        assert.equal(created.ref, ref);
        await role("anon");
        const status = (await one<RequestStatus>("public.request_status($1)", [
          reqHash,
        ]))!;
        assert.equal(status.state, "open");
        assert.equal(status.responses, 0);
        assert.deepEqual(status.photos, [reqAsset]);
        assert.equal(
          await one("public.can_read_request_photo($1,'')", [reqAsset]),
          false,
        );
        assert.equal(
          await one("public.can_read_request_photo($1,$2)", [
            reqAsset,
            reqHash,
          ]),
          true,
        );
        await assert.rejects(
          db.query("select * from directory.requests"),
          /permission denied/,
        );
        await assert.rejects(one("public.my_requests()"), /permission denied/);
        await role("authenticated", 2);
        const mine = await one<ServiceRequest[]>("public.my_requests()");
        assert.equal(mine.length, 1);
        assert.equal(mine[0].phone, "+212611111111");
        assert.equal(mine[0].responded, false);
        assert.deepEqual(mine[0].photos, [reqAsset]);
        assert.equal(
          await one("public.can_read_request_photo($1)", [reqAsset]),
          true,
        );
        await one("public.respond_request($1)", [created.id]);
        assert.equal(
          (await one<ServiceRequest[]>("public.my_requests()"))[0].responded,
          true,
        );
        await role("authenticated", 3);
        assert.deepEqual(await one("public.my_requests()"), []);
        assert.equal(
          await one("public.can_read_request_photo($1)", [reqAsset]),
          false,
        );
        await role("authenticated", 4);
        const queue = await one<RequestQueueItem[]>("public.request_queue()");
        assert.equal(queue.length, 1);
        assert.equal(queue[0].responses, 1);
        assert.match(queue[0].responders[0].name, /نحاس/);
        const summary = await one<{
          open: number;
          last30: number;
          responded: number;
          responses: number;
          avg_minutes: number | null;
        }>("public.request_summary()");
        assert.ok(summary.open >= 1);
        assert.ok(summary.last30 >= 1);
        assert.ok(summary.responded >= 1);
        assert.ok(summary.responses >= 1);
        assert.ok(summary.avg_minutes !== null);
        assert.deepEqual(
          await one("public.triage_request($1,'close')", [created.id]),
          [reqAsset],
        );
        await role("anon");
        assert.equal(
          (await one<RequestStatus>("public.request_status($1)", [reqHash]))!
            .state,
          "closed",
        );
        await role("authenticated", 2);
        assert.deepEqual(await one("public.my_requests()"), []);

        await role("service_role");
        const expired = await one<{ id: string }>(
          "public.create_request($1,$2,$3::uuid[])",
          [
            {
              ref: "REQ0000002",
              trade: "plomberie",
              city: "casablanca",
              name: "Client expiré",
              phone: "+212622222222",
              description: "طلب قديم للاختبار",
              consent: true,
            },
            "ef".repeat(32),
            [],
          ],
        );
        await db.exec(
          `reset role;update directory.requests set expires_at=now()-interval '1 minute' where id='${expired.id}'`,
        );
        await role("anon");
        assert.equal(
          (await one<RequestStatus>("public.request_status($1)", [
            "ef".repeat(32),
          ]))!.state,
          "expired",
        );
        await role("authenticated", 2);
        assert.deepEqual(await one("public.my_requests()"), []);
        await assert.rejects(
          one("public.respond_request($1)", [expired.id]),
          /request/,
        );
        await role("authenticated", 4);
        await one("public.triage_request($1,'close')", [expired.id]);
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
        assert.deepEqual(await find("plomberie", true), []);
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
