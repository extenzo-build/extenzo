import browser from "webextension-polyfill";

export default function render(config: any, onChange: Function) {
  return config.map((item: any) => (
    <div class="more-content">
      <div>{item.title}</div>
      <van-switch
        size={16}
        v-model={item.value}
        onChange={onChange}
      />
    </div>
  ));
}
