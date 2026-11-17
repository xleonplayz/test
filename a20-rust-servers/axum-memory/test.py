import json,os,pathlib,socket,subprocess,time,urllib.request,urllib.parse,urllib.error
root=pathlib.Path(__file__).resolve().parent
if (root/'Cargo.toml').exists(): command=['./target/debug/fokus']
elif (root/'main.c').exists(): command=['./fokus']
elif (root/'server.py').exists():command=['python3','server.py']
elif (root/'main.go').exists():command=['./fokus']
else:command=['java','Main']
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
child=subprocess.Popen(command,cwd=root,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def call(method,path,data=None):
 body=urllib.parse.urlencode(data).encode() if data else None
 req=urllib.request.Request(f'http://127.0.0.1:{port}'+path,data=body,method=method,headers={'Content-Type':'application/x-www-form-urlencoded','X-Sample':'1'})
 try:
  with urllib.request.urlopen(req,timeout=5)as r:return r.status,r.read()
 except urllib.error.HTTPError as e:return e.code,e.read()
try:
 for _ in range(100):
  try:
   if call('GET','/health')[0]==200:break
  except OSError:pass
  if child.poll() is not None:raise RuntimeError(child.stderr.read().decode())
  time.sleep(.05)
 else:raise RuntimeError('startup timeout')
 assert b'Fokus' in call('GET','/')[1]
 assert call('POST','/api/tasks',{'title':'Prüfung "A"','priority':1})[0]==201
 tasks=json.loads(call('GET','/api/tasks')[1]);assert tasks[-1]['title']=='Prüfung "A"'
 id=tasks[-1]['id'];assert call('POST',f'/api/tasks/{id}/toggle')[0]==200
 assert json.loads(call('GET','/api/tasks')[1])[-1]['done'] is True
 assert call('POST','/api/tasks',{'title':'','priority':1})[0]==400
 assert call('POST','/api/tasks',{'title':'Ungültig','priority':9})[0]==400
 assert call('DELETE',f'/api/tasks/{id}')[0]==200
 assert call('DELETE',f'/api/tasks/{id}')[0]==404
 assert call('GET','/unknown')[0]==404
 print('PASS: create, Unicode/JSON, list, toggle, validation, delete, missing route')
finally:
 child.terminate()
 try:child.wait(timeout=3)
 except subprocess.TimeoutExpired:child.kill();child.wait()
