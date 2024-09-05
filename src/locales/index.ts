import { createI18n } from 'vue-i18n';
import { computed } from 'vue';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/esm/plugin/customParseFormat';
import isSameOrBefore from 'dayjs/esm/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/esm/plugin/isSameOrAfter';

import ArcoEnUS from '@arco-design/web-vue/es/locale/lang/en-us';
import ArcoZhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
import type { ArcoLang } from '@arco-design/web-vue/es/locale/interface';

import enUs from '@root/shared/langs/en-us';
import zhCn from '@root/shared/langs/zh-cn';
import { loadExternalJsFile } from '@root/shared/render-utils';
import { SharedStore } from '@root/shared/render-utils/storage';
import { IPC_CHANNEL, STORE_KEY } from '@root/shared/dicts/enums';

if (!('dayjs' in globalThis)) {
  // @ts-ignore
  dayjs.extend(customParseFormat);
  // @ts-ignore
  dayjs.extend(isSameOrBefore);
  // @ts-ignore
  dayjs.extend(isSameOrAfter);
  Reflect.defineProperty(globalThis, 'dayjs', {
    value: dayjs
  });
}

export const supportLanguages = {
  'zh-cn': '中文 (简体中文)',
  'en-us': 'English (US)'
};

export type TLanguage = keyof typeof supportLanguages;

export const getSupportLanguages = () => {
  return supportLanguages;
};

export const currentSupportLanguages = getSupportLanguages();
export const SUPPORT_LOCALES_LIST = Object.keys(currentSupportLanguages);
export const SUPPORT_LOCALES = Object.keys(currentSupportLanguages).map((k) => ({
  name: currentSupportLanguages[k as keyof typeof currentSupportLanguages],
  value: k
}));

export const messages = {
  'zh-cn': zhCn,
  'en-us': enUs
};

export const arcoLangs: Partial<Record<TLanguage, ArcoLang>> = {
  'zh-cn': ArcoZhCN,
  'en-us': ArcoEnUS
};

export const dayjsLangs: Record<TLanguage, { url: string; lang: string }> = {
  'zh-cn': {
    url: `https://unpkg.com/dayjs/locale/zh-cn.js`,
    lang: 'zh-cn'
  },
  'en-us': {
    url: `https://unpkg.com/dayjs/locale/en.js`,
    lang: 'en'
  }
};

let langChangeFromStore = false;

export async function loadDayJsLocals(locale: TLanguage) {
  const name = `dayjs_locale_${locale.replace(/-/, '_')}`;
  try {
    await loadExternalJsFile(dayjsLangs[locale].url, name);
    dayjs.locale(dayjsLangs[locale].lang);
  } catch (error) {
    console.log(`[LoadDayJsLocals ${locale} Error]`, error);
  }
}

const initialLanguage = (SharedStore.getSync(STORE_KEY.LANG) || 'zh-cn') as TLanguage;

loadDayJsLocals(initialLanguage);
export const sharedI18n = createI18n({
  legacy: false,
  locale: initialLanguage,
  fallbackLocale: 'zh-cn',
  warnHtmlInMessage: 'off',
  warnHtmlMessage: false,
  messages
});

export async function setI18nLanguage(locale: TLanguage) {
  loadDayJsLocals(locale);
  sharedI18n.global.locale.value = locale;
  document.querySelector('html')!.setAttribute('lang', locale.substring(0, 2));
  if (langChangeFromStore) {
    langChangeFromStore = false;
  } else {
    SharedStore.set(STORE_KEY.LANG, locale);
  }
}

export const currentLocale = computed(() => sharedI18n.global.locale.value);

export function useSharedLocales() {
  return sharedI18n.global;
}

window.ipcRenderer.on(IPC_CHANNEL.STORE_CHANGED, (_, store) => {
  if (store[STORE_KEY.LANG] !== sharedI18n.global.locale.value) {
    langChangeFromStore = true;
    setI18nLanguage(store[STORE_KEY.LANG]);
  }
});

export default sharedI18n;
