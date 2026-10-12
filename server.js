const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DB = path.join(ROOT, "data.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ".ambi@0000";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const OWNER_INSTAGRAM = "https://www.instagram.com/kiiiiiruuuuuu/";
app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:false}));

function readDB() {
  let db;
  try { db=JSON.parse(fs.readFileSync(DB, "utf8")); }
  catch { db={keys:[], sessions:{}, settings:{}, orders:[], chats:[]}; }
  db.keys=Array.isArray(db.keys)?db.keys:[]; db.sessions=db.sessions||{}; db.settings=db.settings||{};
  if(typeof db.settings.announcement!=="string") db.settings.announcement="WELCOME TO KIRUU GLORY BOT";
  if(!Array.isArray(db.settings.packages)) db.settings.packages=[{"id":"uc60","name":"60 UC","price":99},{"id":"uc325","name":"325 UC","price":399},{"id":"uc660","name":"660 UC","price":799}];
  db.orders=Array.isArray(db.orders)?db.orders:[]; db.chats=Array.isArray(db.chats)?db.chats:[];
  db.keys.forEach(k=>{if(!Number.isInteger(k.credits)||k.credits<0)k.credits=0;});
  try { fs.writeFileSync(DB,JSON.stringify(db,null,2)); } catch {}
  return db;
}
function writeDB(db){ fs.writeFileSync(DB,JSON.stringify(db,null,2)); }
function token(){return crypto.randomBytes(32).toString("hex");}
function hash(s){return crypto.createHash("sha256").update(String(s)).digest("hex");}
function sessionFor(req){
  const t=(req.headers.authorization||"").replace(/^Bearer\s+/i,"") || req.headers["x-session"];
  if(!t) return null;
  const db=readDB(), s=db.sessions[t];
  if(!s) return null;
  if(s.expires < Date.now()){ delete db.sessions[t]; writeDB(db); return null; }
  return {token:t,...s};
}
function admin(req,res,next){
  const s=sessionFor(req);
  if(!s || !s.admin) return res.status(401).json({error:"Admin login required."});
  next();
}
function learner(req,res,next){
  const s=sessionFor(req);
  if(!s || (!s.admin && !s.keyId)) return res.status(401).json({error:"Enter a valid access key to continue."});
  next();
}
app.get("/api/status",(req,res)=>{const db=readDB();res.json({ok:true,owner:"KIRAN",brand:"KIRUU GLORY BOT",announcement:db.settings.announcement,aiConfigured:false,instagram:OWNER_INSTAGRAM,packages:db.settings.packages||[]});});
app.get("/api/me",learner,(req,res)=>{const s=sessionFor(req),db=readDB();const k=db.keys.find(x=>x.id===s.keyId);res.json({label:k?.label||"Owner",credits:Number(k?.credits||0),isAdmin:!!s.admin});});
app.post("/api/store/order",learner,(req,res)=>{const s=sessionFor(req),db=readDB();const k=db.keys.find(x=>x.id===s.keyId);if(!k)return res.status(400).json({error:"User not found."});const pkg=(db.settings.packages||[]).find(x=>x.id===String(req.body?.packageId));if(!pkg)return res.status(400).json({error:"Select a valid package."});const order={id:crypto.randomUUID(),keyId:k.id,user:k.label,packageId:pkg.id,packageName:pkg.name,price:Number(pkg.price),status:"REQUESTED",createdAt:new Date().toISOString()};db.orders=db.orders||[];db.orders.push(order);writeDB(db);res.json({ok:true,message:"Request sent to owner. Owner will contact you to process it.",orderId:order.id});});
app.post("/api/login/admin",(req,res)=>{
  if(!req.body || req.body.password !== ADMIN_PASSWORD) return res.status(401).json({error:"Incorrect admin password."});
  const db=readDB(), t=token(); db.sessions[t]={admin:true,expires:Date.now()+12*60*60*1000}; writeDB(db);
  res.json({token:t,admin:true});
});
app.post("/api/login/key",(req,res)=>{
  const raw=String(req.body?.key||"").trim();
  if(!raw) return res.status(400).json({error:"Enter your access key."});
  const db=readDB(), found=db.keys.find(k=>k.active && hash(raw)===k.hash);
  if(!found) return res.status(401).json({error:"Key is invalid, disabled, or expired."});
  if(found.expiresAt && Date.parse(found.expiresAt)<Date.now()) return res.status(401).json({error:"This key has expired."});
  found.uses=(found.uses||0)+1;
  const t=token(); db.sessions[t]={keyId:found.id,expires:Date.now()+8*60*60*1000}; writeDB(db);
  res.json({token:t,admin:false,label:found.label||"Learner"});
});
app.get("/api/admin/overview",admin,(req,res)=>{
  const db=readDB(); res.json({keys:db.keys.map(k=>({id:k.id,label:k.label,active:k.active,credits:Number(k.credits||0),uses:k.uses||0,createdAt:k.createdAt,expiresAt:k.expiresAt||null})),announcement:db.settings.announcement,sessions:Object.keys(db.sessions).length,packages:db.settings.packages||[],orders:db.orders||[]});
});
app.post("/api/admin/keys",admin,(req,res)=>{
  const db=readDB(); const label=String(req.body?.label||"Learner").slice(0,60);
  const raw="KIRUU-"+crypto.randomBytes(5).toString("hex").toUpperCase();
  const expiresAt=req.body?.expiresAt ? String(req.body.expiresAt) : "";
  const item={id:crypto.randomUUID(),label,hash:hash(raw),active:true,credits:0,uses:0,createdAt:new Date().toISOString(),expiresAt};
  db.keys.push(item); writeDB(db); res.json({key:raw,item:{id:item.id,label:item.label,active:item.active,createdAt:item.createdAt,expiresAt:item.expiresAt||null,uses:0}});
});
app.patch("/api/admin/keys/:id",admin,(req,res)=>{
  const db=readDB(), k=db.keys.find(x=>x.id===req.params.id);
  if(!k) return res.status(404).json({error:"Key not found."});
  if(typeof req.body.active==="boolean") k.active=req.body.active;
  if(typeof req.body.label==="string") k.label=req.body.label.slice(0,60);
  writeDB(db); res.json({ok:true});
});
app.delete("/api/admin/keys/:id",admin,(req,res)=>{
  const db=readDB(); db.keys=db.keys.filter(k=>k.id!==req.params.id); writeDB(db); res.json({ok:true});
});

