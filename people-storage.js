window.darkroomPeople={a:'阿野',b:'林'};
window.peopleStorageReady=false;
try {
  for(const who of ['a','b']) {
    try {window.darkroomPeople[who]=localStorage.getItem('darkroom.nick.'+who)||window.darkroomPeople[who];} catch {}
  }
  const result=window.textStorage.load('people');
  if(result.data) window.darkroomPeople={a:result.data.a,b:result.data.b};
  window.peopleStorageReady=true;
  if(result.warning) alert(result.warning);
} catch(error){alert('昵称存档读取失败：'+error.message);}
