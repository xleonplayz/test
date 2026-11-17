#include "fluss.hpp"
#include <algorithm>
#include <charconv>
#include <fstream>
#include <limits>
#include <map>
#include <set>
#include <sstream>
#include <stdexcept>
#include <tuple>
namespace fluss {
Csv parse_csv(std::istream& input) {
    Csv rows; std::vector<std::string> row; std::string cell;
    bool quoted = false, closed = false, touched = false;
    char c;
    while (input.get(c)) {
        if (quoted) {
            if (c == '"') {
                if (input.peek() == '"') { input.get(c); cell += '"'; }
                else { quoted = false; closed = true; }
            } else cell += c;
            if (cell.size() > 64000) throw std::runtime_error("CSV-Feld zu groß.");
            continue;
        }
        if (c == ',' || c == '\n' || c == '\r') {
            if (c == ',' || touched || !row.empty() || !cell.empty()) row.push_back(cell);
            cell.clear(); closed = false;
            if (c == ',') touched = true;
            else {
                if (c == '\r' && input.peek() == '\n') input.get(c);
                if (!row.empty()) rows.push_back(row);
                row.clear(); touched = false;
            }
        } else if (c == '"' && cell.empty() && !closed) { quoted = true; touched = true; }
        else {
            if (closed || c == '"') throw std::runtime_error("Ungültige CSV-Anführungszeichen.");
            cell += c; touched = true;
        }
        if (rows.size() > 10000 || cell.size() > 64000) throw std::runtime_error("CSV-Datei zu groß.");
    }
    if (quoted) throw std::runtime_error("Nicht geschlossenes CSV-Feld.");
    if (input.bad()) throw std::runtime_error("CSV konnte nicht gelesen werden.");
    if (touched || !row.empty() || !cell.empty()) { row.push_back(cell); rows.push_back(row); }
    if (!rows.empty() && !rows[0].empty() && rows[0][0].starts_with("\xef\xbb\xbf")) rows[0][0].erase(0,3);
    return rows;
}
std::string csv_cell(const std::string& text) {
    std::string result = "\"";
    if (!text.empty() && (text[0] == '=' || text[0] == '+' || text[0] == '-' || text[0] == '@')) result += '\'';
    for (char c : text) { if (c == '"') result += '"'; result += c; }
    return result + '"';
}
namespace {
Time number(const std::string& s, Time minimum, Time maximum) {
    Time n{};
    auto [end, error] = std::from_chars(s.data(), s.data()+s.size(), n);
    if (error != std::errc{} || end != s.data()+s.size() || n < minimum || n > maximum)
        throw std::runtime_error("Ungültige ganze Zahl: " + s);
    return n;
}
Csv read(const std::filesystem::path& path, const std::vector<std::string>& header) {
    if (std::filesystem::file_size(path) > 8*1024*1024) throw std::runtime_error("CSV größer als 8 MB.");
    std::ifstream input(path);
    if (!input) throw std::runtime_error("Datei nicht lesbar: " + path.string());
    auto rows = parse_csv(input);
    if (rows.empty() || rows[0] != header) throw std::runtime_error("Falsche CSV-Kopfzeile: " + path.string());
    rows.erase(rows.begin());
    for (const auto& row : rows) if (row.size() != header.size()) throw std::runtime_error("Falsche Spaltenzahl: " + path.string());
    return rows;
}
bool station_name(const std::string& s) {
    return !s.empty() && s.size()<=40 && std::all_of(s.begin(),s.end(),[](unsigned char c){return (c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='_'||c=='-';});
}
}
Scenario load(const std::filesystem::path& directory) {
    Scenario s; std::map<std::string,int> ids;
    for (const auto& row : read(directory/"stations.csv",{"station","capacity"})) {
        if (!station_name(row[0]) || ids.contains(row[0])) throw std::runtime_error("Stationsnamen müssen eindeutig und alphanumerisch sein.");
        ids[row[0]]=static_cast<int>(s.stations.size());
        s.stations.push_back({row[0],static_cast<int>(number(row[1],1,8))});
    }
    for (const auto& row : read(directory/"jobs.csv",{"job","release","due","route"})) {
        Job j{row[0],number(row[1],0,1000000),number(row[2],0,100000000),{}};
        std::istringstream route(row[3]); std::string part;
        if (row[3].empty() || row[3].back()=='|') throw std::runtime_error("Route fehlt oder ist unvollständig.");
        while (std::getline(route,part,'|')) {
            auto colon=part.find(':');
            if (colon==std::string::npos || !ids.contains(part.substr(0,colon))) throw std::runtime_error("Route referenziert unbekannte Station: "+part);
            j.route.push_back({ids.at(part.substr(0,colon)),number(part.substr(colon+1),1,1000000)});
        }
        s.jobs.push_back(j);
    }
    if (std::filesystem::exists(directory/"maintenance.csv")) {
        for (const auto& row : read(directory/"maintenance.csv",{"station","start","end"})) {
            if (!ids.contains(row[0])) throw std::runtime_error("Unbekannte Wartungsstation.");
            s.maintenance.push_back({ids.at(row[0]),number(row[1],0,100000000),number(row[2],0,100000000)});
        }
    }
    validate(s);
    return s;
}
void validate(const Scenario& s) {
    if (s.stations.empty() || s.stations.size()>32 || s.jobs.empty() || s.jobs.size()>1000 || s.maintenance.size()>1000)
        throw std::runtime_error("Erwartet: 1–32 Stationen, 1–1000 Aufträge, maximal 1000 Wartungen.");
    std::set<std::string> names, jobs;
    for (const auto& station:s.stations) if (!station_name(station.name)||station.capacity<1||station.capacity>8||!names.insert(station.name).second)
        throw std::runtime_error("Ungültige Station oder Kapazität.");
    for (const auto& j:s.jobs) {
        if (j.id.empty()||j.id.size()>80||j.id.find_first_of("\r\n\t")!=std::string::npos||!jobs.insert(j.id).second||j.release<0||j.release>1000000||j.due<j.release||j.due>100000000||j.route.empty()||j.route.size()>20)
            throw std::runtime_error("Auftrag, Termin oder Route ungültig: "+j.id);
        for (auto op:j.route) if (op.station<0||op.station>=static_cast<int>(s.stations.size())||op.duration<1||op.duration>1000000) throw std::runtime_error("Ungültiger Arbeitsschritt.");
    }
    for (auto m:s.maintenance) if(m.station<0||m.station>=static_cast<int>(s.stations.size())||m.start<0||m.end<=m.start||m.end>100000000) throw std::runtime_error("Ungültiges Wartungsfenster.");
}
std::string rule_name(Rule rule) {
    switch(rule){case Rule::Fcfs:return "FCFS";case Rule::Spt:return "SPT";case Rule::Edd:return "EDD";}
    return "";
}
Result simulate(const Scenario& s, Rule rule) {
    validate(s);
    const int n=static_cast<int>(s.jobs.size());
    std::vector<int> progress(n,0);
    std::vector<Time> ready(n),finish(n,-1);
    std::vector<bool> running(n,false);
    for(int i=0;i<n;++i)ready[i]=s.jobs[i].release;
    std::vector<std::vector<Time>> slots;
    for(auto station:s.stations)slots.emplace_back(station.capacity,0);
    std::vector<Segment> active;
    Result r; r.rule=rule;
    Time time=0; int completed=0;
    auto fits=[&](int station,Time start,Time duration){
        return std::none_of(s.maintenance.begin(),s.maintenance.end(),[&](auto m){return m.station==station&&start<m.end&&start+duration>m.start;});
    };
    while(completed<n) {
        for(auto it=active.begin();it!=active.end();) {
            if(it->end<=time) {
                int j=it->job;
                running[j]=false;ready[j]=it->end;++progress[j];
                if(progress[j]==static_cast<int>(s.jobs[j].route.size())){finish[j]=it->end;++completed;}
                it=active.erase(it);
            }else ++it;
        }
        if(completed==n)break;
        for(int station=0;station<static_cast<int>(s.stations.size());++station) {
            for(int slot=0;slot<s.stations[station].capacity;++slot) {
                if(slots[station][slot]>time)continue;
                int best=-1;
                auto rank=[&](int j){
                    Time first=rule==Rule::Fcfs?ready[j]:rule==Rule::Spt?s.jobs[j].route[progress[j]].duration:s.jobs[j].due;
                    return std::tuple{first,ready[j],s.jobs[j].id};
                };
                for(int j=0;j<n;++j) {
                    if(running[j]||finish[j]>=0||ready[j]>time)continue;
                    auto op=s.jobs[j].route[progress[j]];
                    if(op.station!=station||!fits(station,time,op.duration))continue;
                    if(best<0||rank(j)<rank(best))best=j;
                }
                if(best<0)continue;
                Time duration=s.jobs[best].route[progress[best]].duration;
                Segment seg{best,progress[best],station,slot,ready[best],time,time+duration};
                r.schedule.push_back(seg);active.push_back(seg);
                running[best]=true;slots[station][slot]=time+duration;
            }
        }
        Time next=std::numeric_limits<Time>::max();
        for(auto event:active)if(event.end>time)next=std::min(next,event.end);
        for(int j=0;j<n;++j)if(!running[j]&&finish[j]<0&&ready[j]>time)next=std::min(next,ready[j]);
        for(auto m:s.maintenance)if(m.end>time)next=std::min(next,m.end);
        if(next==std::numeric_limits<Time>::max())throw std::runtime_error("Planung kann nicht fortgesetzt werden.");
        time=next;
    }
    r.makespan=*std::max_element(finish.begin(),finish.end());
    for(int j=0;j<n;++j){
        Time processing=0;for(auto op:s.jobs[j].route)processing+=op.duration;
        JobResult result{j,finish[j],finish[j]-s.jobs[j].release,finish[j]-s.jobs[j].release-processing,std::max<Time>(0,finish[j]-s.jobs[j].due)};
        if(!result.late)++r.on_time;
        r.mean_flow+=static_cast<double>(result.flow);r.mean_wait+=static_cast<double>(result.waiting);r.jobs.push_back(result);
    }
    r.mean_flow/=n;r.mean_wait/=n;
    for(int station=0;station<static_cast<int>(s.stations.size());++station){
        Time busy=0;for(auto seg:r.schedule)if(seg.station==station)busy+=seg.end-seg.start;
        std::vector<std::pair<Time,Time>> windows;
        for(auto m:s.maintenance)if(m.station==station&&m.start<r.makespan)windows.emplace_back(m.start,std::min(m.end,r.makespan));
        std::sort(windows.begin(),windows.end());Time unavailable=0,end=0;
        for(auto [a,b]:windows){unavailable+=std::max<Time>(0,b-std::max(a,end));end=std::max(end,b);}
        Time available=(r.makespan-unavailable)*s.stations[station].capacity;
        r.stations.push_back({station,busy,available,available?100.0*busy/available:0.0});
    }
    return r;
}
}
