// Assertions must run in release builds too.
#undef NDEBUG
#include <cassert>
#include <cstdio>
#include <map>

#include "json.h"
#include "moderation.h"

int main() {
  using namespace std::chrono;
  Moderator m;
  auto t = steady_clock::now();

  auto a = m.check("ann", "hello there", t);
  assert(a.allowed && a.text == "hello there" && a.flags.empty());

  auto b = m.check("bob", "what a sc4m, you 1diot", t);
  assert(b.allowed);
  assert(b.text == "what a s***, you 1****");

  auto c = m.check("cid", "visit http://a http://b www.c now", t);
  assert(!c.allowed);

  auto d = m.check("dan", "WHY IS NOBODY ANSWERING", t);
  assert(d.allowed && d.flags.size() == 1 && d.flags[0] == "shouting");

  for (int i = 0; i < 5; ++i) assert(m.check("eve", "msg", t + seconds(i)).allowed);
  assert(!m.check("eve", "one more", t + seconds(5)).allowed);
  assert(m.check("eve", "later", t + seconds(30)).allowed);

  std::map<std::string, std::string> obj;
  assert(json::parse_flat_object(R"({"user":"ann","text":"hi \"you\" é","n":3,"x":{"y":[1,2]}})", obj));
  assert(obj["user"] == "ann" && obj["text"] == "hi \"you\" \xc3\xa9" && obj["n"] == "3");
  assert(!json::parse_flat_object("{\"a\":", obj));
  assert(json::quote("a\"b\n") == "\"a\\\"b\\n\"");

  std::puts("moderation tests passed");
  return 0;
}
