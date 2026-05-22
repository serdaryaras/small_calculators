import { ARTI_LOGO_SRC } from "@/lib/arti-logo";

export type ArtiLogoImage = {
  dataUrl: string;
  width: number;
  height: number;
};

/** Load logo for jsPDF addImage — browser only */
export async function loadArtiLogoForPdf(): Promise<ArtiLogoImage | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        resolve(null);
        return;
      }
      resolve({
        dataUrl: ARTI_LOGO_SRC,
        width: w,
        height: h,
      });
    };
    img.onerror = () => resolve(null);
    img.src = ARTI_LOGO_SRC;
  });
}
