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
  Text as NativeText,
  TextInput,
  type TextProps,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { request, storage } from "../lib/api";
function Text({ style, ...props }: TextProps) {
  return (
    <NativeText {...props} style={[{ fontFamily: "PlusJakartaSans" }, style]} />
  );
}

type Teacher = {
  IDGV: string;
  Fullname: string;
  Image: string;
  SumClass: number;
};
type Draft = Omit<Teacher, "SumClass"> & { SumClass: string };
const empty: Draft = { IDGV: "", Fullname: "", Image: "", SumClass: "0" };

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
        quiet ? s.quiet : { backgroundColor: danger ? "#a3423c" : green },
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      {icon && <Feather name={icon} size={17} color={quiet ? ink : "white"} />}
      <Text
        style={{
          color: quiet ? (danger ? "#a3423c" : ink) : "white",
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
        autoCapitalize={label.startsWith("Họ") ? "words" : "none"}
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
        {
          Fullname: form.Fullname,
          Image: form.Image,
          SumClass: Number(form.SumClass),
        },
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
  const totalClasses = rows.reduce((sum, row) => sum + row.SumClass, 0);
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      {!token ? (
        <View style={s.loginShell}>
          <ScrollView
            key="login"
            contentContainerStyle={s.loginArea}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.loginForm}>
              {
                <View style={s.mobileLoginBrand}>
                  <View style={s.mark}>
                    <Feather name="book-open" size={20} color="white" />
                  </View>
                  <Text style={s.mobileBrandText}>QL HỌC PHẦN</Text>
                </View>
              }
              <Text style={s.sectionKicker}>TÀI KHOẢN QUẢN TRỊ</Text>
              <Text style={s.loginTitle}>Đăng nhập</Text>
              <Text style={s.muted}>
                Nhập thông tin để vào danh sách giảng viên.
              </Text>
              <View style={{ height: 36 }} />
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
              <View style={s.loginSupport}>
                <Feather name="lock" size={14} color={muted} />
                <Text style={s.caption}>Chỉ dành cho quản trị viên</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={s.appShell}>
          <View style={s.mainArea}>
            {
              <View style={s.mobileTop}>
                <View style={s.mobileTopBrand}>
                  <View style={s.mobileMark}>
                    <Feather name="book-open" size={17} color="white" />
                  </View>
                  <Text style={s.mobileTopText}>QL HỌC PHẦN</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đăng xuất"
                  onPress={() => void logout()}
                  style={s.mobileLogout}
                >
                  <Feather name="log-out" size={16} color={green} />
                  <Text style={s.logoutLabel}>Đăng xuất</Text>
                </Pressable>
              </View>
            }
            <ScrollView
              key="dashboard"
              contentContainerStyle={[s.content, !wide && s.contentSmall]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.pageHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionKicker}>DANH SÁCH GIẢNG VIÊN</Text>
                  <Text style={[s.pageTitle, !wide && { fontSize: 31 }]}>
                    Giảng viên
                  </Text>
                  <Text style={s.summary}>
                    {rows.length} giảng viên <Text style={s.summaryDot}>·</Text>{" "}
                    {totalClasses} lớp đang quản lý
                  </Text>
                </View>
                {wide && (
                  <Button
                    title="Thêm giảng viên"
                    icon="plus"
                    onPress={() => openEditor()}
                  />
                )}
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
              {!wide && (
                <View style={s.mobileAdd}>
                  <Button
                    title="Thêm giảng viên"
                    icon="plus"
                    onPress={() => openEditor()}
                  />
                </View>
              )}
              <View style={s.listSurface}>
                <View style={[s.toolbar, !wide && s.toolbarSmall]}>
                  <View style={s.search}>
                    <Feather name="search" size={18} color={muted} />
                    <TextInput
                      accessibilityLabel="Tìm giảng viên"
                      placeholder="Tìm mã hoặc tên giảng viên"
                      placeholderTextColor="#929da9"
                      value={search}
                      onChangeText={(v) => {
                        setSearch(v);
                        setPage(1);
                      }}
                      style={s.searchInput}
                    />
                    {!!search && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Xóa tìm kiếm"
                        onPress={() => setSearch("")}
                      >
                        <Feather name="x" size={17} color={muted} />
                      </Pressable>
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Làm mới"
                    onPress={() => void load()}
                    disabled={loading}
                    style={s.refresh}
                  >
                    <Feather name="refresh-cw" size={17} color={ink} />
                    {wide && <Text style={s.refreshText}>Làm mới</Text>}
                  </Pressable>
                </View>
                <View style={[s.filterBar, !wide && { paddingHorizontal: 16 }]}>
                  <Text style={s.filterLabel}>SẮP XẾP</Text>
                  {(
                    [
                      ["IDGV", "Mã"],
                      ["Fullname", "Tên"],
                      ["SumClass", "Số lớp ↓"],
                    ] as const
                  ).map(([key, label]) => (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      onPress={() => {
                        setSort(key);
                        setPage(1);
                      }}
                      style={[s.sortOption, sort === key && s.sortSelected]}
                    >
                      <Text
                        style={[s.sortText, sort === key && s.sortTextSelected]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                  <Text style={s.resultCount}>{filtered.length} kết quả</Text>
                </View>
                {wide && (
                  <View style={s.tableHead}>
                    <Text style={[s.columnLabel, { flex: 1 }]}>GIẢNG VIÊN</Text>
                    <Text style={[s.columnLabel, { width: 145 }]}>
                      MÃ GIẢNG VIÊN
                    </Text>
                    <Text style={[s.columnLabel, { width: 112 }]}>SỐ LỚP</Text>
                    <Text
                      style={[
                        s.columnLabel,
                        { width: 142, textAlign: "right" },
                      ]}
                    >
                      THAO TÁC
                    </Text>
                  </View>
                )}
                {loading ? (
                  <ActivityIndicator style={{ padding: 60 }} color={green} />
                ) : visible.length === 0 ? (
                  <View style={s.emptyState}>
                    <Text style={s.emptyNumber}>00</Text>
                    <Text style={s.emptyTitle}>
                      {search
                        ? "Không tìm thấy giảng viên"
                        : "Chưa có giảng viên"}
                    </Text>
                    <Text style={s.muted}>
                      {search
                        ? "Thử một mã hoặc tên khác."
                        : "Thêm hồ sơ đầu tiên để bắt đầu."}
                    </Text>
                  </View>
                ) : (
                  visible.map((row, index) => (
                    <View
                      key={row.IDGV}
                      style={[s.record, !wide && s.recordSmall]}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={"Xem " + row.Fullname}
                        onPress={() => setDetail(row)}
                        style={s.recordPerson}
                      >
                        <Image source={{ uri: row.Image }} style={s.avatar} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.personName} numberOfLines={1}>
                            {row.Fullname}
                          </Text>
                          {!wide && (
                            <Text style={s.personCode}>
                              {row.IDGV} · {row.SumClass} lớp
                            </Text>
                          )}
                        </View>
                      </Pressable>
                      {wide ? (
                        <>
                          <Text style={s.codeCell}>{row.IDGV}</Text>
                          <Text style={s.classCell}>{row.SumClass} lớp</Text>
                        </>
                      ) : null}
                      <View style={[s.rowActions, !wide && s.rowActionsSmall]}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Sửa"
                          onPress={() => openEditor(row)}
                          style={s.actionButton}
                        >
                          <Feather name="edit-2" size={15} color={ink} />
                          {wide && <Text style={s.actionText}>Sửa</Text>}
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Xóa"
                          onPress={() => setRemoving(row)}
                          style={s.actionButton}
                        >
                          <Feather name="trash-2" size={15} color="#a8514b" />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
                <View style={s.listFooter}>
                  <Text style={s.caption}>
                    Trang {current} / {pages}
                  </Text>
                  <View style={s.paging}>
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
            </ScrollView>
          </View>
        </View>
      )}
      <Modal
        visible={editor}
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        transparent={Platform.OS === "web"}
        onRequestClose={() => {
          if (!busy) setEditor(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={Platform.OS === "web" ? s.overlay : s.nativeEditorOverlay}
        >
          <ScrollView
            contentContainerStyle={
              Platform.OS === "web" ? s.modalScroll : s.nativeModalScroll
            }
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <View
              style={
                Platform.OS === "web"
                  ? [s.modal, wide && s.modalWide]
                  : s.nativeEditor
              }
            >
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.sectionKicker}>HỒ SƠ GIẢNG VIÊN</Text>
                  <Text style={s.modalTitle}>
                    {editing ? "Chỉnh sửa giảng viên" : "Thêm giảng viên"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đóng biểu mẫu"
                  onPress={() => setEditor(false)}
                  style={s.closeButton}
                >
                  <Feather name="x" size={20} color={ink} />
                </Pressable>
              </View>
              <View style={s.formBody}>
                <Text style={s.formSection}>Thông tin cơ bản</Text>
                <View style={s.generatedCode}>
                  <Text style={s.label}>Mã giảng viên</Text>
                  <Text style={s.generatedCodeValue}>
                    {editing || "Tự tạo sau khi lưu"}
                  </Text>
                </View>
                <Field
                  label="Họ và tên (Fullname)"
                  value={form.Fullname}
                  onChange={(v) =>
                    setForm((current) => ({ ...current, Fullname: v }))
                  }
                />
                <Field
                  label="Tổng số lớp (SumClass)"
                  value={form.SumClass}
                  onChange={(v) =>
                    setForm((current) => ({ ...current, SumClass: v }))
                  }
                  numeric
                />
                <View style={s.formDivider} />
                <Text style={s.formSection}>Ảnh giảng viên</Text>
                <View style={s.photoRow}>
                  {form.Image ? (
                    <Image source={{ uri: form.Image }} style={s.preview} />
                  ) : (
                    <View style={[s.preview, s.previewEmpty]}>
                      <Feather name="camera" size={25} color={muted} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={s.photoActions}>
                      <Button
                        title="Chọn ảnh"
                        quiet
                        icon="upload"
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
                    <Text style={s.caption}>
                      PNG, JPEG hoặc WebP · tối đa 2 MB
                    </Text>
                  </View>
                </View>
                {!!formError && (
                  <Text accessibilityRole="alert" style={s.error}>
                    {formError}
                  </Text>
                )}
                <View style={s.formFooter}>
                  <Button
                    title="Hủy"
                    quiet
                    disabled={busy}
                    onPress={() => setEditor(false)}
                  />
                  <Button
                    title={busy ? "Đang lưu…" : "Lưu giảng viên"}
                    disabled={busy}
                    onPress={() => void save()}
                    icon="check"
                  />
                </View>
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
          <View style={[s.modal, s.detailModal]}>
            {detail && (
              <>
                <View style={s.modalHeader}>
                  <Text style={s.sectionKicker}>HỒ SƠ GIẢNG VIÊN</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Đóng hồ sơ"
                    onPress={() => setDetail(null)}
                  >
                    <Feather name="x" size={20} color={ink} />
                  </Pressable>
                </View>
                <Image source={{ uri: detail.Image }} style={s.detailImage} />
                <Text style={s.detailName}>{detail.Fullname}</Text>
                <View style={s.detailLine}>
                  <Text style={s.detailLabel}>Mã giảng viên</Text>
                  <Text style={s.detailValue}>{detail.IDGV}</Text>
                </View>
                <View style={s.detailLine}>
                  <Text style={s.detailLabel}>Số lớp phụ trách</Text>
                  <Text style={s.detailValue}>{detail.SumClass}</Text>
                </View>
                <Button title="Đóng" quiet onPress={() => setDetail(null)} />
              </>
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
          <View style={[s.modal, s.confirmModal]}>
            <View style={s.warningIcon}>
              <Feather name="trash-2" size={20} color="#a8514b" />
            </View>
            <Text style={s.confirmTitle}>Xóa giảng viên?</Text>
            <Text style={s.confirmBody}>
              Bạn sẽ xóa hồ sơ {removing?.Fullname} ({removing?.IDGV}). Thao tác
              này không thể hoàn tác.
            </Text>
            <View style={s.formFooter}>
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
const ink = "#202a43",
  muted = "#68758c",
  green = "#355acb",
  line = "#dfe5f1";
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f7fb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  button: {
    minHeight: 42,
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 7,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  quiet: { backgroundColor: "#edf2ff" },
  label: { fontSize: 13, fontWeight: "600", color: ink, marginBottom: 8 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#d3dceb",
    borderRadius: 6,
    backgroundColor: "#fff",
    fontSize: 15,
    color: ink,
    fontFamily: "PlusJakartaSans",
    paddingHorizontal: 13,
  },
  loginShell: { flex: 1, backgroundColor: "#fff" },
  mark: {
    width: 38,
    height: 38,
    backgroundColor: green,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
  },
  loginArea: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  loginForm: { width: "100%", maxWidth: 400 },
  mobileLoginBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 42,
  },
  mobileBrandText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
    color: ink,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: green,
    marginBottom: 10,
  },
  loginTitle: { fontSize: 34, fontWeight: "700", color: ink, marginBottom: 8 },
  muted: { fontSize: 14, color: muted, lineHeight: 22 },
  caption: { fontSize: 12, color: muted, lineHeight: 18 },
  loginSupport: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 28,
  },
  appShell: { flex: 1, flexDirection: "row" },
  mainArea: { flex: 1 },
  mobileTop: {
    height: 60,
    backgroundColor: "white",
    borderBottomWidth: 2,
    borderBottomColor: green,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mobileTopBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  mobileMark: {
    backgroundColor: green,
    width: 30,
    height: 30,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileTopText: {
    fontSize: 13,
    color: ink,
    fontWeight: "800",
    letterSpacing: 1,
  },
  mobileLogout: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#cdd8fa",
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#f4f6ff",
  },
  logoutLabel: { color: green, fontSize: 12, fontWeight: "700" },
  content: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 42,
    paddingTop: 44,
    paddingBottom: 60,
  },
  contentSmall: { paddingHorizontal: 16, paddingTop: 27 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 31,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: ink,
    marginBottom: 9,
    letterSpacing: -0.7,
  },
  summary: { color: muted, fontSize: 14 },
  summaryDot: { color: "#e69750" },
  mobileAdd: { marginBottom: 19, alignSelf: "flex-start" },
  listSurface: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: line,
    borderRadius: 8,
    overflow: "hidden",
  },
  toolbar: { padding: 17, flexDirection: "row", gap: 12 },
  toolbarSmall: { padding: 12 },
  search: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: "#d3dceb",
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: ink,
    fontFamily: "PlusJakartaSans",
    padding: 0,
  },
  refresh: {
    height: 42,
    minWidth: 42,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  refreshText: { fontSize: 13, color: ink, fontWeight: "600" },
  filterBar: {
    paddingHorizontal: 18,
    paddingBottom: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  filterLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "700",
    color: muted,
    marginRight: 5,
  },
  sortOption: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 4 },
  sortSelected: { backgroundColor: "#e8eeff" },
  sortText: { fontSize: 12, color: muted },
  sortTextSelected: { color: green, fontWeight: "700" },
  resultCount: { marginLeft: "auto", fontSize: 12, color: muted },
  tableHead: {
    height: 38,
    paddingHorizontal: 20,
    backgroundColor: "#f4f6f7",
    flexDirection: "row",
    alignItems: "center",
  },
  columnLabel: {
    fontSize: 10,
    color: "#7b8a94",
    letterSpacing: 1,
    fontWeight: "700",
  },
  record: {
    minHeight: 74,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: line,
    flexDirection: "row",
    alignItems: "center",
  },
  recordSmall: { minHeight: 78, paddingHorizontal: 14 },
  recordPerson: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    minWidth: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e4ebe8",
  },
  personName: { fontSize: 14, fontWeight: "600", color: ink },
  personCode: { fontSize: 12, color: muted, marginTop: 4 },
  codeCell: { width: 145, color: muted, fontSize: 13 },
  classCell: { width: 112, color: ink, fontSize: 13 },
  rowActions: {
    width: 142,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  rowActionsSmall: { width: 82 },
  actionButton: {
    minWidth: 32,
    height: 32,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 6,
  },
  actionText: { fontSize: 12, color: ink },
  listFooter: {
    minHeight: 61,
    borderTopWidth: 1,
    borderColor: line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 17,
  },
  paging: { flexDirection: "row", gap: 7 },
  emptyState: { padding: 55, alignItems: "center", gap: 9 },
  emptyNumber: { fontSize: 40, fontWeight: "300", color: "#bdcbd1" },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: ink },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(16,31,42,.56)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  generatedCode: {
    marginBottom: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 6,
    backgroundColor: "#f6f8f8",
  },
  generatedCodeValue: { color: ink, fontSize: 14 },
  nativeEditorOverlay: { flex: 1, backgroundColor: "white" },
  nativeModalScroll: { flexGrow: 1, paddingBottom: 40 },
  nativeEditor: { width: "100%", backgroundColor: "white" },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "white",
    borderRadius: 9,
    overflow: "hidden",
  },
  modalWide: { maxWidth: 550, width: 550 },
  modalHeader: {
    paddingHorizontal: 25,
    paddingTop: 23,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderColor: line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: { fontSize: 22, fontWeight: "700", color: ink },
  closeButton: { padding: 4 },
  formBody: { padding: 25 },
  formSection: {
    color: ink,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 22,
  },
  preview: {
    width: 76,
    height: 76,
    borderRadius: 6,
    backgroundColor: "#eef2f3",
  },
  previewEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dbe2e6",
    borderStyle: "dashed",
  },
  photoActions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  formDivider: { height: 1, backgroundColor: line, marginBottom: 22 },
  formFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 8,
  },
  detailModal: { paddingBottom: 24 },
  detailImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignSelf: "center",
    marginTop: 23,
    marginBottom: 12,
  },
  detailName: {
    fontSize: 21,
    fontWeight: "700",
    color: ink,
    textAlign: "center",
    marginBottom: 24,
  },
  detailLine: {
    marginHorizontal: 25,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderColor: line,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: { color: muted, fontSize: 13 },
  detailValue: { color: ink, fontSize: 13, fontWeight: "600" },
  confirmModal: { padding: 25 },
  warningIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f8ecea",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: ink,
    marginBottom: 10,
  },
  confirmBody: { fontSize: 14, lineHeight: 22, color: muted, marginBottom: 20 },
  error: {
    color: "#a3423c",
    backgroundColor: "#fff2f0",
    padding: 12,
    borderRadius: 5,
    marginBottom: 14,
    fontSize: 13,
  },
  success: {
    color: green,
    backgroundColor: "#eaf5f2",
    padding: 12,
    borderRadius: 5,
    marginBottom: 14,
    fontSize: 13,
  },
});
