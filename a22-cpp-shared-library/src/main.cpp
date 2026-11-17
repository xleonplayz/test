#include "fluss.hpp"
#include <charconv>
#include <iostream>
#include <stdexcept>
int main(int argc,char** argv){
 try{
  std::string input,output,rule="edd",capacity;bool compare=false;
  for(int i=1;i<argc;++i){
   std::string arg=argv[i];
   if(arg=="--help"){
    std::cout<<"FLUSS · Produktionsplanung mit Kapazitäten und Wartung\n"
    <<"fluss --input examples/workshop --out results/baseline [--rule fcfs|spt|edd] [--compare] [--capacity station:2]\n"
    <<"Ein neues Ausgabeverzeichnis enthält report.html, schedule.csv, jobs.csv, summary.json und plan.svg.\n";return 0;
   }
   if(arg=="--compare"){compare=true;continue;}
   if(arg!="--input"&&arg!="--out"&&arg!="--rule"&&arg!="--capacity")throw std::runtime_error("Unbekannte Option: "+arg);
   if(++i>=argc)throw std::runtime_error("Wert fehlt für "+arg);
   if(arg=="--input")input=argv[i];else if(arg=="--out")output=argv[i];else if(arg=="--rule")rule=argv[i];else capacity=argv[i];
  }
  if(input.empty()||output.empty())throw std::runtime_error("--input und --out benötigt; siehe --help.");
  if(rule!="fcfs"&&rule!="spt"&&rule!="edd")throw std::runtime_error("Regel: fcfs, spt oder edd.");
  auto scenario=fluss::load(input);
  if(!capacity.empty()){
   auto colon=capacity.find(':');if(colon==std::string::npos)throw std::runtime_error("--capacity erwartet station:zahl.");
   auto name=capacity.substr(0,colon),value=capacity.substr(colon+1);int n=0;auto [end,err]=std::from_chars(value.data(),value.data()+value.size(),n);
   if(err!=std::errc{}||end!=value.data()+value.size()||n<1||n>8)throw std::runtime_error("Kapazität 1–8 erwartet.");
   bool found=false;for(auto& s:scenario.stations)if(s.name==name){s.capacity=n;found=true;}
   if(!found)throw std::runtime_error("Unbekannte Station: "+name);
  }
  std::vector<fluss::Result> results;
  if(compare)for(auto r:{fluss::Rule::Fcfs,fluss::Rule::Spt,fluss::Rule::Edd})results.push_back(fluss::simulate(scenario,r));
  else results.push_back(fluss::simulate(scenario,rule=="fcfs"?fluss::Rule::Fcfs:rule=="spt"?fluss::Rule::Spt:fluss::Rule::Edd));
  fluss::report(scenario,results,output);
  for(const auto& r:results)std::cout<<fluss::rule_name(r.rule)<<" · "<<r.makespan<<" min · "<<r.on_time<<'/'<<scenario.jobs.size()<<" termintreu · Ø Wartezeit "<<r.mean_wait<<" min\n";
  std::cout<<"Bericht: "<<output<<"/report.html\n";
 }catch(const std::exception& e){std::cerr<<"Fluss: "<<e.what()<<'\n';return 1;}
}
