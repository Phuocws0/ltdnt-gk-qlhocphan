import "dotenv/config";
import { MongoClient } from "mongodb";
export const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27028",
);
export async function connect() {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "QLHocPhan");
  const validator = {
    $jsonSchema: {
      bsonType: "object",
      required: ["IDGV", "Fullname", "Image", "SumClass"],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        IDGV: { bsonType: "string" },
        Fullname: { bsonType: "string" },
        Image: { bsonType: "string" },
        SumClass: {
          bsonType: ["int", "long", "double", "decimal"],
          minimum: 0,
          maximum: 999,
        },
      },
    },
  };
  if (!(await db.listCollections({ name: "GiangVien" }).toArray()).length)
    await db.createCollection("GiangVien", { validator });
  else
    await db.command({
      collMod: "GiangVien",
      validator,
      validationLevel: "strict",
    });
  const collection = db.collection("GiangVien");
  await collection.createIndex({ IDGV: 1 }, { unique: true });
  return collection;
}
