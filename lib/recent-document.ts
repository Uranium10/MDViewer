export type RecentDocument={id:string;title:string;filename:string;markdown:string};
export type RecentDocumentMeta={id:string;title:string;filename:string;currentPage:number;totalPages:number;updatedAt:number};

export const RECENT_META_KEY="mdbooks:recent-document";
const DATABASE_NAME="mdbooks-library";
const STORE_NAME="documents";
const RECENT_KEY="recent";

function openDatabase(){
  return new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(DATABASE_NAME,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE_NAME))request.result.createObjectStore(STORE_NAME)};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

export async function saveRecentDocument(document:RecentDocument){
  const database=await openDatabase();
  await new Promise<void>((resolve,reject)=>{
    const transaction=database.transaction(STORE_NAME,"readwrite");
    transaction.objectStore(STORE_NAME).put(document,RECENT_KEY);
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(transaction.error);
    transaction.onabort=()=>reject(transaction.error);
  }).finally(()=>database.close());
}

export async function loadRecentDocument(){
  const database=await openDatabase();
  return new Promise<RecentDocument|null>((resolve,reject)=>{
    const transaction=database.transaction(STORE_NAME,"readonly");
    const request=transaction.objectStore(STORE_NAME).get(RECENT_KEY);
    request.onsuccess=()=>resolve(request.result&&typeof request.result.markdown==="string"?request.result as RecentDocument:null);
    request.onerror=()=>reject(request.error);
    transaction.oncomplete=()=>database.close();
    transaction.onabort=()=>database.close();
  });
}

export function readRecentMeta(){
  try{
    const value=JSON.parse(localStorage.getItem(RECENT_META_KEY)||"null") as Partial<RecentDocumentMeta>|null;
    if(!value||typeof value.id!=="string"||typeof value.filename!=="string")return null;
    return{id:value.id,title:typeof value.title==="string"?value.title:value.filename,filename:value.filename,currentPage:Math.max(1,Math.round(Number(value.currentPage)||1)),totalPages:Math.max(1,Math.round(Number(value.totalPages)||1)),updatedAt:Number(value.updatedAt)||0};
  }catch{return null}
}

export function writeRecentMeta(value:RecentDocumentMeta){
  try{localStorage.setItem(RECENT_META_KEY,JSON.stringify(value))}catch{}
}
