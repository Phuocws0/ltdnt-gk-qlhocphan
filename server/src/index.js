import "dotenv/config";
import { connect, client } from "./db.js";
import { createApp } from "./app.js";
if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32 ||
  !process.env.ADMIN_PASSWORD_HASH
)
  throw Error(
    "Thiếu JWT_SECRET (>=32 ký tự) hoặc ADMIN_PASSWORD_HASH. Chạy npm run setup ở thư mục gốc.",
  );
const collection = await connect();
const app = createApp(collection, {
  secret: process.env.JWT_SECRET,
  username: process.env.ADMIN_USERNAME || "admin",
  passwordHash: process.env.ADMIN_PASSWORD_HASH,
  origins: process.env.CORS_ORIGINS?.split(",") || [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
  ],
});
const server = app.listen(Number(process.env.PORT) || 4000, "0.0.0.0", () =>
  console.log("API ready http://localhost:4000"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await client.close();
      process.exit(0);
    }),
  );
