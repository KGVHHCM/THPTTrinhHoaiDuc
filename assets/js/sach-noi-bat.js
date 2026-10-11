// ============================================================
// FILE: assets/js/sach-noi-bat.js
// MỤC ĐÍCH: Lấy danh sách "sách nổi bật" (bảng Supabase riêng
// "sach_noi_bat") và tạo HTML cho từng thẻ trong vòng xoay 3D ở
// khu vực "Sách nổi bật" trên thu-vien.html. Tách file riêng khỏi
// sach.js (bảng "sach" dùng cho carousel "Sách nên đọc") vì đây là
// 2 bảng dữ liệu HOÀN TOÀN ĐỘC LẬP, theo đúng yêu cầu ban đầu.
//
// PHỤ THUỘC: cần supabase-client.js (biến supabaseClient) và
// render-card.js (hàm thoatHtml) đã được nhúng TRƯỚC file này.
//
// GHI CHÚ (bổ sung): file này còn chứa phần ĐIỀU KHIỂN VÒNG XOAY
// bằng JavaScript (mục cuối file) — thay cho @keyframes CSS thuần
// trước đây — để khi rê chuột vào, vòng xoay CHẬM DẦN rồi mới dừng
// hẳn, và khi rê chuột ra thì TĂNG TỐC DẦN trở lại, thay vì
// dừng/chạy khựng ngay lập tức.
// ============================================================

// ------------------------------------------------------------
// HÀM: layDanhSachSachNoiBat
// MỤC ĐÍCH: Truy vấn bảng "sach_noi_bat", chỉ lấy sách có
// da_xuat_ban = true, sắp xếp theo cột thu_tu tăng dần.
//
// TRẢ VỀ: { thanhCong: boolean, mangSach: Array }
// ------------------------------------------------------------
async function layDanhSachSachNoiBat() {
  const { data, error } = await supabaseClient
    .from("sach_noi_bat")
    .select("*")
    .eq("da_xuat_ban", true)
    .order("thu_tu", { ascending: true });

  if (error) {
    console.error("Lỗi khi tải danh sách sách nổi bật:", error);
    return { thanhCong: false, mangSach: [] };
  }

  return { thanhCong: true, mangSach: data || [] };
}

