import * as index_bg from "@/pkg/rating_icon_bg.wasm";
import _wasm from "@/pkg/rating_icon_bg.wasm?url";

const _wasm_memory = new WebAssembly.Memory({ initial: 512 });
const importsObject = {
  env: { memory: _wasm_memory },
  "./index_bg.js": index_bg,
};

export default new WebAssembly.Instance(_wasm, importsObject).exports;
