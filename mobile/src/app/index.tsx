import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { request, storage } from "../lib/api";
type Teacher = {
  IDGV: string;
  Fullname: string;
  Image: string;
  SumClass: number;
};
type Draft = Omit<Teacher, "SumClass"> & { SumClass: string };
const empty: Draft = { IDGV: "", Fullname: "", Image: "", SumClass: "0" };
const green = "#145b48";
function Button({
  title,
  onPress,
  quiet = false,
  danger = false,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  quiet?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        quiet ? s.quiet : { backgroundColor: danger ? "#ae3838" : green },
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      {icon && (
        <Feather name={icon} size={17} color={quiet ? green : "white"} />
      )}
      <Text
        style={{
          color: quiet ? (danger ? "#ae3838" : green) : "white",
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
function Field({
  label,
  value,
  onChange,
  secure = false,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  numeric?: boolean;
}) {
  return (
    <View style={{ gap: 8, marginBottom: 18 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={numeric ? "number-pad" : "default"}
        autoCapitalize="none"
        style={s.input}
      />
    </View>
  );
}
export default function Home() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [token, setToken] = useState(""),
    [ready, setReady] = useState(false),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState("");
  const [rows, setRows] = useState<Teacher[]>([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [sort, setSort] = useState("IDGV"),
    [page, setPage] = useState(1);
  const [form, setForm] = useState<Draft>(empty),
    [editor, setEditor] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [formError, setFormError] = useState("");
  const [detail, setDetail] = useState<Teacher | null>(null),
    [removing, setRemoving] = useState<Teacher | null>(null);
  useEffect(() => {
    storage
      .get()
      .then((t) => setToken(t || ""))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  async function logout() {
    await storage.clear();
    setToken("");
    setRows([]);
    setPassword("");
    setEditor(false);
    setDetail(null);
    setRemoving(null);
    setError("");
    setNotice("");
  }
  async function load(t = token) {
    setLoading(true);
    setError("");
    try {
      setRows(await request("/giang-vien", t));
    } catch (e) {
      if ((e as { status?: number }).status === 401) await logout();
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    if (token)
      request("/giang-vien", token)
        .then((data) => {
          if (active) setRows(data);
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            if (e.status === 401) {
              void storage.clear();
              setToken("");
            }
          }
        });
    return () => {
      active = false;
    };
  }, [token]);
  async function login() {
    setBusy(true);
    setError("");
    try {
      const data = await request("/auth/login", "", "POST", {
        username: username.trim(),
        password,
      });
      await storage.set(data.token);
      setToken(data.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pick(camera = false) {
    setFormError("");
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setFormError(
            "Cần quyền camera để chụp ảnh. Bạn có thể chọn ảnh từ thư viện.",
          );
          return;
        }
      }
      const result = await (
        camera
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync
      )({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64)
        throw Error("Không đọc được ảnh. Vui lòng chọn ảnh khác.");
      if (asset.base64.length > 2796204)
        throw Error("Ảnh tối đa 2 MB. Hãy chọn ảnh nhỏ hơn.");
      const mime = asset.base64.startsWith("/9j/")
        ? "image/jpeg"
        : asset.base64.startsWith("iVBOR")
          ? "image/png"
          : asset.base64.startsWith("UklGR")
            ? "image/webp"
            : "";
      if (!mime) throw Error("Chỉ hỗ trợ PNG, JPEG và WebP.");
      setForm((f) => ({ ...f, Image: `data:${mime};base64,${asset.base64}` }));
    } catch (e) {
      setFormError((e as Error).message);
    }
  }
  function openEditor(row?: Teacher) {
    setEditing(row?.IDGV || null);
    setForm(row ? { ...row, SumClass: String(row.SumClass) } : { ...empty });
    setFormError("");
    setEditor(true);
  }
  async function save() {
    if (!/^[A-Za-z0-9_-]{2,20}$/.test(form.IDGV.trim()))
      return setFormError("Mã giảng viên gồm 2–20 chữ, số, _ hoặc -.");
    if (form.Fullname.trim().length < 2)
      return setFormError("Nhập họ và tên ít nhất 2 ký tự.");
    if (!/^\d+$/.test(form.SumClass) || Number(form.SumClass) > 999)
      return setFormError("Tổng số lớp phải là số nguyên từ 0 đến 999.");
    if (!form.Image) return setFormError("Vui lòng chọn ảnh giảng viên.");
    setBusy(true);
    setFormError("");
    try {
      await request(
        "/giang-vien" + (editing ? "/" + encodeURIComponent(editing) : ""),
        token,
        editing ? "PUT" : "POST",
        { ...form, SumClass: Number(form.SumClass) },
      );
      setEditor(false);
      setNotice(editing ? "Đã cập nhật giảng viên." : "Đã thêm giảng viên.");
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await request(
        "/giang-vien/" + encodeURIComponent(removing.IDGV),
        token,
        "DELETE",
      );
      setRemoving(null);
      setNotice("Đã xóa giảng viên.");
      await load();
    } catch (e) {
      setRemoving(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const fold = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  const filtered = rows
    .filter((r) => fold(r.IDGV + " " + r.Fullname).includes(fold(search)))
    .sort((a, b) =>
      sort === "SumClass"
        ? b.SumClass - a.SumClass
        : String(a[sort as keyof Teacher]).localeCompare(
            String(b[sort as keyof Teacher]),
            "vi",
          ),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * 6, current * 6);
  if (!ready)
    return (
      <View style={s.center}>
        <ActivityIndicator color={green} />
      </View>
    );
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      <View style={s.top}>
        <View style={s.brand}>
          <View style={s.logo}>
            <Feather name="book-open" size={22} color="white" />
          </View>
          <View>
            <Text style={s.brandText}>QL Học Phần</Text>
            <Text style={s.small}>CỔNG QUẢN TRỊ ĐÀO TẠO</Text>
          </View>
        </View>
        {!!token && (
          <Button
            title={wide ? "Đăng xuất · admin" : "Đăng xuất"}
            onPress={() => void logout()}
            quiet
            icon="log-out"
          />
        )}
      </View>
      {!token ? (
        <ScrollView
          key="login"
          contentContainerStyle={[
            s.loginWrap,
            wide && { flexDirection: "row" },
          ]}
        >
          <View style={{ flex: 1, maxWidth: 510, gap: 24 }}>
            <Text style={s.eyebrow}>KHÔNG GIAN QUẢN TRỊ</Text>
            <Text style={[s.hero, { fontSize: wide ? 52 : 36 }]}>
              Quản lý giảng viên.{"\n"}Kết nối tri thức.
            </Text>
            <Text style={s.subtitle}>
              Một nơi để cập nhật hồ sơ, theo dõi số lớp và quản lý đội ngũ
              giảng dạy.
            </Text>
            <View style={s.feature}>
              <Feather name="users" size={24} color={green} />
              <Text style={s.body}>Hồ sơ tập trung · Thông tin đồng bộ</Text>
            </View>
          </View>
          <View style={s.loginCard}>
            <Text style={s.title}>Chào mừng trở lại</Text>
            <Text style={[s.subtitle, { marginBottom: 28 }]}>
              Đăng nhập để quản lý giảng viên
            </Text>
            <Field
              label="Tên đăng nhập"
              value={username}
              onChange={setUsername}
            />
            <Field
              label="Mật khẩu"
              value={password}
              onChange={setPassword}
              secure
            />
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            <Button
              title={busy ? "Đang đăng nhập…" : "Đăng nhập"}
              onPress={() => void login()}
              disabled={busy || !username || !password}
              icon="arrow-right"
            />
            <Text style={[s.small, { marginTop: 24, textAlign: "center" }]}>
              Dành cho quản trị viên hệ thống
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView key="dashboard" contentContainerStyle={s.content}>
          <View
            style={[s.heading, !wide && { alignItems: "flex-start", gap: 20 }]}
          >
            <View>
              <Text style={s.eyebrow}>QUẢN LÝ ĐÀO TẠO / GIẢNG VIÊN</Text>
              <Text style={s.hero}>Đội ngũ giảng viên</Text>
              <Text style={s.subtitle}>
                Quản lý hồ sơ và phân bổ lớp học của bạn.
              </Text>
            </View>
            <Button
              title="Thêm giảng viên"
              icon="plus"
              onPress={() => openEditor()}
            />
          </View>
          <View style={s.stats}>
            {[
              ["Giảng viên", rows.length, "users"],
              [
                "Tổng số lớp",
                rows.reduce((a, r) => a + r.SumClass, 0),
                "layers",
              ],
              [
                "Lớp / giảng viên",
                rows.length
                  ? (
                      rows.reduce((a, r) => a + r.SumClass, 0) / rows.length
                    ).toFixed(1)
                  : "0",
                "bar-chart-2",
              ],
            ].map(([label, value, icon]) => (
              <View key={label} style={s.stat}>
                <Feather name={icon as "users"} size={20} color={green} />
                <Text style={s.statValue}>{value}</Text>
                <Text style={s.small}>{label}</Text>
              </View>
            ))}
          </View>
          {!!notice && (
            <Pressable onPress={() => setNotice("")}>
              <Text accessibilityRole="alert" style={s.success}>
                {notice} ×
              </Text>
            </Pressable>
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <View style={s.panel}>
            <View style={s.toolbar}>
              <View style={s.search}>
                <Feather name="search" size={18} color="#7a8983" />
                <TextInput
                  accessibilityLabel="Tìm giảng viên"
                  placeholder="Tìm theo mã hoặc họ tên…"
                  value={search}
                  onChangeText={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  style={{ flex: 1, padding: 8, fontSize: 14 }}
                />
              </View>
              <Button
                title="Làm mới"
                onPress={() => void load()}
                quiet
                icon="refresh-cw"
                disabled={loading}
              />
            </View>
            <View style={s.filters}>
              <Text style={s.small}>Sắp xếp:</Text>
              {[
                ["IDGV", "Mã GV"],
                ["Fullname", "Họ tên"],
                ["SumClass", "Số lớp ↓"],
              ].map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => {
                    setSort(key);
                    setPage(1);
                  }}
                  style={[
                    s.chip,
                    sort === key && { backgroundColor: "#dceee5" },
                  ]}
                >
                  <Text
                    style={{
                      color: green,
                      fontWeight: sort === key ? "700" : "400",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
              <Text style={s.small}>{filtered.length} kết quả</Text>
            </View>
            {loading ? (
              <ActivityIndicator style={{ padding: 50 }} color={green} />
            ) : visible.length === 0 ? (
              <View style={{ padding: 48, alignItems: "center", gap: 14 }}>
                <Feather name="inbox" size={36} color={green} />
                <Text style={s.title}>
                  {search ? "Không tìm thấy giảng viên" : "Chưa có giảng viên"}
                </Text>
                <Text style={s.subtitle}>
                  {search
                    ? "Thử tìm bằng mã hoặc tên khác."
                    : "Thêm hồ sơ đầu tiên để bắt đầu."}
                </Text>
              </View>
            ) : (
              visible.map((row) => (
                <View
                  key={row.IDGV}
                  style={[s.row, !wide && { flexWrap: "wrap" }]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={"Xem " + row.Fullname}
                    onPress={() => setDetail(row)}
                    style={s.person}
                  >
                    <Image source={{ uri: row.Image }} style={s.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.personName}>{row.Fullname}</Text>
                      <Text style={s.small}>{row.IDGV}</Text>
                    </View>
                  </Pressable>
                  <View style={s.classBadge}>
                    <Feather name="layers" size={14} color={green} />
                    <Text style={{ color: green }}>{row.SumClass} lớp</Text>
                  </View>
                  <View style={s.actions}>
                    <Button
                      title="Sửa"
                      quiet
                      icon="edit-2"
                      onPress={() => openEditor(row)}
                    />
                    <Button
                      title="Xóa"
                      quiet
                      danger
                      icon="trash-2"
                      onPress={() => setRemoving(row)}
                    />
                  </View>
                </View>
              ))
            )}
            <View style={s.footer}>
              <Text style={s.small}>
                Trang {current} / {pages}
              </Text>
              <View style={s.actions}>
                <Button
                  title="Trước"
                  quiet
                  disabled={current <= 1}
                  onPress={() => setPage(current - 1)}
                />
                <Button
                  title="Sau"
                  quiet
                  disabled={current >= pages}
                  onPress={() => setPage(current + 1)}
                />
              </View>
            </View>
          </View>
          <Text style={[s.small, { textAlign: "center", marginTop: 24 }]}>
            QL Học Phần · Không gian quản lý giảng dạy
          </Text>
        </ScrollView>
      )}
      <Modal
        visible={editor}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!busy) setEditor(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.overlay}
        >
          <ScrollView contentContainerStyle={s.modalScroll}>
            <View style={s.modal}>
              <Text style={s.title}>
                {editing ? "Chỉnh sửa giảng viên" : "Thêm giảng viên mới"}
              </Text>
              <Text style={[s.subtitle, { marginBottom: 24 }]}>
                Điền đầy đủ thông tin hồ sơ bên dưới.
              </Text>
              <View style={{ alignItems: "center", gap: 12, marginBottom: 24 }}>
                {form.Image ? (
                  <Image source={{ uri: form.Image }} style={s.preview} />
                ) : (
                  <View style={[s.preview, s.center]}>
                    <Feather name="user" size={44} color={green} />
                  </View>
                )}
                <View style={s.actions}>
                  <Button
                    title="Chọn ảnh"
                    quiet
                    icon="image"
                    onPress={() => void pick()}
                  />
                  {Platform.OS !== "web" && (
                    <Button
                      title="Chụp ảnh"
                      quiet
                      icon="camera"
                      onPress={() => void pick(true)}
                    />
                  )}
                </View>
                <Text style={s.small}>PNG, JPEG, WebP · tối đa 2 MB</Text>
              </View>
              <Field
                label="Mã giảng viên (IDGV)"
                value={form.IDGV}
                onChange={(v) => setForm({ ...form, IDGV: v })}
              />
              <Field
                label="Họ và tên (Fullname)"
                value={form.Fullname}
                onChange={(v) => setForm({ ...form, Fullname: v })}
              />
              <Field
                label="Tổng số lớp (SumClass)"
                value={form.SumClass}
                onChange={(v) => setForm({ ...form, SumClass: v })}
                numeric
              />
              {!!formError && (
                <Text accessibilityRole="alert" style={s.error}>
                  {formError}
                </Text>
              )}
              <View style={[s.actions, { justifyContent: "flex-end" }]}>
                <Button
                  title="Hủy"
                  quiet
                  disabled={busy}
                  onPress={() => setEditor(false)}
                />
                <Button
                  title={busy ? "Đang lưu…" : "Lưu giảng viên"}
                  onPress={() => void save()}
                  disabled={busy}
                  icon="check"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={!!detail}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            {detail && (
              <View style={{ alignItems: "center", gap: 20 }}>
                <Image source={{ uri: detail.Image }} style={s.preview} />
                <Text style={s.title}>{detail.Fullname}</Text>
                <Text style={s.subtitle}>Mã giảng viên: {detail.IDGV}</Text>
                <Text style={s.statValue}>{detail.SumClass} lớp</Text>
                <Button title="Đóng" quiet onPress={() => setDetail(null)} />
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!removing}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setRemoving(null);
        }}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.title}>Xóa giảng viên?</Text>
            <Text style={[s.subtitle, { marginVertical: 20 }]}>
              Bạn sẽ xóa hồ sơ {removing?.Fullname} ({removing?.IDGV}). Thao tác
              này không thể hoàn tác.
            </Text>
            <View style={s.actions}>
              <Button
                title="Giữ lại"
                quiet
                disabled={busy}
                onPress={() => setRemoving(null)}
              />
              <Button
                title={busy ? "Đang xóa…" : "Xác nhận xóa"}
                danger
                disabled={busy}
                onPress={() => void remove()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f4f6f3" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  top: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#e3e9e4",
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", gap: 12, alignItems: "center" },
  logo: {
    width: 44,
    height: 44,
    backgroundColor: green,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { fontSize: 18, fontWeight: "800", color: "#18392e" },
  small: { fontSize: 12, color: "#6d7b74", lineHeight: 20 },
  loginWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 64,
  },
  loginCard: {
    width: "100%",
    maxWidth: 430,
    padding: 32,
    backgroundColor: "white",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e3e9e4",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: green,
    marginBottom: 14,
  },
  hero: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#173b2f",
    marginBottom: 12,
  },
  subtitle: { fontSize: 15, lineHeight: 24, color: "#6b7c72" },
  feature: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#e7efe8",
    borderRadius: 16,
  },
  body: { fontSize: 14, color: green, flexShrink: 1 },
  title: { fontSize: 23, fontWeight: "700", color: "#173b2f", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#344f43" },
  input: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#d7e0d9",
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#fcfdfb",
    color: "#18392e",
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quiet: { backgroundColor: "#f0f5f0" },
  content: {
    width: "100%",
    maxWidth: 1250,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 40,
  },
  heading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  stats: { flexDirection: "row", gap: 12, marginVertical: 20 },
  stat: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e3e9e4",
    padding: 18,
    borderRadius: 16,
    gap: 10,
  },
  statValue: { fontSize: 30, fontWeight: "700", color: green },
  panel: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e9e4",
    overflow: "hidden",
    marginTop: 10,
  },
  toolbar: { flexDirection: "row", padding: 18, gap: 12 },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f3",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  filters: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f5f6f4",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 18,
    borderTopWidth: 1,
    borderColor: "#edf0eb",
  },
  person: {
    flex: 1,
    minWidth: 210,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#e5eee8",
  },
  personName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#223e31",
    marginBottom: 4,
  },
  classBadge: {
    flexDirection: "row",
    gap: 8,
    padding: 9,
    backgroundColor: "#edf5ef",
    borderRadius: 8,
  },
  actions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#edf0eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  error: {
    backgroundColor: "#fff0ee",
    color: "#a33131",
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    lineHeight: 22,
  },
  success: {
    backgroundColor: "#dfefe3",
    color: green,
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,35,25,.48)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "white",
    borderRadius: 22,
    padding: 26,
  },
  preview: {
    width: 112,
    height: 112,
    borderRadius: 28,
    backgroundColor: "#e7efe8",
    flex: undefined,
  },
});