// ------------------------------------------------------------
// HÀM: taoHtmlTheSachNoiBat
// MỤC ĐÍCH: Sinh HTML cho 1 thẻ trong vòng xoay 3D. Mỗi thẻ CẦN
// biến CSS "--index" (vị trí trong vòng tròn, 0..tổngSo-1) để CSS
// tính góc rotateY tương ứng — biến "--quantity" (tổng số thẻ)
// được đặt 1 LẦN DUY NHẤT trên phần tử cha ".sach-noibat-vong"
// (xem veVongXoaySachNoiBat() trong thu-vien.html), KHÔNG lặp lại
// ở từng thẻ.
//
// THAM SỐ:
//   sach  - 1 bản ghi từ bảng "sach_noi_bat"
//           (id, ten_sach, tac_gia, anh_bia, link_doc, thu_tu, da_xuat_ban)
//   index - vị trí của thẻ này trong vòng tròn (số nguyên, bắt đầu từ 0)
// TRẢ VỀ: chuỗi HTML của 1 thẻ
// ------------------------------------------------------------
// Đổi URL ảnh thành dạng an toàn để nhét vào url('...') trong CSS
function lamAnToanUrlCss(url) {
  const bang = { "'": "%27", '"': "%22", "(": "%28", ")": "%29", " ": "%20", "\\": "%5C" };
  return String(url).replace(/['"() \\]/g, (kyTu) => bang[kyTu]);
}

function taoHtmlTheSachNoiBat(sach, index) {
  // Tên sách có thể để trống -> luôn quy về chuỗi rỗng để tránh lỗi null
  const tenSach = sach.ten_sach || "";

  const anhBia = sach.anh_bia
    ? `<img src="${thoatHtml(sach.anh_bia)}" alt="${thoatHtml(tenSach)}" loading="lazy" />`
    : `<div class="sach-noibat-anh-rong" aria-hidden="true">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
           <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5v-18Z" />
           <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
         </svg>
       </div>`;

  // Chỉ hiện dòng tên khi có tên
  const dongTen = tenSach
    ? `<span class="sach-noibat-ten">${thoatHtml(tenSach)}</span>`
    : "";

  const noiDungThe = `
    <div class="sach-noibat-anh">${anhBia}</div>
    ${dongTen}
  `;

  const noiDungBoc = sach.link_doc
    ? `<a href="${thoatHtml(sach.link_doc)}" target="_blank" rel="noopener noreferrer" class="sach-noibat-lienket">${noiDungThe}</a>`
    : `<div class="sach-noibat-lienket sach-noibat-khong-bam">${noiDungThe}</div>`;

  const kieuNenGay = sach.anh_bia
    ? ` style="background-image:url('${thoatHtml(lamAnToanUrlCss(sach.anh_bia))}')"`
    : "";

  // Gáy tròn = 6 mảnh phẳng xếp thành nửa hình trụ
  let cacManhGay = "";
  for (let k = 0; k < 6; k++) {
    cacManhGay += `<span class="sach-noibat-gay-manh" style="--k:${k}"><span class="sach-noibat-gay-nen"${kieuNenGay}></span></span>`;
  }

  // Chữ trên gáy sách: để trống nếu không có tên
  const chuGay = tenSach ? `<span>${thoatHtml(tenSach)}</span>` : "";

  return `
    <div class="sach-noibat-the" style="--index: ${index};" data-anh-bia="${thoatHtml(sach.anh_bia || "")}">
      <div class="sach-noibat-khoi">
        <div class="sach-noibat-mat sach-noibat-mat-truoc">${noiDungBoc}</div>
        <div class="sach-noibat-mat sach-noibat-mat-sau"></div>
        ${cacManhGay}
        <div class="sach-noibat-mat sach-noibat-gay-chu">${chuGay}</div>
        <div class="sach-noibat-mat sach-noibat-mat-mep"></div>
        <div class="sach-noibat-mat sach-noibat-mat-tren"></div>
        <div class="sach-noibat-mat sach-noibat-mat-duoi"></div>
      </div>
    </div>`;
}
// ============================================================
// CÁC HÀM DƯỚI ĐÂY DÙNG RIÊNG CHO ADMIN (admin/quan-ly-sach.html,
// admin/sach-noi-bat-form.html). Khác với layDanhSachSachNoiBat()
// ở trên (chỉ lấy sách đã xuất bản), các hàm này thao tác trực tiếp
// lên bảng không lọc da_xuat_ban, vì admin cần thấy/sửa cả sách ẩn.
// ============================================================

// ------------------------------------------------------------
// HÀM: layToanBoSachNoiBatAdmin
// MỤC ĐÍCH: Lấy TẤT CẢ sách nổi bật (không lọc da_xuat_ban), sắp
// xếp theo thu_tu tăng dần, dùng cho bảng danh sách trong
// quan-ly-sach.html
// ------------------------------------------------------------
async function layToanBoSachNoiBatAdmin() {
  const { data, error } = await supabaseClient
    .from("sach_noi_bat")
    .select("*")
    .order("thu_tu", { ascending: true });

  if (error) {
    console.error("Lỗi khi tải toàn bộ sách nổi bật (admin):", error);
    return { thanhCong: false, mangSach: [] };
  }

  return { thanhCong: true, mangSach: data || [] };
}

// ------------------------------------------------------------
// HÀM: layMotSachNoiBat
// MỤC ĐÍCH: Lấy đúng 1 bản ghi theo id, dùng để đổ dữ liệu lên form
// khi admin bấm "Sửa" trong quan-ly-sach.html
//
// THAM SỐ: id - id (uuid) của sách cần lấy
// TRẢ VỀ: { thanhCong: boolean, sach: object|null }
// ------------------------------------------------------------
async function layMotSachNoiBat(id) {
  const { data, error } = await supabaseClient
    .from("sach_noi_bat")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Lỗi khi tải chi tiết sách nổi bật:", error);
    return { thanhCong: false, sach: null };
  }

  return { thanhCong: true, sach: data };
}

// ------------------------------------------------------------
// HÀM: luuSachNoiBat
// MỤC ĐÍCH: Lưu 1 bản ghi — có "id" thì UPDATE, không có thì INSERT.
// Gộp chung thêm/sửa vào 1 hàm để sach-noi-bat-form.html dùng lại
// được cho cả 2 chế độ.
//
// THAM SỐ:
//   duLieu - object chứa các cột cần lưu (ten_sach, tac_gia, anh_bia,
//            link_doc, thu_tu, da_xuat_ban)
//   id     - id của sách cần sửa; truyền null/undefined nếu là thêm mới
// TRẢ VỀ: { thanhCong: boolean, loi: string|null }
// ------------------------------------------------------------
async function luuSachNoiBat(duLieu, id) {
  let error;

  if (id) {
    ({ error } = await supabaseClient.from("sach_noi_bat").update(duLieu).eq("id", id));
  } else {
    ({ error } = await supabaseClient.from("sach_noi_bat").insert(duLieu));
  }

  if (error) {
    console.error("Lỗi khi lưu sách nổi bật:", error);
    return { thanhCong: false, loi: error.message };
  }

  return { thanhCong: true, loi: null };
}

// ------------------------------------------------------------
// HÀM: xoaSachNoiBat
// MỤC ĐÍCH: Xoá hẳn 1 bản ghi khỏi bảng "sach_noi_bat" theo id
//
// THAM SỐ: id - id của sách cần xoá
// TRẢ VỀ: { thanhCong: boolean }
// ------------------------------------------------------------
async function xoaSachNoiBat(id) {
  const { error } = await supabaseClient.from("sach_noi_bat").delete().eq("id", id);

  if (error) {
    console.error("Lỗi khi xoá sách nổi bật:", error);
    return { thanhCong: false };
  }

  return { thanhCong: true };
}

// ============================================================
// ĐIỀU KHIỂN VÒNG XOAY 3D "SÁCH NỔI BẬT" BẰNG JAVASCRIPT
// (thay cho @keyframes CSS thuần trước đây — xem mục 31 trong
// style.css: animation: none; rotateY(var(--goc-xoay)))
//
// MỤC ĐÍCH: khi rê chuột vào vòng xoay, tốc độ xoay CHẬM DẦN rồi
// mới dừng hẳn (thay vì dừng khựng ngay lập tức như
// "animation-play-state: paused"); khi rê chuột ra, tốc độ TĂNG
// DẦN trở lại bình thường thay vì chạy vọt lại ngay lập tức.
//
// CÁCH HOẠT ĐỘNG: mỗi phần tử ".sach-noibat-vong" tự lưu 1 góc xoay
// hiện tại + 1 tốc độ xoay hiện tại (độ/giây). Mỗi khung hình
// (requestAnimationFrame), tốc độ hiện tại được nội suy (lerp) dần
// về tốc độ MỤC TIÊU (bình thường khi chuột ở ngoài, 0 khi đang
// hover) -> tạo cảm giác tăng/giảm tốc mượt mà. Góc xoay tích luỹ
// được ghi vào biến CSS "--goc-xoay" trên chính phần tử đó.
//
// Chỉ chạy sau khi trang đã tải xong DOM và (nên) sau khi
// veVongXoaySachNoiBat() trong thu-vien.html đã chèn xong các thẻ
// sách vào .sach-noibat-vong, để querySelectorAll tìm đúng phần tử.
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Tốc độ bình thường: giữ đúng nhịp cũ (1 vòng / 22 giây)
  const TOC_DO_BINH_THUONG = 360 / 22; // độ/giây

  // Hệ số nội suy mỗi khung hình: càng NHỎ thì chậm dần/tăng dần
  // càng "từ từ" (mượt, kéo dài lâu hơn); càng LỚN thì đổi tốc độ
  // càng nhanh, gần giống dừng khựng. 0.045 cho cảm giác lướt êm.
  const HE_SO_NOI_SUY = 0.045;

  document.querySelectorAll(".sach-noibat-vong").forEach((vong) => {
    let gocHienTai = 0;
    let tocDoHienTai = TOC_DO_BINH_THUONG;
    let tocDoMucTieu = TOC_DO_BINH_THUONG;
    let dangHover = false;
    let thoiDiemTruoc = null;

    vong.addEventListener("mouseenter", () => {
      dangHover = true;
      tocDoMucTieu = 0; // ra lệnh "chậm dần về 0", KHÔNG dừng ngay
    });

    vong.addEventListener("mouseleave", () => {
      dangHover = false;
      tocDoMucTieu = TOC_DO_BINH_THUONG; // ra lệnh "tăng dần trở lại"
    });

    function veKhungHinh(thoiDiemHienTai) {
      if (thoiDiemTruoc === null) thoiDiemTruoc = thoiDiemHienTai;
      const denta = (thoiDiemHienTai - thoiDiemTruoc) / 1000; // giây
      thoiDiemTruoc = thoiDiemHienTai;

      // Nội suy tốc độ hiện tại về tốc độ mục tiêu mỗi khung hình
      tocDoHienTai += (tocDoMucTieu - tocDoHienTai) * HE_SO_NOI_SUY;

      // Khi đang hover và tốc độ đã rất nhỏ, chốt hẳn về 0 để tránh
      // xoay "lắt lay" vô tận do sai số thập phân của phép nội suy
      if (dangHover && Math.abs(tocDoHienTai) < 0.02) {
        tocDoHienTai = 0;
      }

      gocHienTai += tocDoHienTai * denta;
      vong.style.setProperty("--goc-xoay", `${gocHienTai}deg`);

      requestAnimationFrame(veKhungHinh);
    }

    requestAnimationFrame(veKhungHinh);
  });
}); 

