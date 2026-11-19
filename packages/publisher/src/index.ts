import QRCode from "qrcode";
export function createManifest(title: string) {
  return {
    name: title,
    short_name: title.slice(0, 24),
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#fafbf8",
    theme_color: "#295d50",
    icons: [192, 512].map((size) => ({
      src: `icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    })),
  };
}
export function createQrCode(url: string) {
  const u = new URL(url);
  if (u.protocol !== "https:")
    throw Error("Le QR code doit pointer vers une URL HTTPS");
  return QRCode.toString(u.href, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
