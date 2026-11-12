const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store"}});
const userId=request=>request.headers.get("oai-authenticated-user-id");
const safePart=value=>String(value||"").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,120);

async function evidenceApi(request,env,user,url){
  const day=url.searchParams.get("day"),checkId=url.searchParams.get("checkId");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day||"")||!checkId)return json({error:"invalid_target"},400);
  if(request.method==="GET"){
    const row=await env.DB.prepare("SELECT object_key, content_type, uploaded_at, check_text FROM evidence_photo WHERE user_id = ? AND day = ? AND check_id = ?").bind(user,day,checkId).first();
    if(!row)return json({exists:false});
    if(url.searchParams.get("view")!=="1")return json({exists:true,uploadedAt:row.uploaded_at,checkText:row.check_text});
    const object=await env.EVIDENCE.get(row.object_key);if(!object)return json({error:"photo_missing"},404);
    return new Response(object.body,{headers:{"content-type":row.content_type,"content-length":String(object.size),"cache-control":"private, max-age=300","x-content-type-options":"nosniff"}});
  }
  if(request.method==="PUT"){
    const type=request.headers.get("content-type")||"";const size=Number(request.headers.get("content-length")||0);
    if(!type.startsWith("image/"))return json({error:"image_required"},415);if(size>8*1024*1024)return json({error:"too_large"},413);
    const bytes=await request.arrayBuffer();if(bytes.byteLength>8*1024*1024)return json({error:"too_large"},413);
    const objectKey=`evidence/${safePart(user)}/${day}/${safePart(checkId)}`;const now=Date.now();const checkText=(url.searchParams.get("checkText")||"待确认事项").slice(0,200);
    await env.EVIDENCE.put(objectKey,bytes,{httpMetadata:{contentType:type}});
    await env.DB.prepare("INSERT INTO evidence_photo (user_id, day, check_id, check_text, object_key, content_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, day, check_id) DO UPDATE SET check_text = excluded.check_text, object_key = excluded.object_key, content_type = excluded.content_type, uploaded_at = excluded.uploaded_at").bind(user,day,checkId,checkText,objectKey,type,now).run();
    return json({exists:true,uploadedAt:now,checkText});
  }
  return json({error:"method_not_allowed"},405);
}

export default {async fetch(request,env){
  const url=new URL(request.url);const user=userId(request);
  if(url.pathname.startsWith("/api/")){
    if(!user)return json({error:"sign_in_required"},401);
    try{if(url.pathname==="/api/evidence")return await evidenceApi(request,env,user,url);return json({error:"not_found"},404)}catch(error){console.error(error);return json({error:"temporarily_unavailable"},503)}
  }
  return env.ASSETS.fetch(request);
}};
