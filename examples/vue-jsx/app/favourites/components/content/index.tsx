import { defineComponent, PropType, ref, computed } from "vue";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";

export interface FavouriteItem {
  id: string;
  title: string;
  pageUrl: string;
  domain: string;
  addedAt: number; // 时间戳
  cover?: string; // 封面 blob url 或远程图
  favIcon?: string;
  downloadable?: boolean;
}

type SortKey = "time_desc" | "time_asc" | "title_asc" | "title_desc";

export default defineComponent({
  name: "FavContent",
  props: {
    list: { type: Array as PropType<FavouriteItem[]>, required: true },
    loading: { type: Boolean, default: false },
  },
  emits: ["open"],
  setup(props, { emit }) {
    const sortKey = ref<SortKey>("time_desc");
    const keyword = ref("");

    const sortOptions = [
      { label: "最新优先", value: "time_desc" },
      { label: "最早优先", value: "time_asc" },
      { label: "标题 A-Z", value: "title_asc" },
      { label: "标题 Z-A", value: "title_desc" },
    ];

    const filtered = computed(() => {
      let arr = props.list;
      const kw = keyword.value.trim().toLowerCase();
      if (kw) {
        arr = arr.filter((i) => i.title.toLowerCase().includes(kw));
      }
      switch (sortKey.value) {
        case "time_asc":
          arr = [...arr].sort((a, b) => a.addedAt - b.addedAt);
          break;
        case "title_asc":
          arr = [...arr].sort((a, b) => a.title.localeCompare(b.title));
          break;
        case "title_desc":
          arr = [...arr].sort((a, b) => b.title.localeCompare(a.title));
          break;
        case "time_desc":
        default:
          arr = [...arr].sort((a, b) => b.addedAt - a.addedAt);
      }
      return arr;
    });

    const formatTime = (t: number) => {
      const d = new Date(t);
      return `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${d
        .getHours()
        .toString()
        .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    };

    return () => (
      <div class="favs-content h-full flex flex-col">
        <div class="flex items-center justify-between mb-3 gap-2">
          <div class="flex items-center gap-2">
            <InputText
              placeholder="搜索标题..."
              class="w-[200px]"
              v-model={keyword.value}
            />
            <Dropdown
              v-model={sortKey.value}
              options={sortOptions}
              optionLabel="label"
              optionValue="value"
              class="w-[140px]"
            />
          </div>
          <div class="text-xs text-muted-foreground">
            共 {filtered.value.length} 项
          </div>
        </div>
        {filtered.value.length === 0 ? (
          <div class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div class="text-lg mb-2">{props.loading ? "加载中..." : "暂无数据"}</div>
          </div>
        ) : (
          <div class="flex-1 overflow-auto">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.value.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabindex={0}
                  class="outline-none"
                  onClick={() => emit("open", item)}
                  onKeydown={(e: KeyboardEvent) => {
                    if (e.key === "Enter") emit("open", item);
                  }}
                >
                  <div class="fav-card cursor-pointer hover:shadow-md transition-shadow border rounded-lg overflow-hidden bg-card">
                    <div class="relative w-full pt-[56%] overflow-hidden bg-[#111]">
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt={item.title}
                          class="absolute left-0 top-0 w-full h-full object-contain"
                        />
                      ) : (
                        <div class="absolute left-0 top-0 w-full h-full flex items-center justify-center text-[#999] text-xs">
                          无封面
                        </div>
                      )}
                      <div class="absolute right-1.5 top-1.5 bg-black/55 text-white text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5">
                        {item.favIcon ? (
                          <img
                            src={item.favIcon}
                            class="w-3 h-3 rounded-[2px]"
                            alt=""
                          />
                        ) : null}
                        {item.domain}
                      </div>
                    </div>
                    <div class="p-3">
                      <div class="text-[13px] font-medium leading-tight min-h-[34px]">
                        {item.title}
                      </div>
                      <div class="mt-1.5 text-[11px] text-muted-foreground">
                        {formatTime(item.addedAt)}
                      </div>
                      {item.downloadable ? (
                        <div class="mt-1 text-[10px] text-green-500">
                          可下载
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
});
