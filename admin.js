const SUPABASE_URL = "https://qtobmkvsshlxgeqsaues.supabase.co";
const SUPABASE_KEY = "sb_publishable_bEzv5fzYChUac3cKUH0D1g_ouQbMk3q";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginScreen = document.getElementById("login-screen");
const adminScreen = document.getElementById("admin-screen");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const adminMessage = document.getElementById("admin-message");
const tableBody = document.getElementById("reservation-table-body");
const reservationCount = document.getElementById("reservation-count");
const reloadButton = document.getElementById("reload-button");
const excelButton = document.getElementById("excel-button");
const logoutButton = document.getElementById("logout-button");

let reservations = [];

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("ja-JP");
}

function formatDateTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("ja-JP");
}

async function checkLogin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showAdmin();
    await loadReservations();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  adminScreen.classList.add("hidden");
}

function showAdmin() {
  loginScreen.classList.add("hidden");
  adminScreen.classList.remove("hidden");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "ログイン中...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("ログインエラー:", error);
    loginMessage.textContent = "ログインできませんでした。";
    return;
  }

  loginMessage.textContent = "";
  showAdmin();
  await loadReservations();
});

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  reservations = [];
  tableBody.innerHTML = "";
  reservationCount.textContent = "";
  showLogin();
});

async function loadReservations() {
  adminMessage.textContent = "予約一覧を読み込み中...";

  const { data, error } = await supabaseClient
    .from("reservations")
    .select(`
      reservation_number,
      name,
      address,
      phone,
      checked_in,
      created_at,
      events (
        event_name,
        event_date
      )
    `)
    .order("reservation_number", { ascending: true });

  if (error) {
    console.error("予約取得エラー:", error);
    adminMessage.textContent = "予約一覧を取得できませんでした。";
    return;
  }

  reservations = data || [];
  displayReservations();
  adminMessage.textContent = "";
}

function displayReservations() {
  tableBody.innerHTML = "";

  reservations.forEach((reservation) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(reservation.reservation_number)}</td>
      <td>${escapeHtml(reservation.name)}</td>
      <td>${escapeHtml(reservation.address)}</td>
      <td>${escapeHtml(reservation.phone)}</td>
      <td>${escapeHtml(reservation.events?.event_name || "")}</td>
      <td>${escapeHtml(formatDate(reservation.events?.event_date))}</td>
      <td>${escapeHtml(formatDateTime(reservation.created_at))}</td>
      <td>${reservation.checked_in ? "済" : "未"}</td>
    `;
    tableBody.appendChild(row);
  });

  reservationCount.textContent = "予約件数：" + reservations.length + "件";
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

reloadButton.addEventListener("click", async () => {
  await loadReservations();
});

excelButton.addEventListener("click", () => {
  if (reservations.length === 0) {
    alert("出力する予約データがありません。");
    return;
  }

  const excelData = reservations.map((reservation) => ({
    "予約番号": reservation.reservation_number,
    "氏名": reservation.name,
    "住所": reservation.address,
    "電話番号": reservation.phone,
    "イベント": reservation.events?.event_name || "",
    "開催日": formatDate(reservation.events?.event_date),
    "予約日時": formatDateTime(reservation.created_at),
    "チェックイン": reservation.checked_in ? "済" : "未"
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  worksheet["!cols"] = [
    { wch: 22 }, { wch: 18 }, { wch: 35 }, { wch: 18 },
    { wch: 25 }, { wch: 15 }, { wch: 22 }, { wch: 14 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "予約一覧");
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `予約一覧_${today}.xlsx`);
});

checkLogin();
