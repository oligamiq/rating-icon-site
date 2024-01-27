// #![cfg(not(target_arch = "wasm32"))]
// use anyhow::{anyhow, Result};
// use std::path::{Path, PathBuf};
// use walkdir::WalkDir;

// fn main() -> Result<()> {
//     let wasm = find_rating_icon_bg()?;
//     let wasm_strip = wasm.strip_prefix("dist")?;
//     let path = wasm_strip.to_string_lossy().replace("\\", "/");
//     println!("rewrite: {path}");
//     let worker = Path::new("dist").join("_worker.js");
//     rewrite_import_wasm_module(&worker, &path)?;
//     println!("rewrite: {}", worker.to_string_lossy().replace("\\", "/"));
//     Ok(())
// }

// // dist以下のファイルから/_astro/rating_icon_bg.?????.wasmというファイルを見つける
// fn find_rating_icon_bg() -> Result<PathBuf> {
//     let dist = Path::new("dist");
//     let mut wasm = None;
//     for entry in WalkDir::new(dist) {
//         let entry = entry?;
//         let filename = entry.file_name().to_str().expect("filename");
//         if (filename.starts_with("rating_icon_bg.")) && filename.ends_with(".wasm") {
//             wasm = Some(entry.path().to_owned());
//             break;
//         }
//     }
//     let wasm = wasm.ok_or_else(|| anyhow!("rating_icon_bg.wasm not found"))?;
//     Ok(wasm)
// }

// // 特定のファイルを開き、`import wasmModule from`で始まる行を探して書き換える
// fn rewrite_import_wasm_module(path: &Path, wasm: &str) -> Result<()> {
//     let new_import = format!("import wasmModule from \"{wasm}\";");
//     let src = std::fs::read_to_string(path)?;
//     let mut lines = src.lines().collect::<Vec<_>>();
//     let mut found = false;
//     for line in &mut lines {
//         if line.starts_with("import wasmModule from ") {
//             *line = new_import.as_str();
//             found = true;
//             break;
//         }
//     }
//     if !found {
//         return Err(anyhow!("import wasmModule from not found"));
//     }
//     let src = lines.join("\n");
//     std::fs::write(path, src)?;
//     Ok(())
// }
