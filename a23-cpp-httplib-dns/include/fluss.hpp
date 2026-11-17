#pragma once
#include <cstdint>
#include <filesystem>
#include <istream>
#include <string>
#include <vector>
namespace fluss {
using Time = std::int64_t;
using Csv = std::vector<std::vector<std::string>>;
Csv parse_csv(std::istream& input);
std::string csv_cell(const std::string& text);
struct Station { std::string name; int capacity; };
struct Operation { int station; Time duration; };
struct Job { std::string id; Time release, due; std::vector<Operation> route; };
struct Maintenance { int station; Time start, end; };
struct Scenario { std::vector<Station> stations; std::vector<Job> jobs; std::vector<Maintenance> maintenance; };
enum class Rule { Fcfs, Spt, Edd };
std::string rule_name(Rule rule);
Scenario load(const std::filesystem::path& directory);
void validate(const Scenario& scenario);
struct Segment { int job, operation, station, slot; Time ready, start, end; };
struct JobResult { int job; Time finish, flow, waiting, late; };
struct StationResult { int station; Time busy, available; double utilization; };
struct Result {
    Rule rule;
    Time makespan{};
    int on_time{};
    double mean_flow{}, mean_wait{};
    std::vector<Segment> schedule;
    std::vector<JobResult> jobs;
    std::vector<StationResult> stations;
};
Result simulate(const Scenario& scenario, Rule rule);
void report(const Scenario& scenario, const std::vector<Result>& results, const std::filesystem::path& output);
std::string svg(const Scenario& scenario, const Result& result);
}
