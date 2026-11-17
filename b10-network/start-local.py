#!/usr/bin/env python3
"""Start this project's independent, already-built apps on local ports."""
import argparse,json,os,signal,subprocess,time,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--base-port',type=int,default=8080);parser.add_argument('--data-root',type=Path);args=parser.parse_args()
apps=json.loads((root/'local-apps.json').read_text());processes=[]
urls={a['path']:'http://127.0.0.1:'+str(args.base_port+i)for i,a in enumerate(apps)}
def stop(*_):
 for p in reversed(processes):
  try:os.killpg(p.pid,signal.SIGTERM)
  except ProcessLookupError:pass
 for p in reversed(processes):
  try:p.wait(timeout=5)
  except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
for sig in [signal.SIGINT,signal.SIGTERM]:signal.signal(sig,lambda *_:(_ for _ in ()).throw(KeyboardInterrupt()))
try:
 for i,a in enumerate(apps):
  app=root/a['path'];data=(args.data_root/a['path']).resolve() if args.data_root else app/'data';env={**os.environ,'PORT':str(args.base_port+i),'HOST':'127.0.0.1','NODE_ENV':'production','APP_DATA_DIR':str(data),'APP_DB':str(data/'app.sqlite')}
  if a.get('peer'):env['PEER_URL']=urls[a['peer']]
  for other in apps:env[Path(other['path']).name.upper()+'_URL']=urls[other['path']]
  data.mkdir(parents=True,exist_ok=True)
  command=list(a['start'])
  if (app/'Cargo.toml').exists():command+=['--db',str(data/'app.sqlite')]
  p=subprocess.Popen(command,cwd=app,env=env,start_new_session=True);processes.append(p)
  print(a['path']+': '+urls[a['path']],flush=True)
 while True:
  for p in processes:
   if p.poll()is not None:raise RuntimeError('App exited with status '+str(p.returncode))
  time.sleep(.5)
except KeyboardInterrupt:pass
finally:stop()
