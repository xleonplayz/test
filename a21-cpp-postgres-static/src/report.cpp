#include "fluss.hpp"
#include <tuple>
#include <algorithm>
#include <chrono>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <stdexcept>
namespace fluss {
namespace {
std::string html(const std::string& value) {
    std::string result;
    for(char c:value){switch(c){case '&':result+="&amp;";break;case '<':result+="&lt;";break;case '>':result+="&gt;";break;case '"':result+="&quot;";break;default:result+=c;}}
    return result;
}
std::string short_label(const std::string& value) {
    std::size_t end = std::min<std::size_t>(8, value.size());
    while (end < value.size() && end > 0 && (static_cast<unsigned char>(value[end]) & 0xc0) == 0x80) --end;
    return value.substr(0, end);
}
std::string json(const std::string& value) {
    std::ostringstream out;out<<'"';
    for(unsigned char c:value){
        if(c=='"'||c=='\\')out<<'\\'<<c;
        else if(c<32)out<<"\\u"<<std::hex<<std::setw(4)<<std::setfill('0')<<static_cast<int>(c)<<std::dec;
        else out<<c;
    }out<<'"';return out.str();
}
void write(const std::filesystem::path& p,const std::string& data){std::ofstream f(p,std::ios::binary);f<<data;f.close();if(!f)throw std::runtime_error("Datei konnte nicht geschrieben werden: "+p.string());}
}
std::string svg(const Scenario& s,const Result& r) {
    const char* colors[]={"#7bd4bf","#e9b875","#86bce5","#bf9be5","#f19b8d","#b0ca77"};
    int lanes=0;for(auto st:s.stations)lanes+=st.capacity;
    const int width=1120,height=lanes*46+95;const double scale=900.0/std::max<Time>(1,r.makespan);
    std::ostringstream out;out<<std::fixed<<std::setprecision(2);
    out<<"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 "<<width<<' '<<height<<"\" role=\"img\" aria-label=\"Zeitplan "<<rule_name(r.rule)<<"\">";
    out<<"<rect width=\"100%\" height=\"100%\" fill=\"#14232c\"/>";
    for(int tick=0;tick<=6;++tick){double x=190+900.0*tick/6;out<<"<line x1=\""<<x<<"\" x2=\""<<x<<"\" y1=\"30\" y2=\""<<height-35<<"\" stroke=\"#2e424c\"/><text x=\""<<x<<"\" y=\""<<height-12<<"\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"10\" fill=\"#bbced6\">"<<r.makespan*tick/6<<" min</text>";}
    int offset=0;
    for(int st=0;st<static_cast<int>(s.stations.size());++st){
        for(int slot=0;slot<s.stations[st].capacity;++slot){
            int y=30+(offset+slot)*46;
            out<<"<text x=\"18\" y=\""<<y+21<<"\" font-family=\"sans-serif\" font-size=\"12\" fill=\"#dceaf0\">"<<html(s.stations[st].name)<<" / "<<slot+1<<"</text>";
            for(auto m:s.maintenance)if(m.station==st&&m.start<r.makespan)out<<"<rect x=\""<<190+m.start*scale<<"\" y=\""<<y<<"\" width=\""<<(std::min(m.end,r.makespan)-m.start)*scale<<"\" height=\"31\" fill=\"#4c3b38\"><title>Wartung "<<m.start<<"–"<<m.end<<" min</title></rect>";
            for(auto seg:r.schedule)if(seg.station==st&&seg.slot==slot){
                double w=(seg.end-seg.start)*scale;
                out<<"<rect x=\""<<190+seg.start*scale<<"\" y=\""<<y<<"\" width=\""<<w<<"\" height=\"31\" rx=\"3\" fill=\""<<colors[seg.job%6]<<"\"><title>"<<html(s.jobs[seg.job].id)<<" · Schritt "<<seg.operation+1<<" · "<<seg.start<<"–"<<seg.end<<" min</title></rect>";
                if(w>55)out<<"<text x=\""<<194+seg.start*scale<<"\" y=\""<<y+20<<"\" font-family=\"sans-serif\" font-size=\"10\" fill=\"#14232c\">"<<html(short_label(s.jobs[seg.job].id))<<"</text>";
            }
        }offset+=s.stations[st].capacity;
    }
    out<<"</svg>";return out.str();
}
void report(const Scenario& s,const std::vector<Result>& results,const std::filesystem::path& output) {
    if(results.empty())throw std::runtime_error("Kein Ergebnis.");
    if(std::filesystem::exists(output))throw std::runtime_error("Ausgabeverzeichnis existiert bereits. Einen neuen Namen verwenden.");
    auto stamp=std::chrono::steady_clock::now().time_since_epoch().count();
    auto staging=output;staging+=".tmp-"+std::to_string(stamp);
    std::filesystem::create_directories(output.parent_path().empty()?std::filesystem::path("."):output.parent_path());
    if(!std::filesystem::create_directory(staging))throw std::runtime_error("Temporäres Verzeichnis nicht verfügbar.");
    try {
        std::ostringstream schedule,jobs,summary,page;
        schedule<<"rule,job,operation,station,slot,ready,start,end,waiting\n";
        jobs<<"rule,job,release,due,finish,flow,waiting,tardiness\n";
        summary<<"{\"units\":\"minutes\",\"stations\":[";
        for(std::size_t i=0;i<s.stations.size();++i){if(i)summary<<',';summary<<"{\"name\":"<<json(s.stations[i].name)<<",\"capacity\":"<<s.stations[i].capacity<<'}';}
        summary<<"],\"runs\":[";
        page<<R"HTML(<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fluss · Produktionsplanung</title><style>
*{box-sizing:border-box}body{margin:0;background:#101d25;color:#e5eef2;font:14px/1.6 system-ui,sans-serif}header,main,footer{max-width:1400px;margin:auto;padding:28px 44px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #314650}.brand{font-size:28px;letter-spacing:-1px;font-weight:700}.brand span{color:#7bd4bf}.eyebrow{font-size:10px;letter-spacing:2px;color:#acc3cd}h1{font:48px/1.15 Georgia,serif;margin:20px 0}h1 em{color:#7bd4bf;font-weight:normal}.intro{display:flex;justify-content:space-between;align-items:end;gap:30px}.intro p{color:#acc3cd;max-width:650px;font-size:13px}.controls{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:28px 0}label{font-size:12px;color:#bdd0d8}select,input{font:inherit;background:#1b303b;border:1px solid #49616d;color:#e5eef2;border-radius:6px;padding:10px;margin-left:8px}a{color:#9edccf;text-decoration:none;font-size:12px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:26px 0}.stat{padding:22px;background:#1b303b;border:1px solid #314b58;border-radius:9px}.stat strong{display:block;font:34px Georgia,serif;margin:7px 0}.stat span{color:#b9ccd5;font-size:11px}.chart{overflow:auto;border:1px solid #314b58;border-radius:8px;background:#14232c}.chart svg{display:block;width:100%;min-width:850px}.section-head{display:flex;justify-content:space-between;align-items:center;margin:32px 0 16px}.section-head h2{font-size:18px;font-weight:500;margin:0}.section-head span{font-size:11px;color:#b9ccd5}.split{display:grid;grid-template-columns:1fr 2fr;gap:24px;margin-top:24px}.panel{border:1px solid #314b58;border-radius:8px;background:#182b35;padding:24px;min-width:0}.panel h2{font-size:17px;margin-top:0}.util{display:flex;justify-content:space-between;font-size:12px;margin:18px 0 8px}progress{width:100%;height:8px;accent-color:#7bd4bf}.table{overflow:auto}table{border-collapse:collapse;width:100%;text-align:left;white-space:nowrap}th{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#b9ccd5;border-bottom:1px solid #314b58;padding:10px}td{font-size:12px;border-bottom:1px solid #2b424e;padding:13px 10px}.late{color:#ffc4a8}.ok{color:#a6e3c8}.note{font-size:12px;color:#b9ccd5;margin-top:25px}.downloads{display:flex;gap:22px;flex-wrap:wrap}footer{font-size:11px;color:#b9ccd5;border-top:1px solid #314650;display:flex;justify-content:space-between;gap:20px}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid #e9b875;outline-offset:3px}[hidden]{display:none!important}@media(max-width:800px){header,main,footer{padding:22px}.intro{display:block}h1{font-size:36px}.stats{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr}.controls{align-items:stretch;flex-direction:column}input,select{max-width:100%;margin-left:0}.controls label{display:flex;flex-direction:column;gap:7px}.stat{padding:17px}.stat strong{font-size:29px}footer{flex-direction:column}}@media print{body{background:white;color:#14232c}.controls{display:none}.panel,.stat{background:white;color:#14232c;break-inside:avoid}.chart{break-inside:avoid}header,main,footer{padding:12px}}
</style></head><body><header><div class="brand">≋ fluss<span>.</span></div><span class="eyebrow">PLANUNG / SZENARIOBERICHT</span></header><main><div class="intro"><div><p class="eyebrow">WENIGER WARTEN. MEHR BEWEGEN.</p><h1>Jeder Schritt zählt.<br><em>Der Ablauf entscheidet.</em></h1><p>Vergleiche Priorisierungsregeln, erkenne Engpässe und prüfe zusätzliche Kapazitäten. Alle Zeiten sind Minuten ab Planungsbeginn.</p></div></div><div class="controls"><label>Planungsregel <select id="rule">)HTML";
        for(const auto& r:results)page<<"<option value=\""<<rule_name(r.rule)<<"\">"<<rule_name(r.rule)<<" · "<<(r.rule==Rule::Fcfs?"Reihenfolge der Bereitstellung":r.rule==Rule::Spt?"Kürzester nächster Schritt":"Frühester Liefertermin")<<"</option>";
        page<<R"HTML(</select></label><label>Auftrag suchen <input id="search" type="search" placeholder="Auftragsname …"></label></div>)HTML";
        for(std::size_t index=0;index<results.size();++index){
            const auto& r=results[index];
            if(index)summary<<',';
            summary<<"{\"rule\":"<<json(rule_name(r.rule))<<",\"makespan\":"<<r.makespan<<",\"on_time\":"<<r.on_time<<",\"jobs\":"<<s.jobs.size()<<",\"mean_flow\":"<<r.mean_flow<<",\"mean_wait\":"<<r.mean_wait<<",\"stations\":[";
            for(std::size_t i=0;i<r.stations.size();++i){auto st=r.stations[i];if(i)summary<<',';summary<<"{\"name\":"<<json(s.stations[st.station].name)<<",\"busy\":"<<st.busy<<",\"available\":"<<st.available<<",\"utilization\":"<<st.utilization<<'}';}
            summary<<"]}";
            page<<"<section data-rule=\""<<rule_name(r.rule)<<"\""<<(index?" hidden":"")<<"><div class=\"stats\">";
            for(auto [label,value,detail]:{std::tuple<std::string,std::string,std::string>{"Gesamtdauer",std::to_string(r.makespan),"Minuten bis zum letzten Abschluss"},{"Termintreu",std::to_string(r.on_time)+" / "+std::to_string(s.jobs.size()),"Aufträge zum zugesagten Zeitpunkt"},{"Ø Durchlauf",std::to_string(static_cast<int>(r.mean_flow))+" min","Von Freigabe bis Abschluss"},{"Ø Wartezeit",std::to_string(static_cast<int>(r.mean_wait))+" min","Ohne eigentliche Bearbeitungszeit"}})
                page<<"<div class=\"stat\"><span>"<<label<<"</span><strong>"<<value<<"</strong><span>"<<detail<<"</span></div>";
            page<<"</div><div class=\"section-head\"><h2>Dein Produktionsfluss</h2><span>Farben = Aufträge · Dunkelrot = Wartung</span></div><div class=\"chart\" tabindex=\"0\" aria-label=\"Horizontal scrollbarer Zeitplan\">"<<svg(s,r)<<"</div><div class=\"split\"><section class=\"panel\"><h2>Auslastung je Station</h2>";
            for(auto st:r.stations)page<<"<div class=\"util\"><span>"<<html(s.stations[st.station].name)<<" · "<<s.stations[st.station].capacity<<" Plätze</span><strong>"<<static_cast<int>(st.utilization)<<" %</strong></div><progress max=\"100\" value=\""<<st.utilization<<"\" aria-label=\"Auslastung "<<html(s.stations[st.station].name)<<"\"></progress>";
            page<<"<p class=\"note\">Bearbeitungszeit geteilt durch verfügbare Platz-Minuten. Wartungsfenster werden abgezogen; Leerlauf vor der ersten Freigabe bleibt enthalten.</p></section><section class=\"panel\"><h2>Aufträge & Termine</h2><div class=\"table\" tabindex=\"0\" aria-label=\"Auftragstabelle\"><table><thead><tr><th>Auftrag</th><th>Termin</th><th>Fertig</th><th>Warten</th><th>Verspätung</th></tr></thead><tbody>";
            for(auto j:r.jobs){
                const auto& job=s.jobs[j.job];
                page<<"<tr data-job=\""<<html(job.id)<<"\"><td>"<<html(job.id)<<"</td><td>"<<job.due<<"</td><td>"<<j.finish<<"</td><td>"<<j.waiting<<"</td><td class=\""<<(j.late?"late":"ok")<<"\">"<<j.late<<" min</td></tr>";
                jobs<<rule_name(r.rule)<<','<<csv_cell(job.id)<<','<<job.release<<','<<job.due<<','<<j.finish<<','<<j.flow<<','<<j.waiting<<','<<j.late<<'\n';
            }
            page<<"</tbody></table></div></section></div></section>";
            for(auto seg:r.schedule)schedule<<rule_name(r.rule)<<','<<csv_cell(s.jobs[seg.job].id)<<','<<seg.operation+1<<','<<csv_cell(s.stations[seg.station].name)<<','<<seg.slot+1<<','<<seg.ready<<','<<seg.start<<','<<seg.end<<','<<seg.start-seg.ready<<'\n';
        }
        summary<<"]}\n";
        page<<R"HTML(<p class="note">Die Planung verwendet feste Bearbeitungszeiten und nicht unterbrechbare Schritte. Wartung sperrt alle Plätze einer Station. Materialverfügbarkeit, Personal, Transportwege und ungeplante Ausfälle werden nicht simuliert. Die Regeln sind Heuristiken und garantieren kein globales Optimum.</p><div class="downloads"><a href="schedule.csv" download>Ablauf als CSV ↗</a><a href="jobs.csv" download>Aufträge als CSV ↗</a><a href="summary.json" download>Kennzahlen als JSON ↗</a><a href="plan.svg" download>Ersten Plan als SVG ↗</a></div></main><footer><span>Fluss / Vom Engpass zum nächsten Schritt.</span><span>Eigenständiger Bericht · Ohne Server oder externe Dienste</span></footer><script>
const select=document.getElementById('rule'),search=document.getElementById('search');
function show(){document.querySelectorAll('[data-rule]').forEach(s=>s.hidden=s.dataset.rule!==select.value);const q=search.value.toLowerCase();document.querySelectorAll('[data-job]').forEach(r=>r.hidden=!r.dataset.job.toLowerCase().includes(q));}
select.addEventListener('change',show);search.addEventListener('input',show);
</script></body></html>)HTML";
        write(staging/"schedule.csv",schedule.str());write(staging/"jobs.csv",jobs.str());write(staging/"summary.json",summary.str());write(staging/"report.html",page.str());write(staging/"plan.svg",svg(s,results.front()));
        if(std::filesystem::exists(output))throw std::runtime_error("Ausgabeverzeichnis wurde inzwischen angelegt.");
        std::filesystem::rename(staging,output);
    }catch(...){std::filesystem::remove_all(staging);throw;}
}
}
