var bunyan,exports,fs,path;fs=require("fs"),path=require("path"),bunyan=require("bunyan"),exports=module.exports={trace:function(){},debug:function(){},info:function(){},warn:function(){},error:function(){},fatal:function(){},init:function(e){var r,t,n,o,l,i;if(e.log.nolog)return delete exports.init;try{o={name:"webapi-eca"},"on"===e.log.trace&&(o.src=!0),n=e.log["file-path"]?path.resolve(e.log["file-path"]):path.resolve(__dirname,"..","..","logs","server.log");try{fs.writeFileSync(n+".temp","temp"),fs.unlinkSync(n+".temp")}catch(a){return r=a,void console.error("Log folder '"+n+"' is not writable")}o.streams=[{level:e.log["std-level"],stream:process.stdout},{level:e.log["file-level"],path:n}],i=bunyan.createLogger(o);for(l in i)t=i[l],exports[l]=t;return delete exports.init}catch(a){return r=a,console.error(r),delete exports.init}}};