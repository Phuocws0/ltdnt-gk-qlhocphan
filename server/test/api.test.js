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
const collection = db.collection("GiangVien");
await collection.createIndex({ IDGV: 1 }, { unique: true });
const server = createApp(collection, {
  username: "admin",
  passwordHash: await bcrypt.hash("Test@123456", 4),
  secret: "test-secret-at-least-thirty-two-characters",
  origins: true,
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
let token;
const { IDGV, ...sample } = JSON.parse(
  await readFile(new URL("../../database/GiangVien.json", import.meta.url)),
)[0];
async function call(path, method = "GET", body) {
  return fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
after(async () => {
  await db.dropDatabase();
  await client.close();
  server.close();
});
test("Đăng nhập, mã tự sinh và CRUD MongoDB", async () => {
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
  for (const invalid of [
    { ...sample, SumClass: -1 },
    { ...sample, SumClass: 1.5 },
    { ...sample, Image: "data:image/png;base64,YWJj" },
    { ...sample, extra: 1 },
    { ...sample, IDGV: "MANUAL" },
  ])
    assert.equal((await call("/giang-vien", "POST", invalid)).status, 400);
  const first = await call("/giang-vien", "POST", sample);
  assert.equal(first.status, 201);
  const firstTeacher = await first.json();
  assert.equal(firstTeacher.IDGV, "GV001");
  assert.deepEqual(Object.keys(firstTeacher).sort(), [
    "Fullname",
    "IDGV",
    "Image",
    "SumClass",
  ]);
  const parallel = await Promise.all([
    call("/giang-vien", "POST", { ...sample, Fullname: "Giảng viên Hai" }),
    call("/giang-vien", "POST", { ...sample, Fullname: "Giảng viên Ba" }),
  ]);
  assert.deepEqual(
    parallel.map((r) => r.status),
    [201, 201],
  );
  assert.deepEqual(
    (await collection.find({}, { projection: { IDGV: 1, _id: 0 } }).toArray())
      .map((r) => r.IDGV)
      .sort(),
    ["GV001", "GV002", "GV003"],
  );
  const data = await (await call("/giang-vien")).json();
  assert.deepEqual(Object.keys(data[0]).sort(), [
    "Fullname",
    "IDGV",
    "Image",
    "SumClass",
  ]);
  const update = { ...sample, Fullname: "Nguyễn Kiểm Thử", SumClass: 25 };
  assert.equal((await call("/giang-vien/GV001", "PUT", update)).status, 200);
  assert.equal((await collection.findOne({ IDGV: "GV001" })).SumClass, 25);
  assert.equal(
    (await call("/giang-vien/GV001", "PUT", { ...update, IDGV: "OTHER" }))
      .status,
    400,
  );
  assert.equal(
    (await (await call("/giang-vien?q=Ki%E1%BB%83m")).json()).length,
    1,
  );
  assert.equal((await call("/giang-vien/GV001", "DELETE")).status, 204);
  assert.equal((await call("/giang-vien/missing", "DELETE")).status, 404);
});
