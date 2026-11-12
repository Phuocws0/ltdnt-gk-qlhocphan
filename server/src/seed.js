import { readFile } from "node:fs/promises";
import { connect, client } from "./db.js";
try {
  const c = await connect();
  const rows = JSON.parse(
    await readFile(
      new URL("../../database/GiangVien.json", import.meta.url),
      "utf8",
    ),
  );
  for (const row of rows)
    await c.updateOne(
      { IDGV: row.IDGV },
      { $setOnInsert: row },
      { upsert: true },
    );
  console.log(`Đã nạp ${rows.length} mẫu (giữ nguyên bản ghi đã có).`);
} finally {
  await client.close();
}
