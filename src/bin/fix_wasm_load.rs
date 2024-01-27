#![cfg(not(target_arch = "wasm32"))]
use std::path::PathBuf;

use anyhow::Result;

fn main() -> Result<()> {
    rewrite_file(
        "./wasm/rating_icon.js".parse()?,
        r#"import * as imports from "./rating_icon_bg.js";
import wkmod from "./rating_icon_bg.wasm?module";
const instance = new WebAssembly.Instance(wkmod, { "./rating_icon_bg.js": imports });
import { __wbg_set_wasm } from "./rating_icon_bg.js";
imports.__wbg_set_wasm(instance.exports);
export * from "./rating_icon_bg.js";"#,
    )?;
    println!("rewrite: {}", "./wasm/rating_icon.js");
    Ok(())
}

// 指定したファイルの内容を丸々書き換える
fn rewrite_file(path: PathBuf, new_content: &str) -> Result<()> {
    std::fs::write(path, new_content)?;
    Ok(())
}
