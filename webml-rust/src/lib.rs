pub const WITH_TIMER: bool = true;

struct Timer {
    label: &'static str,
}

// impl Timer {
//     fn new(label: &'static str) -> Self {
//         if WITH_TIMER {
//             web_sys::console::time_with_label(label);
//         }
//         Self { label }
//     }
// }

impl Drop for Timer {
    fn drop(&mut self) {
        if WITH_TIMER {
            web_sys::console::time_end_with_label(self.label)
        }
    }
}

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
}

#[macro_export]
macro_rules! console_log {
    // Note that this is using the `log` function imported above during
    // `bare_bones`
    ($($t:tt)*) => ($crate::log(&format_args!($($t)*).to_string()))
}

mod audio;
pub mod languages;
pub mod worker;
pub mod token_output_stream;
