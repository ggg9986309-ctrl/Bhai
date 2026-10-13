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
app.get("/api/status",(req,res)=>{const db=readDB();res.json({ok:true,owner:"KIRAN",brand:"KIRUU GLORY BOT",announcement:db.settings.announcement,aiConfigured:false,freeFireUidLookup:true,instagram:OWNER_INSTAGRAM,packages:db.settings.packages||[]});});
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
// Free Fire UID lookup uses an unofficial third-party profile endpoint. It may be unavailable or change without notice.
app.get("/api/freefire/uid/:uid", learner, async (req,res)=>{
  const uid=String(req.params.uid||"").trim();
  if(!/^\d{5,15}$/.test(uid)) return res.status(400).json({error:"UID 5 se 15 digits ka hona chahiye."});
  const base=(process.env.FREEFIRE_API_BASE||"https://api2.nftoken.info").replace(/\/$/,"");
  const urls=[`${base}/player-info?uid=${encodeURIComponent(uid)}`,`${base}/get?uid=${encodeURIComponent(uid)}&region=IND`];
  for(const url of urls){
    try{
      const r=await fetch(url,{headers:{"Accept":"application/json"},signal:AbortSignal.timeout(9000)});
      if(!r.ok) continue;
      const raw=await r.json();
      const d=raw.data||raw;
      const basic=d.basicInfo||d.basicinfo||d.basic_info||d.playerInfo||d.player_info||d;
      const guild=d.GuildInfo||d.guildInfo||d.guildinfo||d.guild_info||{};
      const nickname=basic.nickname||basic.nickName||basic.name||d.nickname||d.name;
      if(nickname && String(nickname).trim()) return res.json({ok:true,uid:String(basic.accountId||basic.accountid||basic.uid||uid),nickname:String(nickname).slice(0,80),level:basic.level??basic.Level??null,region:basic.region||basic.Region||"IND",guildName:guild.GuildName||guild.guildName||guild.name||null,guildId:guild.GuildID||guild.guildId||guild.id||null,source:"third-party"});
    }catch(e){ /* try fallback endpoint */ }
  }
  return res.status(502).json({error:"Is UID ka naam abhi fetch nahi ho paya. UID/region check karo ya Free Fire profile API baad mein try karo."});
});

app.post("/api/learn/chat",learner,(req,res)=>{
  const question=String(req.body?.message||"").trim().slice(0,1000);
  if(!question) return res.status(400).json({error:"Pehle apna question likho."});
  const q=question.toLowerCase(); let answer;
  if(q.includes("uid")||q.includes("player name")||q.includes("nickname")) answer="Free Fire player ka naam check karne ke liye upar UID LOOKUP box mein uska numeric UID daalo aur LOOKUP dabao. Third-party profile service kabhi unavailable ho sakti hai.";
  else if(q.includes("guild")) answer="Guild join karne se pehle guild level, active members, play style aur requirements check karo. Guild ID/name public profile se hi confirm karo; yahan fake guild data nahi dikhaya jayega.";
  else if(q.includes("free fire")||q.includes("ff")||q.includes("drag")||q.includes("headshot")) answer="FREE FIRE TIP: crosshair ko head level par rakho, short drag practice Training Ground mein karo, fire button size ko dheere-dheere adjust karo, aur close-range tracking practice karo. Har device ke liye ek hi perfect setting nahi hoti.";
  else if(q.includes("sensitivity")||q.includes("dpi")) answer="SENSITIVITY TIP: General aur Red Dot se start karo, Training Ground mein 10-minute drag/headshot drills karo, phir values 3–5 points karke adjust karo. DPI change karna zaroori nahi; phone settings aur game rules ke andar hi practice karo.";
  else if(q.includes("bgmi")||q.includes("gyro")) answer="BGMI TIP: Training Ground mein recoil ko 10–15 minute practice karo, crosshair chest/head level par rakho, gyro ko low se start karke gradually adjust karo, aur squad rotation communicate karo.";
  else if(q.includes("rank")||q.includes("push")) answer="RANK PUSH: squad ke saath khelo, safe rotations lo, cover se fight karo, unnecessary early fights avoid karo aur zone timing par dhyan do. Consistency kills se zyada important ho sakti hai.";
  else if(q.includes("uc")||q.includes("buy")||q.includes("purchase")||q.includes("diamond")) answer="Store mein package select karke REQUEST OWNER dabao. Isse request admin panel mein save hoti hai; payment ya UC delivery tab tak confirm nahi hoti jab tak owner contact karke process na kare.";
  else if(q.includes("hack")||q.includes("mod menu")||q.includes("cheat")) answer="Main hacks, cheats ya mod menus mein help nahi karta. Main legal sensitivity, aim training, movement aur rank-push tips de sakta hoon.";
  else answer="WELCOME BACK, KIRUU GLORY BOT. Main Free Fire aur BGMI ke liye preset game tips deta hoon: UID lookup, guild guidance, sensitivity, headshot practice, rank push aur UC order requests. Apna topic likho.";
  res.json({answer,mode:"local-glory-bot"});
});

app.post("/api/logout",(req,res)=>{const db=readDB(),s=sessionFor(req); if(s){delete db.sessions[s.token];writeDB(db);} res.json({ok:true});});
app.get("/admin",(req,res)=>res.sendFile(path.join(ROOT,"index.html")));
app.use(express.static(ROOT,{index:"index.html"}));
app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"index.html")));
app.listen(PORT,()=>console.log(`KIRUU Cyber Academy running on ${PORT}`));
