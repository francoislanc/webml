#!/bin/bash

rm -r $(dirname "$0")/../src/webml
cp -r $(dirname "$0")/../../../webml-rust/build $(dirname "$0")/../src/webml