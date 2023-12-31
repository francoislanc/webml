#!/bin/bash

rm -r $(dirname "$0")/build
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen target/wasm32-unknown-unknown/release/whisper.wasm --out-dir $(dirname "$0")/build --target web
wasm-bindgen target/wasm32-unknown-unknown/release/blip.wasm --out-dir $(dirname "$0")/build --target web