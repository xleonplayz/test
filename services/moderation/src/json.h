// Minimal JSON helpers: parse a flat object of string/number/bool fields and
// escape strings for output. Enough for the moderation API; not a general parser.
#pragma once
#include <map>
#include <string>

namespace json {

// Parses {"key": "value", "n": 1, "b": true}. Nested values are skipped.
// Returns false on malformed input. Numbers and booleans are kept as text.
bool parse_flat_object(const std::string& in, std::map<std::string, std::string>& out);

std::string quote(const std::string& s);

}  // namespace json
