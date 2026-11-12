import { writeFile } from "node:fs/promises";
import { connect, client } from "./db.js";
try {
  const c = await connect();
  await writeFile(
    new URL("../../database/GiangVien-export.json", import.meta.url),
    JSON.stringify(
      await c
        .find({}, { projection: { _id: 0 } })
        .sort({ IDGV: 1 })
        .toArray(),
      null,
      2,
    ),
  );
  console.log("Đã xuất database/GiangVien-export.json");
} finally {
  await client.close();
}
