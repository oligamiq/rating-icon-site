#![cfg(not(target_arch = "wasm32"))]
use anyhow::Result;
use regex::Regex;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};
use walkdir::WalkDir;

// import _at from"_astro/__WASM_ASSET__L4vI4$X_.wasm";
// import Rat from"_astro/tfjs-backend-wasm-simd.1ab1r3r.wasm";
// import Oat from"_astro/tfjs-backend-wasm-threaded-simd.1n4oai4.wasm";
fn main() -> Result<()> {
    let wasm = find_rating_icon_bg()?;
    let wasm_strip = wasm
        .iter()
        .map(|w| {
            w.strip_prefix("dist/_astro")
                .expect("strip")
                .to_string_lossy()
                .replace("\\", "/")
        })
        .collect::<Vec<_>>();
    let worker = Path::new("dist").join("_worker.js");
    rewrite_import_wasm_module(&worker, wasm_strip)?;
    // println!("rewrite: {}", worker.to_string_lossy().replace("\\", "/"));
    Ok(())
}

// dist以下のファイルから/_astro/?????.wasmというファイルを見つける
fn find_rating_icon_bg() -> Result<Vec<PathBuf>> {
    let dist = Path::new("dist");
    let mut wasm = Vec::new();
    for entry in WalkDir::new(dist) {
        let entry = entry?;
        let filename = entry.file_name().to_str().expect("filename");
        if filename.ends_with(".wasm") {
            wasm.push(entry.path().to_owned());
        }
    }
    Ok(wasm)
}

// 特定のファイルを開き、`import ??? from`の場所を探して書き換える
fn rewrite_import_wasm_module(path: &Path, mut wasm: Vec<String>) -> Result<()> {
    let src = std::fs::read_to_string(path)?;
    let mut lines = src.lines().map(|m| m.into()).collect::<Vec<String>>();
    let reg = Regex::new(r#"import ([\w]+) from"_astro/([\w$-\.]+)\.wasm";"#)?;
    let items = lines.iter().enumerate().fold(
        HashMap::new(),
        |mut vec: HashMap<usize, Vec<(String, String, String)>>, (num, line)| {
            let cup = reg
                .captures_iter(line)
                .map(|m| m.extract())
                .collect::<Vec<_>>();
            if cup.len() > 0 {
                vec.insert(
                    num,
                    cup.into_iter().fold(
                        Vec::new(),
                        |mut m: Vec<(String, String, String)>, (name, [a, b])| {
                            let b = format!("{b}.wasm");
                            // wasmのどこに含まれるもの
                            if let Some(i) = wasm.iter().position(|w| *w == b) {
                                wasm.remove(i);
                            } else {
                                m.push((name.into(), a.into(), b));
                            }
                            m
                        },
                    ),
                );
                vec
            } else {
                vec
            }
        },
    );
    // println!("items: {:#?}", items);
    // println!("wasm: {:#?}", wasm);

    lines.iter_mut().enumerate().for_each(|(num, line)| {
        if let Some(items) = items.get(&num) {
            for ((name, a, _), wasm) in items.iter().zip(wasm.iter()).collect::<Vec<_>>() {
                let new_import = format!(r#"import {a} from"_astro/{wasm}";"#);
                println!("rewrite: {name} -> {new_import}");
                let new_line = line.replace(name, &new_import);
                *line = new_line;
            }
        }
    });
    let src = lines.join("\n");
    std::fs::write(path, src)?;
    Ok(())
}
