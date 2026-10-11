(function () {
  'use strict';

  // Tự tìm Supabase client đã tạo trong supabase-client.js, không cần biết chính xác tên biến.
  // Lưu ý: `const x = ...` ở cấp cao nhất của script KHÔNG gắn vào window,
  // nên phải dùng typeof (an toàn khi biến không tồn tại) thay vì window.x.
  function timSupabaseClient() {
    const la_client = (x) => x && typeof x.from === 'function' && x.auth;
    const ung_vien = [
      () => (typeof supabaseClient !== 'undefined' ? supabaseClient : null),
      () => (typeof supabaseDb !== 'undefined' ? supabaseDb : null),
      () => (typeof sb !== 'undefined' ? sb : null),
      () => (typeof db !== 'undefined' ? db : null),
      () => (typeof client !== 'undefined' ? client : null),
      () => (typeof _supabase !== 'undefined' ? _supabase : null),
      () => window.supabaseClient,
      () => window.supabase, // trường hợp file gán thẳng client vào window.supabase
    ];
    for (const lay of ung_vien) {
      try {
        const x = lay();
        if (la_client(x)) return x;
      } catch (e) { /* thử ứng viên tiếp theo */ }
    }
    return null;
  }
  const ketNoiDb = timSupabaseClient();

  const CAC_TRUONG = [
    { key: 'goc_rong_ngang', nhan: 'Góc rộng ngang (°)',         min: 60,  max: 360, step: 1,   mac_dinh: 180 },
    { key: 'goc_rong_doc',   nhan: 'Góc rộng dọc (°)',           min: 20,  max: 180, step: 1,   mac_dinh: null },
    { key: 'lech_doc',       nhan: 'Lệch dọc (°)',               min: -45, max: 45,  step: 0.5, mac_dinh: 0 },
    { key: 'cat_vien',       nhan: 'Cắt viền (%)',               min: 0,   max: 15,  step: 0.5, mac_dinh: 2 },
    { key: 'yaw_ban_dau',    nhan: 'Yaw ban đầu (°)',            min: -180, max: 180, step: 1,  mac_dinh: 0 },
    { key: 'pitch_ban_dau',  nhan: 'Pitch ban đầu (°)',          min: -90, max: 90,  step: 1,   mac_dinh: 0 },
    { key: 'hfov_ban_dau',   nhan: 'HFOV ban đầu (°)',           min: 30,  max: 120, step: 1,   mac_dinh: 100 },
    { key: 'hfov_toi_thieu', nhan: 'HFOV tối thiểu (°) - giới hạn zoom', min: 20, max: 120, step: 1, mac_dinh: 60 },
  ];
  const BAT_DAU = ['yaw_ban_dau', 'pitch_ban_dau', 'hfov_ban_dau'];

  const $ = (id) => document.getElementById(id);
  let danhSach = [], scene = null, anh = { w: 0, h: 0 }, gt = {}, viewer = null, hen = null;

  function baoTrangThai(text, loi) {
    const el = $('trang-thai');
    el.textContent = text;
    el.style.color = loi ? '#ff8a80' : '#81c995';
  }

  function tinhVaov() {
    if (gt.goc_rong_doc != null) return gt.goc_rong_doc;
    return Math.min(180, gt.goc_rong_ngang * anh.h / anh.w);
  }

  // ---------- Bảng điều khiển ----------
  function dungBang() {
    const ds = $('cac-truong');
    ds.innerHTML = '';
    CAC_TRUONG.forEach((t) => {
      const dong = document.createElement('div');
      dong.className = 'truong';
      dong.innerHTML =
        '<label for="' + t.key + '"><span>' + t.nhan + '</span><output id="' + t.key + '-out"></output></label>' +
        '<input type="range" id="' + t.key + '" min="' + t.min + '" max="' + t.max + '" step="' + t.step + '">' +
        (t.key === 'goc_rong_doc'
          ? '<label class="tu-dong"><input type="checkbox" id="goc_rong_doc-auto"> Tự tính theo tỉ lệ ảnh</label>'
          : '');
      ds.appendChild(dong);
      $(t.key).addEventListener('input', () => khiDoi(t.key));
    });
    $('goc_rong_doc-auto').addEventListener('change', () => khiDoi('goc_rong_doc'));
  }

  function docGiaTri() {
    CAC_TRUONG.forEach((t) => { gt[t.key] = parseFloat($(t.key).value); });
    gt.goc_rong_doc = $('goc_rong_doc-auto').checked ? null : gt.goc_rong_doc;
  }

  function napGiaTri() {
    CAC_TRUONG.forEach((t) => {
      const v = scene[t.key] != null ? Number(scene[t.key]) : t.mac_dinh;
      $(t.key).value = v != null ? v : 90;
    });
    $('goc_rong_doc-auto').checked = scene.goc_rong_doc == null;
    docGiaTri();
  }

  function hienThi() {
    CAC_TRUONG.forEach((t) => {
      let v = gt[t.key];
      if (t.key === 'goc_rong_doc') {
        $(t.key).disabled = $('goc_rong_doc-auto').checked;
        v = tinhVaov();
        v = Math.round(v * 10) / 10 + ($('goc_rong_doc-auto').checked ? ' (tự động)' : '');
      }
      $(t.key + '-out').textContent = v;
    });

    const pxTrenDo = anh.w / gt.goc_rong_ngang;
    $('thong-tin').textContent =
      'Ảnh ' + anh.w + '×' + anh.h + 'px · ' + pxTrenDo.toFixed(1) + ' px/độ · vaov ≈ ' + tinhVaov().toFixed(1) + '°';

    const goiY = goiYHfovToiThieu();
    const el = $('goi-y');
    el.textContent = 'Gợi ý HFOV tối thiểu để ảnh còn nét (1 px ảnh ≈ 1 px màn hình): ' + goiY + '°' +
      (goiY > 90 ? ' - ảnh phân giải thấp so với góc rộng, nên dùng ảnh lớn hơn hoặc hạn chế zoom.' : '');
    el.className = goiY > 90 ? 'canh-bao' : '';
  }

  function goiYHfovToiThieu() {
    if (!anh.w) return 0;
    const v = Math.round($('viewer').clientWidth * gt.goc_rong_ngang / anh.w);
    return Math.max(20, Math.min(120, v));
  }

  // ---------- Pannellum ----------
  function taoCauHinh() {
    const haov = gt.goc_rong_ngang;
    const vaov = tinhVaov();
    const off = gt.lech_doc;
    const cx = haov * gt.cat_vien / 100;
    const cy = vaov * gt.cat_vien / 100;

    const cfg = {
      type: 'equirectangular',
      panorama: scene.url_anh_360,
      autoLoad: true,
      showControls: false,
      haov: haov,
      vaov: vaov,
      vOffset: off,
      minPitch: off - vaov / 2 + cy,
      maxPitch: off + vaov / 2 - cy,
      yaw: gt.yaw_ban_dau,
      pitch: gt.pitch_ban_dau,
      hfov: gt.hfov_ban_dau,
      minHfov: gt.hfov_toi_thieu,
      maxHfov: 120,
    };
    if (haov < 360) {              // vòng đủ 360° thì không giới hạn yaw
      cfg.minYaw = -haov / 2 + cx;
      cfg.maxYaw = haov / 2 - cx;
    }
    return cfg;
  }

  function taoViewer(giuGocNhin) {
    if (!scene || !anh.w) return;
    let nhin = null;
    if (giuGocNhin && viewer) {
      nhin = { yaw: viewer.getYaw(), pitch: viewer.getPitch(), hfov: viewer.getHfov() };
    }
    if (viewer) { viewer.destroy(); viewer = null; }
    const cfg = taoCauHinh();
    if (nhin) Object.assign(cfg, nhin);
    viewer = pannellum.viewer('viewer', cfg);
  }

  function khiDoi(key) {
    docGiaTri();
    hienThi();
    clearTimeout(hen);
    // đổi yaw/pitch/hfov ban đầu thì nhảy tới góc đó; đổi tham số khác thì giữ góc đang xem
    hen = setTimeout(() => taoViewer(!BAT_DAU.includes(key)), 120);
  }

  // ---------- Dữ liệu ----------
  function taiKichThuocAnh(url) {
    return new Promise((ok, loi) => {
      const img = new Image();
      img.onload = () => { anh = { w: img.naturalWidth, h: img.naturalHeight }; ok(); };
      img.onerror = () => loi(new Error('Không tải được ảnh: ' + url));
      img.src = url;
    });
  }

  async function chonScene(id) {
    scene = danhSach.find((s) => String(s.id) === String(id));
    if (!scene) return;
    baoTrangThai('Đang tải ảnh...');
    try {
      await taiKichThuocAnh(scene.url_anh_360);
    } catch (e) {
      baoTrangThai(e.message, true);
      return;
    }
    napGiaTri();
    hienThi();
    taoViewer(false);
    baoTrangThai('');
  }

  async function luu() {
    docGiaTri();
    const payload = {};
    CAC_TRUONG.forEach((t) => { payload[t.key] = gt[t.key]; });
    const { data, error } = await ketNoiDb.from('tour_scene').update(payload).eq('id', scene.id).select();
    if (error) return baoTrangThai('Lỗi lưu: ' + error.message, true);
    if (!data || !data.length) {
      return baoTrangThai('Không lưu được: chưa đăng nhập admin hoặc thiếu policy UPDATE.', true);
    }
    Object.assign(scene, payload);
    baoTrangThai('Đã lưu "' + (scene.ten_scene || scene.id) + '".');
  }

  function layGocHienTai() {
    if (!viewer) return;
    $('yaw_ban_dau').value = Math.round(viewer.getYaw());
    $('pitch_ban_dau').value = Math.round(viewer.getPitch());
    $('hfov_ban_dau').value = Math.round(viewer.getHfov());
    docGiaTri();
    hienThi();
    baoTrangThai('Đã lấy góc nhìn hiện tại (nhớ bấm Lưu).');
  }

  async function khoiDong() {
    if (!ketNoiDb) {
      console.error('Không tìm thấy Supabase client. Mở assets/js/supabase-client.js, xem dòng có createClient để biết tên biến.');
      return baoTrangThai('Chưa tìm thấy Supabase client - xem Console (F12) và file supabase-client.js.', true);
    }
    dungBang();

    const { data, error } = await ketNoiDb.from('tour_scene').select('*').order('id');
    if (error || !data || !data.length) {
      return baoTrangThai('Không đọc được tour_scene: ' + (error ? error.message : 'bảng trống'), true);
    }
    danhSach = data;

    const chon = $('chon-scene');
    danhSach.forEach((s) => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.ten_scene || ('Scene ' + s.id);
      chon.appendChild(o);
    });
    chon.addEventListener('change', () => chonScene(chon.value));

    $('nut-luu').addEventListener('click', luu);
    $('nut-lay-goc').addEventListener('click', layGocHienTai);
    $('nut-dat-lai').addEventListener('click', () => { napGiaTri(); hienThi(); taoViewer(false); });
    $('nut-ap-goi-y').addEventListener('click', () => {
      $('hfov_toi_thieu').value = goiYHfovToiThieu();
      khiDoi('hfov_toi_thieu');
    });
    window.addEventListener('resize', hienThi);

    chonScene(danhSach[0].id);
  }

  khoiDong();
})();