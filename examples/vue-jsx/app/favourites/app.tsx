import { defineComponent, ref, onMounted, computed, onUnmounted, watch } from "vue";

import "./index.less";

import browser from "webextension-polyfill";
import FavSider, { SiteGroup } from "./components/sider";
import FavContent, { FavouriteItem } from "./components/content";

// 简单演示：实际数据应来自 IndexedDB / chrome.storage
interface RawFav extends FavouriteItem {}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

interface StoredFav {
  id: string;
  title: string;
  pageUrl: string;
  domain: string;
  addedAt: number;
  favIcon?: string;
  downloadable?: boolean;
  keywords?: string[];
  commentKeywords?: string[];
  cover?: { mime: string; data: number[] };
}

function bytesToObjectUrl(cover?: { mime: string; data: number[] }): string | undefined {
  if (!cover || !cover.data?.length) return undefined;
  try {
    const u8 = new Uint8Array(cover.data);
    const blob = new Blob([u8], { type: cover.mime || "image/webp" });
    return URL.createObjectURL(blob);
  } catch {
    return undefined;
  }
}

async function loadFavourites(): Promise<RawFav[]> {
  try {
    const res = await browser.storage.local.get("favourites");
    if (Array.isArray(res.favourites)) {
      return res.favourites.map((f: StoredFav) => ({
        id: f.id,
        title: f.title,
        pageUrl: f.pageUrl,
        domain: f.domain,
        addedAt: f.addedAt,
        favIcon: f.favIcon,
        downloadable: f.downloadable,
        cover: bytesToObjectUrl(f.cover) || "",
      }));
    }
  } catch (e) {
    console.debug("load favourites error", e);
  }
  return [];
}

export default defineComponent({
  name: "App",
  setup() {
    const loading = ref(true);
    const allFavs = ref<RawFav[]>([]);
    const currentSite = ref<string | null>(null);

    const objectUrls = new Set<string>();

    async function refresh() {
      loading.value = true;
      // 释放旧的 objectURL
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.clear();
      const list = await loadFavourites();
      list.forEach((i) => { if (i.cover) objectUrls.add(i.cover); });
      allFavs.value = list;
      if (allFavs.value.length && !currentSite.value) {
        currentSite.value = allFavs.value[0].domain;
      }
      loading.value = false;
    }

    onMounted(async () => {
      await refresh();
      // 监听 storage 改变
      browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.favourites) {
          refresh();
        }
      });
    });

    onUnmounted(() => {
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.clear();
    });

    const siteGroups = computed<SiteGroup[]>(() => {
      const map: Record<string, SiteGroup> = {};
      allFavs.value.forEach((f) => {
        if (!map[f.domain]) {
          map[f.domain] = {
            key: f.domain,
            label: f.domain,
            count: 0,
            favicon: `https://icon.horse/icon/${f.domain}`,
          };
        }
        map[f.domain].count++;
      });
      return Object.values(map).sort((a, b) => b.count - a.count);
    });

    const currentList = computed(() =>
      allFavs.value.filter((f) => (currentSite.value ? f.domain === currentSite.value : true))
    );

    return () => (
      <div class="h-full flex flex-col bg-background text-foreground">
        <header class="border-b px-4 py-3">
          <h1 class="text-lg font-semibold">视频收藏夹</h1>
        </header>
        <div class="flex flex-1 overflow-hidden">
          <aside class="w-[220px] border-r flex flex-col overflow-hidden">
            <FavSider
              value={currentSite.value || undefined}
              groups={siteGroups.value}
              onUpdate:value={(v: string) => (currentSite.value = v)}
            />
          </aside>
          <main class="flex-1 p-4 flex flex-col overflow-hidden">
            <FavContent
              list={currentList.value}
              loading={loading.value}
              onOpen={(item: FavouriteItem) => {
                // TODO: 打开播放面板 / 内嵌播放器
                browser.tabs.create({ url: item.pageUrl });
              }}
            />
          </main>
        </div>
      </div>
    );
  },
});
