import com.sun.net.httpserver.*;
import java.net.*;import java.nio.charset.StandardCharsets;import java.nio.file.*;import java.util.*;import java.util.concurrent.*;
public class Main{
 static final Map<Integer,Task> tasks=new LinkedHashMap<>();static int sequence;
 record Task(int id,String title,int priority,boolean done){}
 static String escape(String s){return s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r").replace("\t","\\t");}
 static void reply(HttpExchange e,int status,String type,String body)throws Exception{byte[] b=body.getBytes(StandardCharsets.UTF_8);e.getResponseHeaders().set("Content-Type",type);e.sendResponseHeaders(status,b.length);e.getResponseBody().write(b);e.close();}
 static void json(HttpExchange e,int status,String body)throws Exception{reply(e,status,"application/json",body);}
 static synchronized void handle(HttpExchange e)throws Exception{
 String path=e.getRequestURI().getPath(),method=e.getRequestMethod();
 if(path.equals("/")&&method.equals("GET")){reply(e,200,"text/html; charset=utf-8",Files.readString(Path.of("index.html")));return;}
 if(path.equals("/health")){json(e,200,"{\"ok\":true}");return;}
 if(path.equals("/api/tasks")&&method.equals("GET")){StringJoiner j=new StringJoiner(",","[","]");for(Task t:tasks.values())j.add("{\"id\":"+t.id()+",\"title\":\""+escape(t.title())+"\",\"priority\":"+t.priority()+",\"done\":"+t.done()+"}");json(e,200,j.toString());return;}
 if(path.equals("/api/tasks")&&method.equals("POST")){byte[] b=e.getRequestBody().readNBytes(8193);if(b.length>8192){json(e,413,"{\"error\":\"too large\"}");return;}Map<String,String> form=new HashMap<>();for(String part:new String(b,StandardCharsets.UTF_8).split("&")){String[] kv=part.split("=",2);if(kv.length==2)form.put(kv[0],URLDecoder.decode(kv[1],StandardCharsets.UTF_8));}String title=form.getOrDefault("title","").trim();int priority=Integer.parseInt(form.getOrDefault("priority","2"));if(title.isEmpty()||title.length()>160||priority<1||priority>3){json(e,400,"{\"error\":\"invalid task\"}");return;}Task t=new Task(++sequence,title,priority,false);tasks.put(t.id(),t);json(e,201,"{\"created\":true}");return;}
 String[] parts=path.split("/");if(parts.length>=4&&parts[1].equals("api")&&parts[2].equals("tasks")){int id=Integer.parseInt(parts[3]);Task t=tasks.get(id);if(t!=null){if(method.equals("POST")&&parts.length==5&&parts[4].equals("toggle")){tasks.put(id,new Task(id,t.title(),t.priority(),!t.done()));json(e,200,"{\"updated\":true}");return;}if(method.equals("DELETE")&&parts.length==4){tasks.remove(id);json(e,200,"{\"deleted\":true}");return;}}}json(e,404,"{\"error\":\"not found\"}");}
 public static void main(String[] args)throws Exception{int port=Integer.parseInt(System.getenv().getOrDefault("PORT","8080"));HttpServer server=HttpServer.create(new InetSocketAddress(System.getenv().getOrDefault("HOST","127.0.0.1"),port),0);server.createContext("/",e->{try{handle(e);}catch(Exception error){try{json(e,400,"{\"error\":\"invalid request\"}");}catch(Exception ignored){e.close();}}});server.setExecutor(Executors.newFixedThreadPool(4));server.start();System.out.println("Fokus ready");}
}
