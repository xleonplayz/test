#include "fluss.hpp"
#include <algorithm>
#include <chrono>
#include <cmath>
#include <fstream>
#include <functional>
#include <iostream>
#include <sstream>
#include <stdexcept>
using namespace fluss;
void check(bool value,const std::string& message){if(!value)throw std::runtime_error(message);}
template<typename F> void rejects(F f){bool thrown=false;try{f();}catch(const std::exception&){thrown=true;}check(thrown,"Expected rejection");}
Scenario simple(){return {{{"work",1}},{{"A",0,100,{{0,10}}},{"B",0,5,{{0,2}}}},{}};}
void invariants(const Scenario& s,const Result& r){
 std::size_t count=0;for(const auto& j:s.jobs)count+=j.route.size();
 check(r.schedule.size()==count,"Every operation scheduled once");
 for(const auto& a:r.schedule){
  const auto& j=s.jobs[a.job];check(a.end-a.start==j.route[a.operation].duration,"Duration");
  check(a.start>=a.ready&&a.start>=j.release,"Readiness");
  check(a.slot>=0&&a.slot<s.stations[a.station].capacity,"Capacity slot");
  if(a.operation){auto p=std::find_if(r.schedule.begin(),r.schedule.end(),[&](auto b){return b.job==a.job&&b.operation==a.operation-1;});check(p!=r.schedule.end()&&p->end==a.ready,"Precedence");}
  for(const auto& b:r.schedule)if(&a!=&b&&a.station==b.station&&a.slot==b.slot)check(a.end<=b.start||b.end<=a.start,"No slot overlap");
  for(auto m:s.maintenance)if(a.station==m.station)check(a.end<=m.start||a.start>=m.end,"No maintenance overlap");
 }
 for(auto station:r.stations)check(station.utilization>=0&&station.utilization<=100.00001,"Utilization bounds");
}
int main(){
 int count=0;auto test=[&](const char* name,const std::function<void()>& f){f();++count;std::cout<<"PASS "<<name<<'\n';};
 try{
 test("CSV quoting and malformed input",[]{
  std::istringstream in("a,b\r\n\"x,y\",\"hello \"\"world\"\"\nnext\"\r\n");auto csv=parse_csv(in);
  check(csv.size()==2&&csv[1][0]=="x,y"&&csv[1][1]=="hello \"world\"\nnext","CSV quoted fields");
  std::istringstream bad("a,\"unfinished");rejects([&]{parse_csv(bad);});
  std::istringstream long_field("\""+std::string(64001,'x')+"\"");rejects([&]{parse_csv(long_field);});
  check(csv_cell("=1+1")=="\"'=1+1\"","Spreadsheet formula protection");
 });
 test("dispatch rules produce distinct deadlines",[]{
  auto s=simple();auto fcfs=simulate(s,Rule::Fcfs),spt=simulate(s,Rule::Spt),edd=simulate(s,Rule::Edd);
  check(fcfs.makespan==12&&fcfs.on_time==1&&fcfs.jobs[1].late==7,"FCFS");
  check(spt.schedule[0].job==1&&spt.on_time==2&&edd.on_time==2,"SPT and EDD");invariants(s,fcfs);invariants(s,spt);
 });
 test("capacity allows simultaneous execution",[]{
  auto s=simple();s.stations[0].capacity=2;auto r=simulate(s,Rule::Edd);
  check(r.makespan==10&&r.schedule[0].start==0&&r.schedule[1].start==0,"Parallel slots");invariants(s,r);
 });
 test("maintenance blocks a long operation but permits a fitting short one",[]{
  auto s=simple();s.jobs[0].route[0].duration=6;s.maintenance={{0,4,10}};
  auto r=simulate(s,Rule::Fcfs);check(r.schedule[0].job==1&&r.jobs[0].finish==16,"Maintenance fitting");
  invariants(s,r);
 });
 test("overlapping maintenance is only deducted once",[]{
  Scenario s{{{"work",1}},{{"A",0,20,{{0,2}}},{"B",0,30,{{0,4}}}},{{0,2,8},{0,5,10}}};
  auto r=simulate(s,Rule::Fcfs);check(r.makespan==14&&r.stations[0].available==6,"Maintenance union");check(std::abs(r.stations[0].utilization-100.0)<0.0001,"Utilization");invariants(s,r);
 });
 test("routes, release times and determinism",[]{
  Scenario s{{{"a",2},{"b",1}},{{"A",5,40,{{0,4},{1,5},{0,2}}},{"B",0,30,{{1,3},{0,6}}}},{{0,12,18}}};
  for(auto rule:{Rule::Fcfs,Rule::Spt,Rule::Edd}){auto a=simulate(s,rule),b=simulate(s,rule);invariants(s,a);check(a.makespan==b.makespan&&a.mean_wait==b.mean_wait,"Deterministic result");}
 });
 test("SVG labels preserve UTF-8 boundaries",[]{
  auto s=simple();s.jobs.resize(1);s.jobs[0].id="ÄÖÜXä";
  check(svg(s,simulate(s,Rule::Edd)).find(">ÄÖÜX</text>")!=std::string::npos,"UTF-8 label boundary");
 });
 test("invalid scenarios fail before simulation",[]{
  auto s=simple();s.jobs[1].id="A";rejects([&]{simulate(s,Rule::Edd);});
  s=simple();s.jobs[0].route[0].station=9;rejects([&]{simulate(s,Rule::Edd);});
  s=simple();s.stations[0].capacity=0;rejects([&]{simulate(s,Rule::Edd);});
 });
 test("report is complete and never overwrites existing output",[]{
  auto folder=std::filesystem::temp_directory_path()/("fluss-test-"+std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
  auto s=simple();auto result=simulate(s,Rule::Edd);
  try{
   report(s,{result},folder);
   for(auto file:{"report.html","summary.json","jobs.csv","schedule.csv","plan.svg"})check(std::filesystem::file_size(folder/file)>20,"Report file");
   rejects([&]{report(s,{result},folder);});
   std::ifstream input(folder/"summary.json");std::stringstream content;content<<input.rdbuf();check(content.str().find("\"makespan\":12")!=std::string::npos,"JSON result");
   std::filesystem::remove_all(folder);
  }catch(...){std::filesystem::remove_all(folder);throw;}
 });
 std::cout<<count<<" tests passed\n";return 0;
 }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<'\n';return 1;}
}