app.patch("/api/admin/users/:id/credits",admin,(req,res)=>{const db=readDB(),k=db.keys.find(x=>x.id===req.params.id);if(!k)return res.status(404).json({error:"User not found."});const n=Number(req.body?.credits);if(!Number.isInteger(n)||n<0||n>100000000)return res.status(400).json({error:"Credits must be a whole number from 0 to 100000000."});k.credits=n;writeDB(db);res.json({ok:true,credits:n});});
app.patch("/api/admin/packages/:id",admin,(req,res)=>{const db=readDB(),p=(db.settings.packages||[]).find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:"Package not found."});const n=Number(req.body?.price);if(!Number.isFinite(n)||n<0||n>1000000)return res.status(400).json({error:"Invalid price."});p.price=Math.round(n*100)/100;writeDB(db);res.json({ok:true});});
app.patch("/api/admin/orders/:id",admin,(req,res)=>{const db=readDB(),o=(db.orders||[]).find(x=>x.id===req.params.id);if(!o)return res.status(404).json({error:"Order not found."});const allowed=["REQUESTED","CONTACTED","COMPLETED","CANCELLED"];if(!allowed.includes(req.body?.status))return res.status(400).json({error:"Invalid order status."});o.status=req.body.status;writeDB(db);res.json({ok:true});});

