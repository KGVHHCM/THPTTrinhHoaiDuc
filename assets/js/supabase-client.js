// ============================================================
// FILE: assets/js/supabase-client.js
// MỤC ĐÍCH: Khởi tạo 1 kết nối DUY NHẤT tới Supabase, dùng chung
// cho TOÀN BỘ website (cả trang public và trang admin).
//
// File này PHẢI được nhúng vào HTML SAU thư viện Supabase JS
// (thẻ <script src="https://unpkg.com/@supabase/supabase-js@2">)
// và TRƯỚC các file JS khác (auth.js, posts.js, gallery.js, tour.js...)
// vì các file đó đều cần dùng biến "supabaseClient" được tạo ra ở đây.
// ============================================================

// ------------------------------------------------------------
// LƯU Ý QUAN TRỌNG VỀ BẢO MẬT (đọc kỹ trước khi deploy):
//
// - SUPABASE_URL và SUPABASE_ANON_KEY lấy trong Dashboard Supabase
//   của bạn, tại: Project Settings > API > Project URL / anon public key
//
// - SUPABASE_ANON_KEY là "khóa công khai" (anon/public key),
//   KHÔNG PHẢI "service_role key". Tuyệt đối KHÔNG bao giờ đưa
//   service_role key vào code chạy ở trình duyệt, vì service_role
//   key có toàn quyền đọc/ghi mọi dữ liệu, bỏ qua mọi luật bảo mật.
//
// - Việc bảo mật dữ liệu của website này KHÔNG dựa vào việc giấu
//   URL hay anon key (2 giá trị này ai mở "View Page Source" trên
//   trình duyệt cũng nhìn thấy được). Bảo mật thật sự nằm ở RLS
//   (Row Level Security) đã được bật sẵn trong file docs/schema.sql
//   — RLS quyết định "ai được đọc gì, ai được ghi gì" ở phía server,
//   dù người dùng có thấy được anon key thì cũng không vượt qua được.
// ------------------------------------------------------------

// Địa chỉ (URL) của project Supabase — THAY bằng URL thật của bạn
// Ví dụ dạng: "https://abcdefghijk.supabase.co"
const SUPABASE_URL = "https://ccxvdcmkyzxwgmywkpmy.supabase.co";

// Khóa công khai (anon key) của project Supabase — THAY bằng key thật của bạn
const SUPABASE_ANON_KEY = "sb_publishable_oumaBw0e2zruIiEOildffw_MG343mzR";

// Hàm createClient() được cung cấp sẵn bởi thư viện Supabase JS
// (window.supabase là biến toàn cục do thư viện tạo ra sau khi
// thẻ <script src="...supabase-js@2"> chạy xong).
// Kết quả trả về là 1 "đối tượng client" — dùng đối tượng này để
// gọi MỌI thao tác với Supabase: đọc/ghi database, đăng nhập,
// đăng xuất, upload file lên storage...
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Gán supabaseClient vào biến toàn cục (window) để các file JS khác
// (auth.js, posts.js, gallery.js, tour.js...) có thể dùng trực tiếp
// biến tên "supabaseClient" ở bất kỳ file nào, mà không cần cơ chế
// import/export phức tạp của module — phù hợp với dự án dùng
// JS thuần, không qua bước build (bundler) như Webpack/Vite.
window.supabaseClient = supabaseClient;
