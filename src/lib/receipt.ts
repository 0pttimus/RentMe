const RECEIPT_W = 600;
const RECEIPT_H = 420;
const PAD = 32;
const LEFT = PAD;
const RIGHT = RECEIPT_W - PAD;

export function downloadReceiptImage(params: {
  title: string;
  rows: { label: string; value: string }[];
  subtitle?: string;
  filename: string;
}) {
  const c = document.createElement("canvas");
  c.width = RECEIPT_W;
  c.height = RECEIPT_H;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(0, 0, RECEIPT_W, RECEIPT_H, 16);
  ctx.fill();

  let y = 44;

  ctx.fillStyle = "#059669";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillText("RentMe", LEFT, y);
  y += 28;

  ctx.fillStyle = "#111827";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillText(params.title, LEFT, y);
  y += 22;

  if (params.subtitle) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(params.subtitle, LEFT, y);
    y += 20;
  }

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LEFT, y);
  ctx.lineTo(RIGHT, y);
  ctx.stroke();
  y += 20;

  for (const row of params.rows) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(row.label, LEFT, y);
    ctx.fillStyle = "#111827";
    ctx.font = "500 13px system-ui, sans-serif";
    const val = row.value;
    const tw = ctx.measureText(val).width;
    ctx.fillText(val, RIGHT - tw, y);
    y += 26;
  }

  y += 8;
  ctx.fillStyle = "#059669";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText("Completed", LEFT, y);

  y += 40;
  ctx.fillStyle = "#9ca3af";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("Powered by RentMe", LEFT, y);

  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${params.filename}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
