import artiLogo from "@/components/LOGO.jpg";

/** Shared ARTI logo asset (src/components/LOGO.jpg) */
export const ARTI_LOGO = artiLogo;

export const ARTI_LOGO_SRC = artiLogo.src;

/** Display height in px for header / report UI */
export const ARTI_LOGO_DISPLAY_HEIGHT = 32;

export function artiLogoDisplayWidth(heightPx = ARTI_LOGO_DISPLAY_HEIGHT): number {
  return Math.round(artiLogo.width * (heightPx / artiLogo.height));
}
