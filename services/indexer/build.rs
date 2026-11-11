// Embeds every Markdown file under docs/ into the binary, so the indexer needs
// no file access at run time.
use std::{env, fs, path::Path};

fn main() {
    println!("cargo:rerun-if-changed=docs");
    let mut files: Vec<_> = fs::read_dir("docs")
        .expect("docs/ directory")
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|x| x == "md"))
        .collect();
    files.sort();
    let mut out = String::from("pub static DOCS: &[(&str, &str)] = &[\n");
    for f in &files {
        let abs = fs::canonicalize(f).unwrap();
        let name = f.file_stem().unwrap().to_string_lossy();
        out += &format!("    ({:?}, include_str!({:?})),\n", name, abs.display().to_string());
    }
    out += "];\n";
    fs::write(Path::new(&env::var("OUT_DIR").unwrap()).join("docs.rs"), out).unwrap();
}
