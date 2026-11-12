import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
const photo = z
  .string()
  .max(2900000)
  .refine((s) => {
    const match = s.match(
      /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
    );
    if (!match) return false;
    const b = Buffer.from(match[2], "base64");
    return (
      b.length <= 2 * 1024 * 1024 &&
      (match[1] === "png"
        ? b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : match[1] === "jpeg"
          ? b[0] === 255 && b[1] === 216 && b[2] === 255
          : b.toString("ascii", 0, 4) === "RIFF" &&
            b.toString("ascii", 8, 12) === "WEBP")
    );
  }, "Ảnh phải là PNG/JPEG/WebP hợp lệ, tối đa 2 MB.");
const schema = z
  .object({
    IDGV: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{2,20}$/, "Mã gồm 2–20 chữ, số, _ hoặc -."),
    Fullname: z.string().trim().min(2).max(100),
    Image: photo,
    SumClass: z.number().int().min(0).max(999),
  })
  .strict();
export function createApp(collection, config) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.origins }));
  app.use(express.json({ limit: "3mb" }));
  app.get("/api/health", async (req, res, next) => {
    try {
      await collection.findOne({}, { projection: { _id: 1 } });
      res.json({
        status: "ok",
        database: "QLHocPhan",
        collection: "GiangVien",
      });
    } catch (e) {
      next(e);
    }
  });
  app.post(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Quá nhiều lần đăng nhập. Thử lại sau 15 phút." },
    }),
    async (req, res, next) => {
      try {
        const { username, password } = req.body || {};
        if (
          typeof username !== "string" ||
          typeof password !== "string" ||
          password.length > 200
        )
          return res
            .status(400)
            .json({ message: "Thông tin đăng nhập không hợp lệ." });
        const valid = await bcrypt.compare(password, config.passwordHash);
        if (username !== config.username || !valid)
          return res
            .status(401)
            .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng." });
        res.json({
          token: jwt.sign({ role: "admin" }, config.secret, {
            subject: username,
            expiresIn: "8h",
          }),
          username,
        });
      } catch (e) {
        next(e);
      }
    },
  );
  app.use("/api", (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace(/^Bearer /, "");
      const claims = jwt.verify(token, config.secret);
      if (claims.role !== "admin") throw Error();
      next();
    } catch {
      res
        .status(401)
        .json({
          message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        });
    }
  });
  app.get("/api/giang-vien", async (req, res, next) => {
    try {
      const q = String(req.query.q || "")
        .trim()
        .slice(0, 100);
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const filter = q
        ? {
            $or: [
              { IDGV: { $regex: escaped, $options: "i" } },
              { Fullname: { $regex: escaped, $options: "i" } },
            ],
          }
        : {};
      const sort = ["IDGV", "Fullname", "SumClass"].includes(req.query.sort)
        ? req.query.sort
        : "IDGV";
      res.json(
        await collection
          .find(filter, { projection: { _id: 0 } })
          .sort({ [sort]: req.query.order === "desc" ? -1 : 1, IDGV: 1 })
          .toArray(),
      );
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/giang-vien", async (req, res, next) => {
    try {
      const data = schema.parse(req.body);
      await collection.insertOne({ ...data });
      res.status(201).json(data);
    } catch (e) {
      next(e);
    }
  });
  app.put("/api/giang-vien/:id", async (req, res, next) => {
    try {
      const data = schema.parse(req.body);
      const r = await collection.replaceOne({ IDGV: req.params.id }, data);
      if (!r.matchedCount)
        return res.status(404).json({ message: "Giảng viên không tồn tại." });
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
  app.delete("/api/giang-vien/:id", async (req, res, next) => {
    try {
      const r = await collection.deleteOne({ IDGV: req.params.id });
      if (!r.deletedCount)
        return res.status(404).json({ message: "Giảng viên không tồn tại." });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({
          message: err.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("\n"),
        });
    if (err.code === 11000)
      return res.status(409).json({ message: "Mã giảng viên đã tồn tại." });
    if (err.type === "entity.too.large")
      return res
        .status(413)
        .json({ message: "Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 2 MB." });
    if (err instanceof SyntaxError)
      return res.status(400).json({ message: "JSON không hợp lệ." });
    console.error(err);
    res
      .status(500)
      .json({ message: "Không thể xử lý yêu cầu. Vui lòng thử lại." });
  });
  return app;
}
