const { test, expect } = require("@playwright/test");
test("Demo: đăng nhập, thêm ảnh, sửa, tìm kiếm, xem chi tiết và xóa", async ({
  page,
}) => {
  const errors=[]; page.on("pageerror", e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Chào mừng trở lại")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/01-login.png",
    fullPage: true,
  });
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("admin");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByText("Tên đăng nhập hoặc mật khẩu không đúng."),
  ).toBeVisible();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Admin@123456");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByText("Nguyễn Minh Anh", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/02-dashboard.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Thêm giảng viên", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lưu giảng viên", exact: true })
    .click();
  await expect(
    page.getByText("Mã giảng viên gồm 2–20 chữ, số, _ hoặc -."),
  ).toBeVisible();
  await page.getByLabel("Mã giảng viên (IDGV)", { exact: true }).fill("GVTEST");
  await page
    .getByLabel("Họ và tên (Fullname)", { exact: true })
    .fill("Nguyễn Demo Expo");
  await page.getByLabel("Tổng số lớp (SumClass)", { exact: true }).fill("7");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Chọn ảnh", exact: true }).click();
  await (await chooser).setFiles("docs/sample-avatar.png");
  await page.screenshot({
    path: "docs/screenshots/03-add.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Lưu giảng viên", exact: true })
    .click();
  await expect(
    page.getByText("Đã thêm giảng viên.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Tìm giảng viên", { exact: true }).fill("nguyen demo");
  await expect(
    page.getByText("Nguyễn Demo Expo", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sửa", exact: true }).click();
  await page.getByLabel("Tổng số lớp (SumClass)", { exact: true }).fill("15");
  await page
    .getByRole("button", { name: "Lưu giảng viên", exact: true })
    .click();
  await expect(page.getByText("15 lớp", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel("Tìm giảng viên", { exact: true }).fill("GVTEST");
  await expect(page.getByText("15 lớp", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Xem Nguyễn Demo Expo", exact: true })
    .click();
  await page.screenshot({
    path: "docs/screenshots/04-detail.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Tìm giảng viên", { exact: true }).fill("");
  await page.screenshot({
    path: "docs/screenshots/05-mobile-web.png",
    fullPage: true,
  });
  await page.getByLabel("Tìm giảng viên", { exact: true }).fill("GVTEST");
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await page.getByRole("button", { name: "Giữ lại", exact: true }).click();
  await expect(
    page.getByText("Nguyễn Demo Expo", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.getByText("Không tìm thấy giảng viên")).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.getByText("Chào mừng trở lại")).toBeVisible();
  expect(errors).toEqual([]);
});
