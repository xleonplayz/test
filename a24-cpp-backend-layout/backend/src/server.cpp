#include "fluss.hpp"
#include "httplib.h"
#include <cstdlib>
#include <fstream>
#include <netdb.h>
#include <sstream>
#include <mutex>
#ifdef SAMPLE_POSTGRES
#include <libpq-fe.h>
#endif
#ifdef SAMPLE_SHARED
extern "C" int sample_capacity(int);
#endif
#ifndef SAMPLE_ROOT
#define SAMPLE_ROOT "."
#endif
int main(){
 try{
  httplib::Server server;
  server.set_read_timeout(5,0);server.set_write_timeout(5,0);server.set_payload_max_length(128000);
  const auto root=std::filesystem::path(std::getenv("APP_ROOT")?std::getenv("APP_ROOT"):".");
  auto scenario=fluss::load(root/"examples/workshop");std::mutex mutex;
  server.Get("/health",[](const auto&,auto&res){res.set_content("{\"ok\":true}","application/json");});
  server.Get("/api/dns",[](const auto&,auto&res){addrinfo* result=nullptr;const int code=getaddrinfo("localhost","8080",nullptr,&result);if(result)freeaddrinfo(result);res.status=code?502:200;res.set_content(code?"{\"error\":\"dns_failed\"}":"{\"resolved\":true}","application/json");});
  server.Get("/api/build",[](const auto&,auto&res){std::string s="{\"language\":\"cpp\"";
#ifdef SAMPLE_POSTGRES
   s+=",\"libpq\":"+std::to_string(PQlibVersion());
#endif
#ifdef SAMPLE_SHARED
   s+=",\"sharedCapacity\":"+std::to_string(sample_capacity(2));
#endif
   res.set_content(s+"}","application/json");});
  server.Get("/api/plan",[&](const auto&req,auto&res){
   try{std::lock_guard lock(mutex);auto input=scenario;
    if(req.has_param("capacity")){const auto value=req.get_param_value("capacity");size_t end=0;int n=std::stoi(value,&end);if(end!=value.size()||n<1||n>8)throw std::runtime_error("capacity 1-8 required");input.stations[0].capacity=n;}
    auto rule=fluss::Rule::Edd;if(req.has_param("rule")){auto name=req.get_param_value("rule");if(name=="fcfs")rule=fluss::Rule::Fcfs;else if(name=="spt")rule=fluss::Rule::Spt;else if(name!="edd")throw std::runtime_error("invalid rule");}
    auto result=fluss::simulate(input,rule);
    if(req.has_param("format")&&req.get_param_value("format")=="svg"){res.set_content(fluss::svg(input,result),"image/svg+xml");return;}
    std::ostringstream s;s<<"{\"jobs\":"<<input.jobs.size()<<",\"makespan\":"<<result.makespan<<",\"onTime\":"<<result.on_time<<",\"meanWait\":"<<result.mean_wait<<",\"segments\":[";
    bool first=true;for(const auto& x:result.schedule){if(!first)s<<',';first=false;s<<"{\"job\":"<<x.job<<",\"station\":"<<x.station<<",\"start\":"<<x.start<<",\"end\":"<<x.end<<'}';}s<<"]}";res.set_content(s.str(),"application/json");
   }catch(const std::exception&){res.status=400;res.set_content("{\"error\":\"invalid_plan_parameters\"}","application/json");}
  });
  server.Get("/",[&](const auto&,auto&res){std::ifstream f(root/"web/index.html");std::ostringstream s;s<<f.rdbuf();res.set_content(s.str(),"text/html; charset=utf-8");});
  server.Get("/app.js",[&](const auto&,auto&res){std::ifstream f(root/"web/app.js");std::ostringstream s;s<<f.rdbuf();res.set_content(s.str(),"text/javascript");});
  server.Get("/style.css",[&](const auto&,auto&res){std::ifstream f(root/"web/style.css");std::ostringstream s;s<<f.rdbuf();res.set_content(s.str(),"text/css");});
  const int port=std::getenv("PORT")?std::stoi(std::getenv("PORT")):8080;
  if(!server.listen(std::getenv("HOST")?std::getenv("HOST"):"127.0.0.1",port))throw std::runtime_error("listen failed");
 }catch(const std::exception&e){std::cerr<<e.what()<<'\n';return 1;}
}
