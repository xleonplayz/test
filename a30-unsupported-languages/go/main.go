package main
import("encoding/json";"fmt";"net/http";"os";"strconv";"strings";"sync";_ "embed")
//go:embed index.html
var page []byte
type Task struct{ID int `json:"id"`;Title string `json:"title"`;Priority int `json:"priority"`;Done bool `json:"done"`}
var mu sync.Mutex;var tasks=make([]Task,0);var sequence int
func send(w http.ResponseWriter,status int,v any){w.Header().Set("Content-Type","application/json");w.WriteHeader(status);json.NewEncoder(w).Encode(v)}
func handler(w http.ResponseWriter,r *http.Request){mu.Lock();defer mu.Unlock();p:=r.URL.Path
 if p=="/"&&r.Method=="GET"{w.Header().Set("Content-Type","text/html; charset=utf-8");w.Write(page);return};if p=="/health"{send(w,200,map[string]bool{"ok":true});return}
 if p=="/api/tasks"{if r.Method=="GET"{send(w,200,tasks);return};if r.Method=="POST"{r.Body=http.MaxBytesReader(w,r.Body,8192);if r.ParseForm()!=nil{send(w,400,map[string]string{"error":"invalid form"});return};title:=strings.TrimSpace(r.FormValue("title"));priority,e:=strconv.Atoi(r.FormValue("priority"));if title==""||len(title)>640||e!=nil||priority<1||priority>3{send(w,400,map[string]string{"error":"invalid task"});return};sequence++;tasks=append(tasks,Task{sequence,title,priority,false});send(w,201,map[string]bool{"created":true});return}}
 parts:=strings.Split(p,"/");if len(parts)>=4&&parts[1]=="api"&&parts[2]=="tasks"{id,e:=strconv.Atoi(parts[3]);if e==nil{for i:=range tasks{if tasks[i].ID==id{if r.Method=="POST"&&len(parts)==5&&parts[4]=="toggle"{tasks[i].Done=!tasks[i].Done;send(w,200,map[string]bool{"updated":true});return};if r.Method=="DELETE"&&len(parts)==4{tasks=append(tasks[:i],tasks[i+1:]...);send(w,200,map[string]bool{"deleted":true});return}}}}};send(w,404,map[string]string{"error":"not found"})}
func main(){port:=os.Getenv("PORT");if port==""{port="8080"};host:=os.Getenv("HOST");if host==""{host="127.0.0.1"};fmt.Println("Fokus ready");if err:=http.ListenAndServe(host+":"+port,http.HandlerFunc(handler));err!=nil{panic(err)}}