// ============================================================
// MÀU BÌA SAU: lấy màu chủ đạo từ ảnh bìa trước, gán vào biến CSS
// "--mau-bia-sau" trên từng thẻ sách. Dùng MutationObserver nên
// không phụ thuộc thời điểm thu-vien.html chèn thẻ vào trang.
// ============================================================
function layMauChuDao(urlAnh, callback) {
  const anh = new Image();
  anh.crossOrigin = "anonymous"; // cần để đọc pixel ảnh từ Supabase Storage
  anh.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 16;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(anh, 0, 0, 16, 16);
      const d = ctx.getImageData(0, 0, 16, 16).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
      const k = 0.75; // làm tối nhẹ cho viền vàng nổi hơn
      callback(`rgb(${Math.round((r / n) * k)}, ${Math.round((g / n) * k)}, ${Math.round((b / n) * k)})`);
    } catch (e) {
      callback(null); // bị chặn CORS -> dùng màu mặc định trong CSS
    }
  };
  anh.onerror = () => callback(null);
  anh.src = urlAnh;
}

document.addEventListener("DOMContentLoaded", () => {
  const daXuLy = new WeakSet();

  function apDungMauBiaSau() {
    document.querySelectorAll(".sach-noibat-the[data-anh-bia]").forEach((the) => {
      if (daXuLy.has(the)) return;
      daXuLy.add(the);
      const url = the.dataset.anhBia;
      if (!url) return;
      layMauChuDao(url, (mau) => {
        if (mau) the.style.setProperty("--mau-bia-sau", mau);
      });
    });
  }

  apDungMauBiaSau();
  new MutationObserver(apDungMauBiaSau).observe(document.body, { childList: true, subtree: true });
});