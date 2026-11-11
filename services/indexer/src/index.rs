//! Builds the search index from Markdown documents: front matter, headings,
//! a summary, term frequencies per document and document frequencies.

use serde::Serialize;
use std::collections::{BTreeMap, HashMap};

const STOPWORDS: &[&str] = &[
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "has", "in", "is", "it", "its",
    "no", "not", "of", "on", "or", "our", "so", "that", "the", "this", "to", "we", "with", "you", "your",
];

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Doc {
    pub id: String,
    pub title: String,
    pub section: String,
    pub order: u32,
    pub url: String,
    pub headings: Vec<String>,
    pub summary: String,
    /// Plain text without Markdown markup, for snippets.
    pub text: String,
    pub length: usize,
    pub terms: BTreeMap<String, u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Index {
    pub version: u32,
    pub docs: Vec<Doc>,
    pub df: BTreeMap<String, u32>,
    pub avg_length: f64,
}

/// Lowercase, split on non-alphanumerics, drop stopwords, light suffix stemming.
pub fn tokenize(text: &str) -> Vec<String> {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(|w| stem(&w.to_lowercase()))
        .filter(|w| w.len() > 1 && !STOPWORDS.contains(&w.as_str()))
        .collect()
}

pub fn stem(w: &str) -> String {
    for suffix in ["ing", "ed"] {
        if w.len() > suffix.len() + 3 && w.ends_with(suffix) {
            return w[..w.len() - suffix.len()].to_string();
        }
    }
    for suffix in ["sses", "ches", "shes", "xes"] {
        if w.ends_with(suffix) {
            return w[..w.len() - 2].to_string();
        }
    }
    if w.len() > 3 && w.ends_with('s') && !w.ends_with("ss") {
        return w[..w.len() - 1].to_string();
    }
    w.to_string()
}

fn front_matter(src: &str) -> (HashMap<String, String>, &str) {
    let mut meta = HashMap::new();
    if let Some(rest) = src.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---\n") {
            for line in rest[..end].lines() {
                if let Some((k, v)) = line.split_once(':') {
                    meta.insert(k.trim().to_string(), v.trim().to_string());
                }
            }
            return (meta, &rest[end + 5..]);
        }
    }
    (meta, src)
}

/// Removes Markdown markup for indexing and snippets.
fn plain(body: &str) -> String {
    let mut out = String::new();
    for line in body.lines() {
        let l = line.trim();
        if l.starts_with("```") || l.starts_with("|---") {
            continue;
        }
        let l = l.trim_start_matches('#').trim_start_matches("- ").trim();
        let mut s = String::new();
        let mut chars = l.chars().peekable();
        while let Some(c) = chars.next() {
            match c {
                '`' | '*' | '|' => s.push(' '),
                '[' => {}
                ']' => {
                    // drop the (url) of a link
                    if chars.peek() == Some(&'(') {
                        for d in chars.by_ref() {
                            if d == ')' {
                                break;
                            }
                        }
                    }
                }
                _ => s.push(c),
            }
        }
        let s = s.split_whitespace().collect::<Vec<_>>().join(" ");
        if !s.is_empty() {
            out.push_str(&s);
            out.push('\n');
        }
    }
    out
}

pub fn parse(id: &str, src: &str) -> Doc {
    let (meta, body) = front_matter(src);
    let headings: Vec<String> = body
        .lines()
        .filter(|l| l.starts_with("## "))
        .map(|l| l.trim_start_matches('#').trim().to_string())
        .collect();
    let text = plain(body);
    let summary = body
        .split("\n\n")
        .map(str::trim)
        .find(|p| !p.is_empty() && !p.starts_with('#'))
        .map(|p| plain(p).replace('\n', " ").trim().to_string())
        .unwrap_or_default();
    let title = meta.get("title").cloned().unwrap_or_else(|| id.to_string());
    let mut terms = BTreeMap::new();
    // Title and headings count three times: a match there matters more.
    let boosted = format!("{t} {t} {t} {h} {h} {h}", t = title, h = headings.join(" "));
    let tokens: Vec<String> = tokenize(&text).into_iter().chain(tokenize(&boosted)).collect();
    for t in &tokens {
        *terms.entry(t.clone()).or_insert(0) += 1;
    }
    Doc {
        id: id.to_string(),
        url: format!("/docs/{id}"),
        section: meta.get("section").cloned().unwrap_or_else(|| "Docs".into()),
        order: meta.get("order").and_then(|o| o.parse().ok()).unwrap_or(99),
        title,
        headings,
        summary,
        length: tokens.len(),
        text,
        terms,
    }
}

pub fn build(sources: &[(&str, &str)]) -> Index {
    let mut docs: Vec<Doc> = sources.iter().map(|(id, src)| parse(id, src)).collect();
    docs.sort_by_key(|d| (d.order, d.id.clone()));
    let mut df = BTreeMap::new();
    for d in &docs {
        for t in d.terms.keys() {
            *df.entry(t.clone()).or_insert(0) += 1;
        }
    }
    let avg_length = if docs.is_empty() { 0.0 } else { docs.iter().map(|d| d.length).sum::<usize>() as f64 / docs.len() as f64 };
    Index { version: 1, docs, df, avg_length }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokenizes_and_stems() {
        assert_eq!(tokenize("The Carts are checking prices!"), vec!["cart", "check", "price"]);
    }

    #[test]
    fn parses_front_matter_and_headings() {
        let d = parse("x", "---\ntitle: Hello\nsection: S\norder: 2\n---\n# Hello\n\nFirst [link](/a) para.\n\n## Part one\n\ntext `code`\n");
        assert_eq!(d.title, "Hello");
        assert_eq!(d.order, 2);
        assert_eq!(d.headings, vec!["Part one"]);
        assert_eq!(d.summary, "First link para.");
        assert!(d.terms["hello"] >= 3);
    }

    #[test]
    fn builds_document_frequencies() {
        let idx = build(&[("a", "# A\n\ntea cup"), ("b", "# B\n\ntea pot")]);
        assert_eq!(idx.df["tea"], 2);
        assert_eq!(idx.df["cup"], 1);
    }
}
