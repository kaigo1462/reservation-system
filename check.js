const SUPABASE_URL = "https://qtobmkvsshlxgeqsaues.supabase.co";
const SUPABASE_KEY = "sb_publishable_bEzv5fzYChUac3cKUH0D1g_ouQbMk3q";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const checkScreen = document.getElementById("check-screen");
const completeScreen = document.getElementById("complete-screen");
const form = document.getElementById("check-form");
const submitButton = document.getElementById("submit-button");
const message = document.getElementById("message");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const pdfButton = document.getElementById("pdf-button");
const ticket = document.getElementById("ticket");

let currentReservationNumber = null;

nameInput.addEventListener("input", () => {
  nameInput.value = nameInput.value
    .replace(/[ぁ-ん一-龯々〆〤A-Za-z0-9０-９\s]/g, "")
    .replace(/[^ァ-ヶー]/g, "");
});

phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/[^0-9]/g, "");
});

function isKatakanaSurname(value) {
  return /^[ァ-ヶー]+$/.test(value);
}

function getReceptionNumber(reservationNumber) {
  const match = String(reservationNumber || "").match(/(\d{5})$/);
  if (!match) return "";
  return String(Number(match[1])).padStart(3, "0");
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !phone) {
    message.textContent = "苗字と携帯電話番号を入力してください。";
    return;
  }

  if (!isKatakanaSurname(name)) {
    message.textContent = "苗字はカタカナのみで入力してください。";
    nameInput.focus();
    return;
  }

  if (!/^[0-9]+$/.test(phone)) {
    message.textContent = "電話番号は半角数字のみで入力してください。";
    phoneInput.focus();
    return;
  }

  submitButton.disabled = true;
  message.textContent = "予約を確認中です...";

  const { data, error } = await supabaseClient.rpc("find_reservation", {
    p_name: name,
    p_phone: phone
  });

  if (error) {
    console.error("予約確認エラー:", error);
    message.textContent = "予約を確認できませんでした。";
    submitButton.disabled = false;
    return;
  }

  if (!data) {
    message.textContent = "入力された苗字・電話番号に一致する予約が見つかりませんでした。";
    submitButton.disabled = false;
    return;
  }

  currentReservationNumber = data.reservation_number;
  const receptionNumber = getReceptionNumber(currentReservationNumber);

  document.getElementById("ticket-event-name").innerHTML = "大島町家族介護支援事業<br>映画上映会";
  document.getElementById("ticket-event-date").textContent = formatDate(data.event_date);
  document.getElementById("ticket-name").textContent = data.name || "";
  document.getElementById("ticket-reservation-number").textContent = currentReservationNumber || "";
  document.getElementById("ticket-reception-number").textContent = receptionNumber;

  checkScreen.classList.add("hidden");
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
