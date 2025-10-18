// js/dataio.js
const DataIO = (function(){
  async function exportarJSON(){
    const negSession = JSON.parse(localStorage.getItem('negocioActivo')||'null');
    if(!negSession) return UI.toast('Sin negocio activo');
    const neg = await Storage.getNegocioById(negSession.id);
    const blob = new Blob([JSON.stringify(neg, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `negocio_${neg.id}.json`;
    a.click();
  }
  function importarJSON(){
    const negSession = JSON.parse(localStorage.getItem('negocioActivo')||'null');
    if(!negSession) return UI.toast('Sin negocio activo');
    const input = document.createElement('input'); input.type='file'; input.accept='.json,application/json';
    input.onchange = async ()=>{
      const file = input.files[0]; if(!file) return;
      const text = await file.text();
      try{
        const neg = JSON.parse(text);
        if(!neg.id || neg.id !== negSession.id) return UI.toast('El archivo no corresponde a este negocio');
        await window.FB.setDoc(window.FB.doc(window.FB.db, 'negocios', neg.id), neg);
        UI.toast('Base importada');
        setTimeout(()=> location.reload(), 800);
      }catch(e){ UI.toast('Archivo inválido'); }
    };
    input.click();
  }
  return { exportarJSON, importarJSON };
})();