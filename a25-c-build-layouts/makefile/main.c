#define _POSIX_C_SOURCE 200809L
#include <arpa/inet.h>
#include <errno.h>
#include <netinet/in.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>
#include "page.h"
typedef struct {int id,priority,done;char title[641];} Task;
static Task tasks[4096];static int count=0,sequence=0;
static void sendall(int fd,const char*data,size_t n){while(n){ssize_t written=send(fd,data,n,0);if(written<=0)return;data+=written;n-=(size_t)written;}}
static void response(int fd,int status,const char*type,const char*body){char head[512];int n=snprintf(head,sizeof(head),"HTTP/1.1 %d Response\r\nContent-Type: %s\r\nContent-Length: %zu\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\n\r\n",status,type,strlen(body));sendall(fd,head,(size_t)n);sendall(fd,body,strlen(body));}
static int hex(char c){if(c>='0'&&c<='9')return c-'0';if(c>='a'&&c<='f')return c-'a'+10;if(c>='A'&&c<='F')return c-'A'+10;return -1;}
static int decode(const char*s,char*out,size_t cap){size_t n=0;while(*s&&*s!='&'){unsigned char c=(unsigned char)*s++;if(c=='+')c=' ';else if(c=='%'){if(!s[0]||!s[1]||hex(s[0])<0||hex(s[1])<0)return 0;c=(unsigned char)(hex(s[0])*16+hex(s[1]));s+=2;}if(c<32||n+1>=cap)return 0;out[n++]=(char)c;}out[n]=0;return n>0;}
static void list(int fd){static char json[4096*1500];size_t n=0;json[n++]='[';for(int i=0;i<count;i++){Task*t=&tasks[i];n+=(size_t)snprintf(json+n,sizeof(json)-n,"%s{\"id\":%d,\"priority\":%d,\"done\":%s,\"title\":\"",i?",":"",t->id,t->priority,t->done?"true":"false");for(const unsigned char*p=(unsigned char*)t->title;*p;p++){if(*p=='"'||*p=='\\')json[n++]='\\';json[n++]=(char)*p;}json[n++]='"';json[n++]='}';}json[n++]=']';json[n]=0;response(fd,200,"application/json",json);}
static void handle(int fd){char request[16384];size_t used=0,header_size=0,body_size=0;while(used<sizeof(request)-1){ssize_t n=recv(fd,request+used,sizeof(request)-used-1,0);if(n<=0)return;used+=(size_t)n;request[used]=0;char*end=strstr(request,"\r\n\r\n");if(end){header_size=(size_t)(end-request)+4;char*length=strstr(request,"Content-Length:");if(!length)length=strstr(request,"content-length:");body_size=length?(size_t)strtoul(length+15,NULL,10):0;if(body_size>8192){response(fd,413,"application/json","{\"error\":\"body too large\"}");return;}if(used>=header_size+body_size)break;}}if(!header_size||used<header_size+body_size){response(fd,400,"application/json","{\"error\":\"invalid request\"}");return;}char method[16],path[256];if(sscanf(request,"%15s %255s",method,path)!=2)return;
 if(strcmp(method,"GET")==0&&strcmp(path,"/")==0){response(fd,200,"text/html; charset=utf-8",PAGE);return;}
 if(strcmp(method,"GET")==0&&strcmp(path,"/health")==0){response(fd,200,"application/json","{\"ok\":true}");return;}
 if(strcmp(method,"GET")==0&&strcmp(path,"/api/tasks")==0){list(fd);return;}
 if(strcmp(method,"POST")==0&&strcmp(path,"/api/tasks")==0){if(count>=4096){response(fd,409,"application/json","{\"error\":\"capacity reached\"}");return;}char*body=request+header_size;char*title=strstr(body,"title=");char*priority=strstr(body,"priority=");Task t={0};t.priority=priority?atoi(priority+9):2;if(!title||!decode(title+6,t.title,sizeof(t.title))||t.priority<1||t.priority>3){response(fd,400,"application/json","{\"error\":\"invalid task\"}");return;}t.id=++sequence;tasks[count++]=t;response(fd,201,"application/json","{\"created\":true}");return;}
 int id=0;char tail[32]={0};if(sscanf(path,"/api/tasks/%d%31s",&id,tail)>=1){for(int i=0;i<count;i++)if(tasks[i].id==id){if(strcmp(method,"POST")==0&&strcmp(tail,"/toggle")==0){tasks[i].done=!tasks[i].done;response(fd,200,"application/json","{\"updated\":true}");return;}if(strcmp(method,"DELETE")==0&&!tail[0]){memmove(tasks+i,tasks+i+1,(size_t)(count-i-1)*sizeof(Task));count--;response(fd,200,"application/json","{\"deleted\":true}");return;}}}
 response(fd,404,"application/json","{\"error\":\"not found\"}");}
int main(void){signal(SIGPIPE,SIG_IGN);int fd=socket(AF_INET,SOCK_STREAM,0),one=1;if(fd<0)return 1;setsockopt(fd,SOL_SOCKET,SO_REUSEADDR,&one,sizeof(one));struct sockaddr_in address={0};address.sin_family=AF_INET;address.sin_port=htons((unsigned short)atoi(getenv("PORT")?getenv("PORT"):"8080"));if(inet_pton(AF_INET,getenv("HOST")?getenv("HOST"):"127.0.0.1",&address.sin_addr)!=1)return 1;if(bind(fd,(struct sockaddr*)&address,sizeof(address))||listen(fd,64)){perror("listen");return 1;}puts("Fokus ready");fflush(stdout);for(;;){int client=accept(fd,NULL,NULL);if(client<0){if(errno==EINTR)continue;break;}struct timeval timeout={3,0};setsockopt(client,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));handle(client);close(client);}close(fd);return 0;}
