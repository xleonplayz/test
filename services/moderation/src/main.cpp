// Moderation service of the chat: every message passes through POST /moderate
// before the chat server broadcasts it. Private; only the chat server calls it.
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <map>
#include <string>

#include "httplib.h"
#include "json.h"
#include "moderation.h"

int main() {
  const char* port_env = std::getenv("PORT");
  int port = port_env ? std::atoi(port_env) : 6000;
  auto started = std::chrono::steady_clock::now();
  Moderator moderator;
  httplib::Server server;

  server.Get("/health", [&](const httplib::Request&, httplib::Response& res) {
    auto up = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::steady_clock::now() - started).count();
    res.set_content("{\"ok\":true,\"service\":\"moderation\",\"lang\":\"c++\",\"uptimeS\":" + std::to_string(up) +
                        ",\"checked\":" + std::to_string(moderator.checked()) +
                        ",\"refused\":" + std::to_string(moderator.refused()) + "}",
                    "application/json");
  });

  server.Post("/moderate", [&](const httplib::Request& req, httplib::Response& res) {
    std::map<std::string, std::string> in;
    if (!json::parse_flat_object(req.body, in) || !in.count("text")) {
      res.status = 400;
      res.set_content("{\"error\":\"expected {\\\"user\\\":\\\"…\\\",\\\"text\\\":\\\"…\\\"}\"}", "application/json");
      return;
    }
    Verdict v = moderator.check(in.count("user") ? in["user"] : "anonymous", in["text"]);
    std::string flags = "[";
    for (size_t i = 0; i < v.flags.size(); ++i) flags += (i ? "," : "") + json::quote(v.flags[i]);
    flags += "]";
    res.set_content("{\"allowed\":" + std::string(v.allowed ? "true" : "false") + ",\"text\":" + json::quote(v.text) +
                        ",\"flags\":" + flags + ",\"score\":" + std::to_string(v.score) +
                        (v.reason.empty() ? "" : ",\"reason\":" + json::quote(v.reason)) + "}",
                    "application/json");
  });

  server.set_error_handler([](const httplib::Request&, httplib::Response& res) {
    if (res.body.empty()) res.set_content("{\"error\":\"not found\"}", "application/json");
  });

  std::printf("moderation listening on %d\n", port);
  std::fflush(stdout);
  if (!server.listen("0.0.0.0", port)) {
    std::fprintf(stderr, "cannot listen on %d\n", port);
    return 1;
  }
  return 0;
}
