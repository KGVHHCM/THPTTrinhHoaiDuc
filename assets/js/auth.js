// ============================================================
// FILE: assets/js/auth.js
// MỤC ĐÍCH: Xử lý toàn bộ logic liên quan đến ĐĂNG NHẬP / ĐĂNG XUẤT
// / KIỂM TRA QUYỀN TRUY CẬP cho khu vực admin.
//
// File này PHẢI được nhúng SAU supabase-client.js trong HTML,
// vì mọi hàm bên dưới đều dùng biến toàn cục "supabaseClient"
// đã được tạo sẵn ở file đó.
// ============================================================

// ------------------------------------------------------------
// HÀM: dangNhap
// MỤC ĐÍCH: Gửi yêu cầu đăng nhập tới Supabase Auth bằng email + mật khẩu
//
// THAM SỐ:
//   - email   : chuỗi, địa chỉ email của tài khoản admin
//   - matKhau : chuỗi, mật khẩu tương ứng với email trên
//
// TRẢ VỀ: 1 Promise, khi hoàn tất trả về 1 object gồm:
//   - thanhCong  : true nếu đăng nhập đúng, false nếu sai
//   - thongBaoLoi: chuỗi mô tả lỗi (rỗng nếu thanhCong = true),
//                   dùng để hiển thị thông báo cho người dùng
// ------------------------------------------------------------
async function dangNhap(email, matKhau) {
  // Gọi hàm signInWithPassword() của Supabase Auth.
  // Hàm này tự động: kiểm tra email/mật khẩu có khớp trong hệ thống
  // không; nếu đúng, Supabase sẽ tạo ra 1 "phiên đăng nhập" (session)
  // và TỰ ĐỘNG lưu session đó vào bộ nhớ trình duyệt (localStorage),
  // nhờ vậy lần sau mở lại trang admin sẽ không bị bắt đăng nhập lại
  // ngay (cho đến khi session hết hạn hoặc người dùng đăng xuất).
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: matKhau,
  });

  // Nếu Supabase trả về lỗi (VD: sai mật khẩu, email không tồn tại,
  // tài khoản chưa được tạo...) thì "error" sẽ khác null
  if (error) {
    // Trả về kết quả thất bại, kèm nội dung lỗi gốc từ Supabase
    // để hiển thị lên giao diện cho người dùng biết vì sao đăng nhập lỗi
    return {
      thanhCong: false,
      thongBaoLoi: "Đăng nhập thất bại: " + error.message,
    };
  }

  // Không có lỗi -> đăng nhập thành công.
  // "data.session" chứa thông tin phiên vừa tạo, nhưng ở đây không
  // cần dùng trực tiếp vì Supabase đã tự lưu session vào trình duyệt rồi.
  return {
    thanhCong: true,
    thongBaoLoi: "",
  };
}

// ------------------------------------------------------------
// HÀM: dangXuat
// MỤC ĐÍCH: Xoá phiên đăng nhập hiện tại (đăng xuất), sau đó
// tự động chuyển hướng trình duyệt về trang đăng nhập
//
// THAM SỐ: không có
// TRẢ VỀ: không có — hàm tự điều hướng sang trang khác khi xong việc
// ------------------------------------------------------------
async function dangXuat() {
  // Gọi hàm signOut() của Supabase Auth để huỷ session đang được
  // lưu trong trình duyệt (localStorage). Sau lệnh này, mọi yêu cầu
  // ghi dữ liệu (thêm/sửa/xoá bài viết) sẽ bị RLS chặn lại vì không
  // còn được xem là "authenticated" (đã đăng nhập) nữa.
  await supabaseClient.auth.signOut();

  // Sau khi đăng xuất xong, chuyển hướng trình duyệt về trang login.
  // Dùng đường dẫn tương đối "login.html" vì hàm này chỉ được gọi
  // từ các trang nằm CÙNG thư mục admin/ với login.html.
  window.location.href = "login.html";
}

// ------------------------------------------------------------
// HÀM: layPhienDangNhap
// MỤC ĐÍCH: Kiểm tra hiện tại trình duyệt có đang giữ 1 phiên
// đăng nhập hợp lệ hay không
//
// THAM SỐ: không có
// TRẢ VỀ: 1 Promise, resolve về:
//   - object session (nếu đang đăng nhập và session còn hạn)
//   - null (nếu chưa đăng nhập, hoặc session đã hết hạn)
// ------------------------------------------------------------
async function layPhienDangNhap() {
  // getSession() đọc session đang lưu trong trình duyệt (nếu có)
  // và Supabase tự kiểm tra giúp session đó còn hạn sử dụng hay không
  const { data } = await supabaseClient.auth.getSession();

  // data.session sẽ là null nếu chưa từng đăng nhập, hoặc session
  // đã hết hạn (Supabase tự xoá session hết hạn khi gọi hàm này)
  return data.session;
}

// ------------------------------------------------------------
// HÀM: baoVeTrangAdmin
// MỤC ĐÍCH: Dùng ở ĐẦU các trang admin (TRỪ login.html) để chặn
// người CHƯA đăng nhập truy cập — nếu phát hiện chưa đăng nhập,
// hàm sẽ tự động điều hướng về trang login.html ngay lập tức.
//
// CÁCH DÙNG: gọi hàm này ngay khi trang admin vừa tải xong,
// ví dụ trong thẻ <script> ở cuối file admin/dashboard.html:
//     baoVeTrangAdmin();
//
// THAM SỐ: không có
// TRẢ VỀ: không có — hàm tự chuyển trang nếu phát hiện chưa đăng nhập
// ------------------------------------------------------------
async function baoVeTrangAdmin() {
  // Lấy phiên đăng nhập hiện tại (nếu có)
  const session = await layPhienDangNhap();

  // Nếu KHÔNG có session (session = null) -> nghĩa là chưa đăng nhập
  // hoặc phiên đăng nhập đã hết hạn
  if (!session) {
    // Chuyển hướng ngay lập tức về trang đăng nhập,
    // KHÔNG cho phép xem bất kỳ nội dung nào của trang admin hiện tại
    window.location.href = "login.html";
  }

  // Nếu có session hợp lệ -> hàm kết thúc bình thường,
  // trang admin tiếp tục hiển thị nội dung như đã viết sẵn trong HTML
}