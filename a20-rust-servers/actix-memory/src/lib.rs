use serde::{Deserialize,Serialize};
#[derive(Clone,Serialize)]pub struct Task{pub id:u64,pub title:String,pub priority:u8,pub done:bool}
#[derive(Deserialize)]pub struct Create{pub title:String,pub priority:u8}
#[derive(Default)]pub struct Board{pub tasks:Vec<Task>,sequence:u64}
impl Board{
 pub fn create(&mut self,input:Create)->Result<Task,&'static str>{let title=input.title.trim();if title.is_empty()||title.chars().count()>160||!(1..=3).contains(&input.priority){return Err("invalid task");}self.sequence+=1;let task=Task{id:self.sequence,title:title.into(),priority:input.priority,done:false};self.tasks.push(task.clone());Ok(task)}
 pub fn toggle(&mut self,id:u64)->bool{if let Some(task)=self.tasks.iter_mut().find(|t|t.id==id){task.done=!task.done;true}else{false}}
 pub fn delete(&mut self,id:u64)->bool{let before=self.tasks.len();self.tasks.retain(|t|t.id!=id);before!=self.tasks.len()}
}
#[cfg(test)]mod tests{use super::*;#[test]fn workflow(){let mut b=Board::default();let t=b.create(Create{title:"Prüfung".into(),priority:2}).unwrap();assert!(b.toggle(t.id));assert!(b.tasks[0].done);assert!(b.delete(t.id));assert!(!b.delete(t.id));}#[test]fn invalid_is_atomic(){let mut b=Board::default();assert!(b.create(Create{title:"".into(),priority:2}).is_err());assert!(b.create(Create{title:"wrong".into(),priority:9}).is_err());assert!(b.tasks.is_empty());}}
