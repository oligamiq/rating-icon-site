#![cfg(target_arch = "wasm32")]

use image::DynamicImage;
use js_sys::{ArrayBuffer, Uint8Array};
use serde::Serialize;
use wasm_bindgen::prelude::*;

// #[wasm_bindgen]
// extern "C" {
//     #[wasm_bindgen(js_namespace=console)]
//     fn log(s: &str);
// }

#[derive(Serialize)]
pub struct Image {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

#[wasm_bindgen]
pub fn load_image(buffer: ArrayBuffer) -> Result<String, JsValue> {
    // Convert the ArrayBuffer to a Uint8Array
    let uint8_array = Uint8Array::new(&buffer);

    // Get the raw buffer from the Uint8Array
    let raw_buffer = uint8_array.buffer();

    // Create a Vec<u8> from the raw buffer
    let mut data = vec![0; raw_buffer.byte_length() as usize];
    uint8_array.copy_to(&mut data);

    // Decode the image from the buffer
    let image = match image::load_from_memory(&data) {
        Ok(image) => image,
        Err(e) => return Err(JsValue::from_str(&format!("Error: {}", e))),
    };

    let width = image.width();
    let height = image.height();

    // Convert the image to an RGBA image
    let rgba_image = match image {
        DynamicImage::ImageRgba8(rgba) => rgba,
        other_format => other_format.to_rgba8(),
    };

    // Create a new Vec<u8> to store the resulting RGBA image
    let mut result_buffer = Vec::with_capacity((width * height * 4) as usize);

    // Iterate through the pixels and convert to RGBA format
    for pixel in rgba_image.pixels() {
        result_buffer.push(pixel[0]);
        result_buffer.push(pixel[1]);
        result_buffer.push(pixel[2]);
        result_buffer.push(pixel[3]);
    }

    let image = Image {
        width,
        height,
        data: result_buffer,
    };

    Ok(match serde_json::to_string(&image) {
        Ok(json) => json,
        Err(e) => return Err(JsValue::from_str(&format!("Error: {}", e))),
    })
}
