const BASE64_URL="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function encodeBase64Url(bytes:Uint8Array){
  let output="",buffer=0,bits=0;
  for(const byte of bytes){buffer=(buffer<<8)|byte;bits+=8;while(bits>=6){bits-=6;output+=BASE64_URL[(buffer>>bits)&63]}}
  if(bits>0)output+=BASE64_URL[(buffer<<(6-bits))&63];
  return output;
}

export async function createContentId(content:string){
  const data=new TextEncoder().encode(content);
  if(globalThis.crypto?.subtle){
    const digest=new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256",data));
    return encodeBase64Url(digest.slice(0,12));
  }
  let hash=2166136261;
  for(const byte of data){hash^=byte;hash=Math.imul(hash,16777619)}
  return Math.abs(hash>>>0).toString(36).padStart(8,"0").repeat(2).slice(0,16);
}
