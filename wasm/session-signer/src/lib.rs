use hmac::{Hmac, Mac};
use sha2::Sha256;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn sign(value: &str, secret: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(value.as_bytes());
    let result = mac.finalize().into_bytes();
    let val_b64 = b64_url(value.as_bytes());
    let sig_b64 = b64_url(&result);
    format!("{}.{}", val_b64, sig_b64)
}

#[wasm_bindgen]
pub fn verify(signed: &str, secret: &str) -> Option<String> {
    let parts: Vec<&str> = signed.split('.').collect();
    if parts.len() != 2 { return None; }
    let val_bytes = match b64_url_decode(parts[0]) { Ok(v) => v, Err(_) => return None };
    let sig_bytes = match b64_url_decode(parts[1]) { Ok(v) => v, Err(_) => return None };

    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(&val_bytes);
    match mac.verify_slice(&sig_bytes) {
        Ok(_) => Some(String::from_utf8(val_bytes).unwrap_or_default()),
        Err(_) => None,
    }
}

fn b64_url(data: &[u8]) -> String {
    let s = base64::engine::general_purpose::STANDARD.encode(data);
    s.replace('=', "").replace('+', "-").replace('/', "_")
}

fn b64_url_decode(s: &str) -> Result<Vec<u8>, base64::DecodeError> {
    let mut b64 = s.replace('-', "+").replace('_', "/");
    let rem = b64.len() % 4;
    if rem != 0 { b64.push_str(&"=".repeat(4 - rem)); }
    base64::engine::general_purpose::STANDARD.decode(b64)
}
