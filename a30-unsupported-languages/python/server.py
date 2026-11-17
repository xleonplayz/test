from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
import json,os,sqlite3,threading
from urllib.parse import parse_qs
lock=threading.Lock();db=sqlite3.connect(os.environ.get('APP_DB',':memory:'),check_same_thread=False)
db.execute('CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY,title TEXT NOT NULL,priority INTEGER NOT NULL,done INTEGER NOT NULL DEFAULT 0)')
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def reply(self,status,data,kind='application/json'):
  payload=(json.dumps(data,ensure_ascii=False).encode() if kind=='application/json' else data)
  self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
 def do_GET(self):
  if self.path=='/':return self.reply(200,Path(__file__).with_name('index.html').read_bytes(),'text/html; charset=utf-8')
  if self.path=='/health':return self.reply(200,{'ok':True})
  if self.path!='/api/tasks':return self.reply(404,{'error':'not found'})
  with lock:rows=db.execute('SELECT id,title,priority,done FROM tasks ORDER BY id').fetchall()
  return self.reply(200,[dict(zip(['id','title','priority','done'],[a,b,c,bool(d)])) for a,b,c,d in rows])
 def do_POST(self):self.mutate(False)
 def do_DELETE(self):self.mutate(True)
 def mutate(self,delete):
  try:
   with lock:
    if self.path=='/api/tasks' and not delete:
     size=int(self.headers.get('Content-Length','0'))
     if size>8192:return self.reply(413,{'error':'too large'})
     form=parse_qs(self.rfile.read(size).decode());title=form.get('title',[''])[0].strip();priority=int(form.get('priority',['2'])[0])
     if not title or len(title)>160 or priority not in [1,2,3]:return self.reply(400,{'error':'invalid task'})
     db.execute('INSERT INTO tasks(title,priority) VALUES(?,?)',(title,priority));db.commit();return self.reply(201,{'created':True})
    parts=self.path.split('/');id=int(parts[3]);toggle=len(parts)==5 and parts[4]=='toggle'
    if parts[:3]!=['','api','tasks'] or (not delete and not toggle):return self.reply(404,{'error':'not found'})
    sql='DELETE FROM tasks WHERE id=?' if delete else 'UPDATE tasks SET done=1-done WHERE id=?'
    changed=db.execute(sql,(id,)).rowcount;db.commit();return self.reply(200 if changed else 404,{'changed':bool(changed)})
  except (ValueError,IndexError,UnicodeError):return self.reply(400,{'error':'invalid request'})
if __name__=='__main__':ThreadingHTTPServer((os.environ.get('HOST','127.0.0.1'),int(os.environ.get('PORT','8080'))),Handler).serve_forever()
