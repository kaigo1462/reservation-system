const SUPABASE_URL = "https://qtobmkvsshlxgeqsaues.supabase.co";
const SUPABASE_KEY = "sb_publishable_bEzv5fzYChUac3cKUH0D1g_ouQbMk3q";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const EVENT_ID = 1;

const formScreen = document.getElementById("form-screen");
const completeScreen = document.getElementById("complete-screen");
const form = document.getElementById("reservation-form");
const submitButton = document.getElementById("submit-button");
const message = document.getElementById("message");
const pdfButton = document.getElementById("pdf-button");
const ticket = document.getElementById("ticket");

let currentEvent = null;
let currentReservationNumber = null;

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

async function loadEvent() {
  const { data, error } = await supabaseClient
    .from("events")
    .select("id, event_name, event_date, reservation_open")
    .eq("id", EVENT_ID)
    .single();

  if (error) {
    console.error("イベント取得エラー:", error);
    document.getElementById("form-event-date").textContent = "イベント情報を取得できませんでした。";
    return;
  }

  currentEvent = data;
  document.getElementById("form-event-name").innerHTML = "大島町家族介護支援事業<br>映画上映会";
  document.getElementById("form-event-date").textContent = "開催日：" + formatDate(currentEvent.event_date);

  if (!currentEvent.reservation_open) {
    message.textContent = "現在、予約受付を行っていません。";
    submitButton.disabled = true;
    return;
  }

  submitButton.disabled = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentEvent) return;

  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const phone = document.getElementById("phone").value.trim();

  if (!name || !address || !phone) {
    message.textContent = "すべての項目を入力してください。";
    return;
  }

  submitButton.disabled = true;
  message.textContent = "予約処理中です...";

  const { data, error } = await supabaseClient.rpc("create_reservation", {
    p_event_id: EVENT_ID,
    p_name: name,
    p_address: address,
    p_phone: phone
  });

  if (error) {
    console.error("予約登録エラー:", error);
    message.textContent = "予約に失敗しました。";
    submitButton.disabled = false;
    return;
  }

  if (!data || data.length === 0) {
    message.textContent = "予約番号を取得できませんでした。";
    submitButton.disabled = false;
    return;
  }

  currentReservationNumber = data[0].reservation_number;
  document.getElementById("ticket-event-name").textContent = currentEvent.event_name;
  document.getElementById("ticket-event-date").textContent = formatDate(currentEvent.event_date);
  document.getElementById("ticket-name").textContent = name;
  document.getElementById("ticket-reservation-number").textContent = currentReservationNumber;

  JsBarcode("#barcode", currentReservationNumber, {
    format: "CODE128",
    displayValue: true,
    height: 80,
    fontSize: 16,
    textMargin: 8,
    margin: 5
  });

  formScreen.classList.add("hidden");
  completeScreen.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

pdfButton.addEventListener("click", async () => {
  if (!currentReservationNumber) return;

  pdfButton.disabled = true;
  pdfButton.textContent = "PDFを作成中...";
  const pdfWindow = window.open("", "_blank");

  try {
    const canvas = await html2canvas(ticket, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true
    });

    const imageData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    let imageWidth = pageWidth - margin * 2;
    let imageHeight = canvas.height * imageWidth / canvas.width;

    if (imageHeight > pageHeight - margin * 2) {
      imageHeight = pageHeight - margin * 2;
      imageWidth = canvas.width * imageHeight / canvas.height;
    }

    const x = (pageWidth - imageWidth) / 2;
    const y = (pageHeight - imageHeight) / 2;

    pdf.addImage(imageData, "PNG", x, y, imageWidth, imageHeight);
    const pdfBlob = pdf.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    if (pdfWindow) {
      pdfWindow.location.href = pdfUrl;
    } else {
      pdf.save(currentReservationNumber + ".pdf");
    }

    setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
  } catch (error) {
    console.error("PDF作成エラー:", error);
    if (pdfWindow) pdfWindow.close();
    alert("PDFの作成に失敗しました。");
  } finally {
    pdfButton.disabled = false;
    pdfButton.textContent = "予約票PDFを開く";
  }
});

loadEvent();
