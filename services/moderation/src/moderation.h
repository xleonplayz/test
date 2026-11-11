// Message moderation: masks blocked words (also when written with digits or
// symbols, like "b4d"), flags shouting, link spam, repeated characters and
// floods, and refuses messages that are too long or come too fast.
#pragma once
#include <chrono>
#include <map>
#include <mutex>
#include <string>
#include <vector>

struct Verdict {
  bool allowed = true;
  std::string text;              // the message as it may be shown
  std::vector<std::string> flags;
  int score = 0;                 // 0 = clean, higher = worse
  std::string reason;            // set when not allowed
};

class Moderator {
 public:
  explicit Moderator(std::vector<std::string> blocked = default_blocklist(),
                     int burst = 5, std::chrono::seconds window = std::chrono::seconds(10));

  Verdict check(const std::string& user, const std::string& text,
                std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now());

  static std::vector<std::string> default_blocklist();
  size_t checked() const { return checked_; }
  size_t refused() const { return refused_; }

 private:
  std::vector<std::string> blocked_;
  int burst_;
  std::chrono::seconds window_;
  std::mutex mu_;
  std::map<std::string, std::vector<std::chrono::steady_clock::time_point>> recent_;
  size_t checked_ = 0;
  size_t refused_ = 0;
};
