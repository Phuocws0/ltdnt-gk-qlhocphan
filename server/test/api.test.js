import { test, after } from "node:test";
import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import { createApp } from "../src/app.js";
const client = await new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27028",
).connect();
const db = client.db("QLHocPhan_test_" + Date.now());
const c = db.collection("GiangVien");
await c.createIndex({ IDGV: 1 }, { unique: true });
const server = createApp(c, {
  username: "admin",
  passwordHash: await bcrypt.hash("Test@123456", 4),
  secret: "test-secret-at-least-thirty-two-characters",
  origins: true,
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
let token;
const sample = JSON.parse(
  await readFile(new URL("../../database/GiangVien.json", import.meta.url)),
)[0];
async function call(path, method = "GET", body, auth = true) {
  return fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
after(async () => {
  await db.dropDatabase();
  await client.close();
  server.close();
});
test("Đăng nhập, quyền truy cập, CRUD MongoDB và ràng buộc dữ liệu", async () => {
  assert.equal((await call("/giang-vien")).status, 401);
  assert.equal(
    (
      await call("/auth/login", "POST", {
        username: "admin",
        password: "wrong",
      })
    ).status,
    401,
  );
  const login = await call("/auth/login", "POST", {
    username: "admin",
    password: "Test@123456",
  });
  assert.equal(login.status, 200);
  token = (await login.json()).token;
  assert.equal((await call("/giang-vien", "POST", sample)).status, 201);
  assert.equal((await call("/giang-vien", "POST", sample)).status, 409);
  for (const invalid of [
    { ...sample, IDGV: "OTHER", SumClass: -1 },
    { ...sample, SumClass: 1.5 },
    { ...sample, Image: "data:image/png;base64,YWJj" },
    { ...sample, extra: 1 },
    { ...sample, IDGV: "" },
  ])
    assert.equal((await call("/giang-vien", "POST", invalid)).status, 400);
  const data = await (await call("/giang-vien")).json();
  assert.equal(data.length, 1);
  assert.deepEqual(Object.keys(data[0]).sort(), [
    "Fullname",
    "IDGV",
    "Image",
    "SumClass",
  ]);
  const update = { ...sample, Fullname: "Nguyễn Kiểm Thử", SumClass: 25 };
  assert.equal(
    (await call("/giang-vien/" + sample.IDGV, "PUT", update)).status,
    200,
  );
  assert.equal((await c.findOne({ IDGV: sample.IDGV })).SumClass, 25);
  assert.equal(
    (await (await call("/giang-vien?q=Ki%E1%BB%83m")).json()).length,
    1,
  );
  assert.equal(
    (await call("/giang-vien/" + sample.IDGV, "DELETE")).status,
    204,
  );
  assert.equal(await c.countDocuments(), 0);
  assert.equal((await call("/giang-vien/missing", "DELETE")).status, 404);
});
