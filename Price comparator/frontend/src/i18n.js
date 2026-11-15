import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translations } from "./translations.js";

i18n.use(initReactI18next).init({
  resources: translations,
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["es", "en"],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;