app.post("/api/admin/announcement",admin,(req,res)=>{
  const db=readDB(); db.settings.announcement=String(req.body?.announcement||"").slice(0,240); writeDB(db); res.json({ok:true});
});
app.post("/api/learn/chat",learner,async(req,res)=>{
  const question=String(req.body?.message||"").trim().slice(0,4000);
  if(!question) return res.status(400).json({error:"Write a question first."});
  const q=question.toLowerCase();
  const gameAnswer = q.includes("bgmi")||q.includes("free fire")||q.includes("glory")||q.includes("uc")||q.includes("sensitivity")||q.includes("headshot")||q.includes("rank push")||q.includes("gyro")||q.includes("redeem")||q.includes("diamond");
  if(gameAnswer){let answer;
    if(q.includes("uc")||q.includes("buy")||q.includes("purchase")) answer="BGMI UC ke liye neeche UC Store se package select karke Request Owner dabao. Ye sirf request banata hai; payment ya UC delivery confirm nahi hoti jab tak owner tumse contact na kare.";
    else if(q.includes("sensitivity")||q.includes("gyro")) answer="Starter sensitivity tip: Training Ground mein camera sensitivity ko apne device ke hisaab se adjust karo, gyro use karte ho to low se start karke gradually badhao. Har setting ko 10–15 minute test karo; koi universal perfect sensitivity nahi hoti.";
    else if(q.includes("headshot")) answer="Headshot practice: crosshair ko chest/head level par rakho, short bursts use karo, recoil ko training ground mein practice karo aur close-range mein tracking drills karo. Fair-play settings only—no hacks or macros.";
    else if(q.includes("rank")) answer="Rank push: squad ke saath communicate karo, safe rotations lo, unnecessary early fights avoid karo, utilities carry karo aur survival plus smart fights par focus karo.";
    else answer="WELCOME BACK, KIRUU GLORY BOT. Main BGMI aur Free Fire ke fair-play tips, sensitivity practice, headshot drills, rank-push strategy aur UC order requests mein help kar sakta hoon. Apna game aur question batao.";
    return res.json({answer,mode:"glory-bot"});}
  const system="You are KIRUU Glory Bot. Help with BGMI and Free Fire fair-play tips, sensitivity, aim training, rank strategy and UC order requests. Never assist cheating, hacks, mod menus, or bypassing game protections. Also help with basic coding when asked.";
  if(process.env.OPENAI_API_KEY){
    try{
      const r=await fetch(process.env.OPENAI_BASE_URL||"https://api.openai.com/v1/chat/completions",{
        method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
        body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",messages:[{role:"system",content:system},{role:"user",content:question}],temperature:0.6})
      });
      const data=await r.json();
      if(!r.ok) return res.status(502).json({error:data.error?.message||"AI provider request failed. Check API settings."});
      const answer=data.choices?.[0]?.message?.content||"No response returned.";
      const db=readDB(); db.chats.push({at:new Date().toISOString(),question,answer:answer.slice(0,6000)}); db.chats=db.chats.slice(-100); writeDB(db);
      return res.json({answer,mode:"live-ai"});
    }catch(e){return res.status(502).json({error:"Could not reach AI provider. Check server connection and API settings."});}
  }
  let answer;
  if(q.includes("html")||q.includes("website")) answer="Start with HTML for structure, CSS for design, and JavaScript for interaction. Create index.html, style.css, and app.js. Practice locally, then deploy with a Node server. Tell me what page you want to build and I’ll guide you step by step.";
  else if(q.includes("javascript")||q.includes("js")) answer="JavaScript basics: variables (const/let), conditions, loops, functions, arrays, and objects. Try: const name = 'KIRUU'; console.log(`Hello, ${name}`); Then learn DOM events and fetch().";
  else if(q.includes("python")) answer="A good Python path is: variables, strings, lists, conditions, loops, functions, files, then small projects. Example: name = 'KIRUU'; print('Hello', name). What beginner project do you want to make?";
  else if(q.includes("network")||q.includes("cyber")||q.includes("hacking")||q.includes("security")) answer="Ethical cybersecurity path: learn TCP/IP and DNS, Linux basics, HTTP, authentication, secure coding, and logs. Practise only in systems you own or have written permission to test. Safe starter lab: OWASP Juice Shop or PortSwigger Web Security Academy. I can explain concepts and defensive checks.";
  else if(q.includes("chart")||q.includes("progress")) answer="Learning roadmap: 1) HTML/CSS — 1 week; 2) JavaScript — 2 weeks; 3) Node.js and APIs — 2 weeks; 4) Databases and authentication — 2 weeks; 5) Networking and defensive security labs — ongoing. Track completed lessons weekly; this is a suggested plan, not measured personal progress.";
  else answer="Welcome to KIRUU Cyber Academy! I can help with HTML/CSS, JavaScript, Python, Node.js, databases, networking, and ethical cybersecurity. Live AI is not configured yet: set OPENAI_API_KEY in Render Environment to enable AI responses. Until then, ask a topic-specific question and I’ll provide starter guidance.";
  res.json({answer,mode:"starter"});
});
app.post("/api/logout",(req,res)=>{const db=readDB(),s=sessionFor(req); if(s){delete db.sessions[s.token];writeDB(db);} res.json({ok:true});});
app.get("/admin",(req,res)=>res.sendFile(path.join(ROOT,"index.html")));
app.use(express.static(ROOT,{index:"index.html"}));
app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"index.html")));
app.listen(PORT,()=>console.log(`KIRUU Cyber Academy running on ${PORT}`));
