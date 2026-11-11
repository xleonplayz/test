#include "json.h"

#include <cctype>
#include <cstdio>

namespace json {
namespace {

struct Reader {
  const std::string& s;
  size_t i = 0;
  void ws() { while (i < s.size() && std::isspace(static_cast<unsigned char>(s[i]))) ++i; }
  bool eat(char c) { ws(); if (i < s.size() && s[i] == c) { ++i; return true; } return false; }

  static void put_utf8(std::string& out, unsigned cp) {
    if (cp < 0x80) out += static_cast<char>(cp);
    else if (cp < 0x800) { out += static_cast<char>(0xC0 | (cp >> 6)); out += static_cast<char>(0x80 | (cp & 0x3F)); }
    else if (cp < 0x10000) { out += static_cast<char>(0xE0 | (cp >> 12)); out += static_cast<char>(0x80 | ((cp >> 6) & 0x3F)); out += static_cast<char>(0x80 | (cp & 0x3F)); }
    else { out += static_cast<char>(0xF0 | (cp >> 18)); out += static_cast<char>(0x80 | ((cp >> 12) & 0x3F)); out += static_cast<char>(0x80 | ((cp >> 6) & 0x3F)); out += static_cast<char>(0x80 | (cp & 0x3F)); }
  }

  bool hex4(unsigned& v) {
    if (i + 4 > s.size()) return false;
    v = 0;
    for (int k = 0; k < 4; ++k) {
      char c = s[i++];
      v <<= 4;
      if (c >= '0' && c <= '9') v |= c - '0';
      else if (c >= 'a' && c <= 'f') v |= c - 'a' + 10;
      else if (c >= 'A' && c <= 'F') v |= c - 'A' + 10;
      else return false;
    }
    return true;
  }

  bool string(std::string& out) {
    ws();
    if (i >= s.size() || s[i] != '"') return false;
    ++i;
    while (i < s.size()) {
      char c = s[i++];
      if (c == '"') return true;
      if (c != '\\') { out += c; continue; }
      if (i >= s.size()) return false;
      char e = s[i++];
      switch (e) {
        case '"': out += '"'; break;
        case '\\': out += '\\'; break;
        case '/': out += '/'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case 'n': out += '\n'; break;
        case 'r': out += '\r'; break;
        case 't': out += '\t'; break;
        case 'u': {
          unsigned cp;
          if (!hex4(cp)) return false;
          if (cp >= 0xD800 && cp <= 0xDBFF && i + 6 <= s.size() && s[i] == '\\' && s[i + 1] == 'u') {
            i += 2;
            unsigned lo;
            if (!hex4(lo)) return false;
            cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00);
          }
          put_utf8(out, cp);
          break;
        }
        default: return false;
      }
    }
    return false;
  }

  // Skips any JSON value; returns its raw text for scalars.
  bool skip_value(std::string& raw) {
    ws();
    if (i >= s.size()) return false;
    char c = s[i];
    if (c == '"') return string(raw);
    if (c == '{' || c == '[') {
      int depth = 0;
      bool in_str = false;
      for (; i < s.size(); ++i) {
        char d = s[i];
        if (in_str) { if (d == '\\') ++i; else if (d == '"') in_str = false; continue; }
        if (d == '"') in_str = true;
        else if (d == '{' || d == '[') ++depth;
        else if (d == '}' || d == ']') { if (--depth == 0) { ++i; return true; } }
      }
      return false;
    }
    size_t start = i;
    while (i < s.size() && s[i] != ',' && s[i] != '}' && !std::isspace(static_cast<unsigned char>(s[i]))) ++i;
    raw = s.substr(start, i - start);
    return !raw.empty();
  }
};

}  // namespace

bool parse_flat_object(const std::string& in, std::map<std::string, std::string>& out) {
  Reader r{in};
  if (!r.eat('{')) return false;
  if (r.eat('}')) return true;
  do {
    std::string key, value;
    if (!r.string(key) || !r.eat(':') || !r.skip_value(value)) return false;
    out[key] = value;
  } while (r.eat(','));
  return r.eat('}');
}

std::string quote(const std::string& s) {
  std::string out = "\"";
  for (unsigned char c : s) {
    switch (c) {
      case '"': out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default:
        if (c < 0x20) { char buf[8]; snprintf(buf, sizeof buf, "\\u%04x", c); out += buf; }
        else out += static_cast<char>(c);
    }
  }
  return out + "\"";
}

}  // namespace json
