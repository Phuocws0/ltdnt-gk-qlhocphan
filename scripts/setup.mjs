import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import bcrypt from "../server/node_modules/bcryptjs/index.js";
if (!existsSync("server/.env")) {
  writeFileSync(
    "server/.env",
    `MONGODB_URI=mongodb://127.0.0.1:27028\nMONGODB_DB=QLHocPhan\nPORT=4000\nADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=${await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123456", 12)}\nJWT_SECRET=${randomBytes(48).toString("hex")}\nCORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081\n`,
    { mode: 0o600 },
  );
  console.log(
    "Đã tạo server/.env. Tài khoản demo: admin / Admin@123456 (hoặc ADMIN_PASSWORD bạn đặt).",
  );
} else console.log("Giữ nguyên server/.env hiện có.");
