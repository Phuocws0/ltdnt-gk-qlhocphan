import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
const host = Constants.expoConfig?.hostUri?.split(":")[0] || "localhost";
export const API =
  process.env.EXPO_PUBLIC_API_URL ||
  `http://${Platform.OS === "web" ? "localhost" : host}:4000/api`;
export const storage = {
  get: async () =>
    Platform.OS === "web"
      ? sessionStorage.getItem("qlhp-token")
      : SecureStore.getItemAsync("qlhp-token"),
  set: async (t: string) => {
    if (Platform.OS === "web") sessionStorage.setItem("qlhp-token", t);
    else await SecureStore.setItemAsync("qlhp-token", t);
  },
  clear: async () => {
    if (Platform.OS === "web") sessionStorage.removeItem("qlhp-token");
    else await SecureStore.deleteItemAsync("qlhp-token");
  },
};
export async function request(
  path: string,
  token: string = "",
  method = "GET",
  body?: unknown,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(API + path, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.message || "Yêu cầu thất bại.") as Error & {
        status: number;
      };
      error.status = res.status;
      throw error;
    }
    return data;
  } catch (e) {
    if (e instanceof TypeError || (e as Error).name === "AbortError")
      throw new Error(
        "Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
