#include "moderation.h"

#include <algorithm>
#include <cctype>

namespace {

char fold(char c) {
  switch (c) {
    case '0': return 'o';
    case '1': case '!': case '|': return 'i';
    case '3': return 'e';
    case '4': case '@': return 'a';
    case '5': case '$': return 's';
    case '7': return 't';
    default: return static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
  }
}

bool word_char(char c) {
  return std::isalnum(static_cast<unsigned char>(c)) || c == '@' || c == '$' || c == '!' || c == '|';
}

size_t count(const std::string& s, const std::string& needle) {
  size_t n = 0;
  for (size_t p = s.find(needle); p != std::string::npos; p = s.find(needle, p + 1)) ++n;
  return n;
}

}  // namespace

Moderator::Moderator(std::vector<std::string> blocked, int burst, std::chrono::seconds window)
    : blocked_(std::move(blocked)), burst_(burst), window_(window) {}

std::vector<std::string> Moderator::default_blocklist() {
  // Mild placeholder words; a real deployment loads its own list.
  return {"darn", "heck", "spam", "scam", "idiot", "stupid", "loser"};
}

Verdict Moderator::check(const std::string& user, const std::string& text,
                         std::chrono::steady_clock::time_point now) {
  Verdict v;
  v.text = text;
  {
    std::lock_guard<std::mutex> lock(mu_);
    ++checked_;
    auto& times = recent_[user];
    times.erase(std::remove_if(times.begin(), times.end(), [&](auto t) { return now - t > window_; }), times.end());
    if (static_cast<int>(times.size()) >= burst_) {
      ++refused_;
      v.allowed = false;
      v.reason = "slow down: too many messages";
      v.flags.push_back("flood");
      v.score = 100;
      return v;
    }
    times.push_back(now);
  }

  if (text.empty() || std::all_of(text.begin(), text.end(), [](unsigned char c) { return std::isspace(c); })) {
    std::lock_guard<std::mutex> lock(mu_);
    ++refused_;
    v.allowed = false;
    v.reason = "empty message";
    return v;
  }
  if (text.size() > 500) {
    std::lock_guard<std::mutex> lock(mu_);
    ++refused_;
    v.allowed = false;
    v.reason = "message longer than 500 characters";
    v.flags.push_back("too_long");
    v.score = 100;
    return v;
  }

  // Mask blocked words word by word, comparing the folded form.
  std::string out;
  bool masked = false;
  for (size_t i = 0; i < text.size();) {
    if (!word_char(text[i])) { out += text[i++]; continue; }
    size_t j = i;
    while (j < text.size() && word_char(text[j])) ++j;
    std::string word = text.substr(i, j - i), folded;
    for (char c : word) folded += fold(c);
    bool hit = std::find(blocked_.begin(), blocked_.end(), folded) != blocked_.end();
    if (hit) {
      out += word.substr(0, 1) + std::string(word.size() - 1, '*');
      masked = true;
    } else {
      out += word;
    }
    i = j;
  }
  if (masked) { v.flags.push_back("profanity"); v.score += 30; }
  v.text = out;

  size_t letters = 0, upper = 0;
  for (unsigned char c : text) if (std::isalpha(c)) { ++letters; if (std::isupper(c)) ++upper; }
  if (letters >= 8 && upper * 10 >= letters * 8) { v.flags.push_back("shouting"); v.score += 10; }

  size_t links = count(text, "http://") + count(text, "https://") + count(text, "www.");
  if (links > 2) { v.flags.push_back("link_spam"); v.score += 50; }

  size_t run = 1;
  for (size_t i = 1; i < text.size(); ++i) {
    run = text[i] == text[i - 1] ? run + 1 : 1;
    if (run >= 8) { v.flags.push_back("repeated_chars"); v.score += 10; break; }
  }

  if (v.score >= 50) {
    std::lock_guard<std::mutex> lock(mu_);
    ++refused_;
    v.allowed = false;
    v.reason = "message looks like spam";
  }
  return v;
}
